from datetime import datetime, timedelta, timezone

import pytest
from psycopg import Connection

from app.repositories.sessao_repository import SessaoRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.veterinario_repository import CadastroVeterinarioRepository
from app.schemas.auth import CredenciaisLogin
from app.schemas.veterinario import AcessoEntrada, AlteracaoVeterinario, NovoVeterinario
from app.services.auth_service import AuthService, ConfiguracaoTokens
from app.services.excecoes import ConflitoDados, DadosInvalidos, SessaoInvalida, UsuarioSemAcesso
from app.services.veterinario_service import VeterinarioService

AGORA = datetime(2030, 1, 7, 12, tzinfo=timezone.utc)
SENHA = "senha-segura"


@pytest.fixture
def servicos(conexao: Connection) -> dict:
    usuarios, sessoes = UsuarioRepository(conexao), SessaoRepository(conexao)
    return {
        "conexao": conexao,
        "veterinarios": VeterinarioService(CadastroVeterinarioRepository(conexao), usuarios, sessoes),
        "auth": AuthService(usuarios, sessoes, ConfiguracaoTokens(segredo="teste" * 8, minutos_access=5, dias_refresh=1)),
    }


def novo(**extras) -> NovoVeterinario:
    return NovoVeterinario(nome="Dr. Paulo Henrique", crmv="crmv-se  0002", especialidade="Dermatologia", **extras)


def alteracao(cadastro, **extras) -> AlteracaoVeterinario:
    dados = cadastro.model_dump(include={"nome", "crmv", "especialidade", "telefone", "email", "ativo"})
    return AlteracaoVeterinario(**{**dados, **extras})


def test_cadastro_com_acesso_permite_login_de_veterinario(servicos: dict) -> None:
    cadastro = servicos["veterinarios"].cadastrar(
        novo(telefone="(79) 99999-0000", email_login="Paulo@Clinica.com", senha_login=SENHA), AGORA
    )

    sessao = servicos["auth"].autenticar(CredenciaisLogin(email="paulo@clinica.com", senha=SENHA))

    assert (cadastro.crmv, cadastro.telefone) == ("CRMV-SE 0002", "79999990000")
    assert cadastro.acesso.model_dump() == {"email": "paulo@clinica.com", "ativo": True}
    assert (sessao.usuario.nome, sessao.usuario.perfil.value) == ("Dr. Paulo Henrique", "veterinario")


def test_cadastro_sem_acesso_e_acesso_criado_depois(servicos: dict) -> None:
    servico = servicos["veterinarios"]
    cadastro = servico.cadastrar(novo(), AGORA)

    with pytest.raises(DadosInvalidos) as sem_senha:
        servico.definir_acesso(cadastro.id, AcessoEntrada(email_login="paulo@clinica.com"), AGORA)
    com_acesso = servico.definir_acesso(cadastro.id, AcessoEntrada(email_login="paulo@clinica.com", senha_login=SENHA), AGORA)

    assert cadastro.acesso is None
    assert sem_senha.value.campos == {"senha_login": "Defina a senha de acesso."}
    assert com_acesso.acesso.email == "paulo@clinica.com"
    assert servicos["auth"].autenticar(CredenciaisLogin(email="paulo@clinica.com", senha=SENHA))


def test_crmv_e_email_de_acesso_nao_se_repetem(servicos: dict) -> None:
    servico = servicos["veterinarios"]
    servico.cadastrar(novo(email_login="paulo@clinica.com", senha_login=SENHA), AGORA)
    conexao = servicos["conexao"]

    with pytest.raises(ConflitoDados, match="CRMV"), conexao.transaction():
        servico.cadastrar(novo(), AGORA)
    with pytest.raises(ConflitoDados, match="e-mail"), conexao.transaction():
        servico.cadastrar(
            NovoVeterinario(nome="Outra", crmv="CRMV-SE 9", email_login="paulo@clinica.com", senha_login=SENHA), AGORA
        )


def test_trocar_senha_encerra_sessoes_e_vale_a_nova(servicos: dict) -> None:
    servico, auth = servicos["veterinarios"], servicos["auth"]
    cadastro = servico.cadastrar(novo(email_login="paulo@clinica.com", senha_login=SENHA), AGORA)
    sessao = auth.autenticar(CredenciaisLogin(email="paulo@clinica.com", senha=SENHA))

    servico.definir_acesso(cadastro.id, AcessoEntrada(email_login="paulo.h@clinica.com", senha_login="nova-senha-1"), AGORA)

    with pytest.raises(SessaoInvalida):
        auth.renovar(sessao.refresh_token)
    assert auth.autenticar(CredenciaisLogin(email="paulo.h@clinica.com", senha="nova-senha-1"))


def test_desativar_bloqueia_login_mas_nao_com_agendamentos_futuros(servicos: dict) -> None:
    servico, auth, conexao = servicos["veterinarios"], servicos["auth"], servicos["conexao"]
    cadastro = servico.cadastrar(novo(email_login="paulo@clinica.com", senha_login=SENHA), AGORA)
    tutor_id = conexao.execute(
        "insert into tutores (nome, telefone_principal) values ('Carlos', '79988881234') returning id"
    ).fetchone()["id"]
    animal_id = conexao.execute(
        "insert into animais (tutor_id, nome, especie) values (%s, 'Thor', 'Cão') returning id", (tutor_id,)
    ).fetchone()["id"]
    agendamento_id = conexao.execute(
        "insert into agendamentos (animal_id, veterinario_id, tipo, inicio, fim) values (%s, %s, 'consulta', %s, %s) returning id",
        (animal_id, cadastro.id, AGORA + timedelta(days=1), AGORA + timedelta(days=1, minutes=30)),
    ).fetchone()["id"]

    with pytest.raises(DadosInvalidos) as bloqueado:
        servico.atualizar(cadastro.id, alteracao(cadastro, ativo=False), AGORA)
    conexao.execute("update agendamentos set status = 'cancelado' where id = %s", (agendamento_id,))
    inativo = servico.atualizar(cadastro.id, alteracao(cadastro, ativo=False, nome="Dr. Paulo H."), AGORA)

    assert "1 agendamento(s) futuro(s)" in bloqueado.value.campos["ativo"]
    assert (inativo.ativo, inativo.nome, inativo.acesso.ativo) == (False, "Dr. Paulo H.", False)
    with pytest.raises(UsuarioSemAcesso):
        auth.autenticar(CredenciaisLogin(email="paulo@clinica.com", senha=SENHA))

    reativado = servico.atualizar(cadastro.id, alteracao(inativo, ativo=True), AGORA)

    assert reativado.acesso.ativo is True
    assert auth.autenticar(CredenciaisLogin(email="paulo@clinica.com", senha=SENHA)).usuario.nome == "Dr. Paulo H."
