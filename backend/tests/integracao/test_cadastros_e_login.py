import pytest
from psycopg import Connection

from app.repositories.animal_repository import AnimalRepository
from app.repositories.sessao_repository import SessaoRepository
from app.repositories.tutor_repository import TutorRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.animal import AnimalEntrada
from app.schemas.auth import CredenciaisLogin
from app.schemas.tutor import TutorEntrada
from app.services.animal_service import AnimalService
from app.services.auth_service import AuthService, ConfiguracaoTokens, gerar_hash_senha
from app.services.excecoes import ConflitoDados, SessaoInvalida
from app.services.tutor_service import TutorService

CONFIGURACAO = ConfiguracaoTokens(segredo="segredo-de-teste-com-tamanho-suficiente", minutos_access=60, dias_refresh=30)


def novo_tutor(nome: str, cpf: str, telefone: str = "79988881234") -> TutorEntrada:
    return TutorEntrada(
        nome=nome,
        cpf=cpf,
        telefone_principal=telefone,
        endereco="Rua das Palmeiras, 123",
        cidade="Aracaju",
        estado="SE",
        cep="49037000",
    )


def novo_animal(tutor_id: str, nome: str, microchip: str | None = None) -> AnimalEntrada:
    return AnimalEntrada(tutor_id=tutor_id, nome=nome, especie="Cão", peso_kg=10, microchip=microchip)


def test_cadastro_e_busca_de_tutores(conexao: Connection) -> None:
    servico = TutorService(TutorRepository(conexao))
    carlos = servico.criar(novo_tutor("Carlos Eduardo Silva", "529.982.247-25"))
    servico.criar(novo_tutor("Juliana Ferreira", "111.444.777-35", telefone="79976543210"))
    AnimalService(AnimalRepository(conexao), TutorRepository(conexao)).criar(novo_animal(carlos.id, "Thor"))

    def nomes(busca: str) -> list[str]:
        return [tutor.nome for tutor in servico.listar(busca, 1, 20).itens]

    assert nomes("") == ["Carlos Eduardo Silva", "Juliana Ferreira"]
    assert nomes("julia") == ["Juliana Ferreira"]
    assert nomes("529.982") == ["Carlos Eduardo Silva"]
    assert nomes("97654") == ["Juliana Ferreira"]
    assert nomes("%") == []
    assert servico.listar("carlos", 1, 20).itens[0].total_animais == 1


def test_paginacao_informa_total_mesmo_fora_do_intervalo(conexao: Connection) -> None:
    servico = TutorService(TutorRepository(conexao))
    servico.criar(novo_tutor("Carlos Eduardo Silva", "529.982.247-25"))

    pagina = servico.listar(None, pagina=5, tamanho=10)

    assert pagina.itens == []
    assert pagina.total == 1


def test_cpf_repetido_gera_conflito(conexao: Connection) -> None:
    servico = TutorService(TutorRepository(conexao))
    servico.criar(novo_tutor("Carlos Eduardo Silva", "529.982.247-25"))

    with pytest.raises(ConflitoDados, match="CPF"), conexao.transaction():
        servico.criar(novo_tutor("Outro Carlos", "52998224725"))


def test_animais_busca_por_tutor_e_microchip(conexao: Connection) -> None:
    tutores = TutorService(TutorRepository(conexao))
    animais = AnimalService(AnimalRepository(conexao), TutorRepository(conexao))
    carlos = tutores.criar(novo_tutor("Carlos Eduardo Silva", "529.982.247-25"))
    juliana = tutores.criar(novo_tutor("Juliana Ferreira", "111.444.777-35"))
    thor = animais.criar(novo_animal(carlos.id, "Thor", microchip="985.321.654.987"))
    animais.criar(novo_animal(juliana.id, "Mel"))

    def nomes(busca: str) -> list[str]:
        return [animal.nome for animal in animais.listar(busca, None, 1, 20).itens]

    assert nomes("juliana") == ["Mel"]
    assert nomes("321.654") == ["Thor"]
    assert [a.nome for a in animais.listar(None, juliana.id, 1, 20).itens] == ["Mel"]
    assert thor.tutor.nome == "Carlos Eduardo Silva"
    assert thor.peso_kg == 10


def test_microchip_repetido_gera_conflito(conexao: Connection) -> None:
    tutores = TutorService(TutorRepository(conexao))
    animais = AnimalService(AnimalRepository(conexao), TutorRepository(conexao))
    carlos = tutores.criar(novo_tutor("Carlos Eduardo Silva", "529.982.247-25"))
    animais.criar(novo_animal(carlos.id, "Thor", microchip="985321654987"))

    with pytest.raises(ConflitoDados, match="microchip"), conexao.transaction():
        animais.criar(novo_animal(carlos.id, "Rex", microchip="985-321-654-987"))


def test_login_renovacao_e_logout_no_banco(conexao: Connection) -> None:
    usuario_id = conexao.execute(
        "insert into auth.users (email, encrypted_password) values ('mariana@example.com', %s) returning id",
        (gerar_hash_senha("segredo123"),),
    ).fetchone()["id"]
    conexao.execute("insert into perfis (id, nome, perfil) values (%s, 'Mariana', 'recepcao')", (usuario_id,))
    servico = AuthService(UsuarioRepository(conexao), SessaoRepository(conexao), CONFIGURACAO)

    sessao = servico.autenticar(CredenciaisLogin(email="MARIANA@example.com", senha="segredo123"))
    renovada = servico.renovar(sessao.refresh_token)
    servico.encerrar(renovada.access_token)

    assert sessao.usuario.id == usuario_id
    with pytest.raises(SessaoInvalida):
        servico.obter_usuario(renovada.access_token)
