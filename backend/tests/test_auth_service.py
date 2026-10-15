from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.schemas.auth import CredenciaisLogin, PerfilUsuario
from app.services.auth_service import (
    AuthService,
    ConfiguracaoTokens,
    gerar_hash_senha,
    hash_refresh_token,
)
from app.services.excecoes import CredenciaisInvalidas, SessaoInvalida, UsuarioSemAcesso

SEGREDO = "segredo-de-teste-com-tamanho-suficiente"
CONFIGURACAO = ConfiguracaoTokens(segredo=SEGREDO, minutos_access=60, dias_refresh=30)
HASH_SENHA = gerar_hash_senha("segredo123")
USUARIO = {
    "id": "u-1",
    "email": "mariana@example.com",
    "nome": "Mariana",
    "perfil": "recepcao",
    "ativo": True,
    "encrypted_password": HASH_SENHA,
}


class UsuariosEmMemoria:
    def __init__(self, usuarios: list[dict]) -> None:
        self._usuarios = {usuario["id"]: usuario for usuario in usuarios}

    def buscar_credenciais(self, email: str) -> dict | None:
        return next((u for u in self._usuarios.values() if u["email"] == email.lower()), None)

    def buscar_por_id(self, usuario_id: str) -> dict | None:
        return self._usuarios.get(usuario_id)


class SessoesEmMemoria:
    def __init__(self) -> None:
        self.sessoes: dict[str, dict] = {}

    def criar(self, usuario_id: str, refresh_token_hash: str, expira_em: datetime) -> str:
        sessao_id = f"s-{len(self.sessoes) + 1}"
        self.sessoes[sessao_id] = {
            "id": sessao_id,
            "usuario_id": usuario_id,
            "hash": refresh_token_hash,
            "expira_em": expira_em,
            "encerrada": False,
        }
        return sessao_id

    def buscar_ativa_por_refresh(self, refresh_token_hash: str) -> dict | None:
        return next(
            (s for s in self.sessoes.values() if s["hash"] == refresh_token_hash and self._ativa(s)),
            None,
        )

    def renovar(self, sessao_id: str, refresh_token_hash: str, expira_em: datetime) -> None:
        self.sessoes[sessao_id].update(hash=refresh_token_hash, expira_em=expira_em)

    def esta_ativa(self, sessao_id: str) -> bool:
        return sessao_id in self.sessoes and self._ativa(self.sessoes[sessao_id])

    def encerrar(self, sessao_id: str) -> None:
        self.sessoes[sessao_id]["encerrada"] = True

    def _ativa(self, sessao: dict) -> bool:
        return not sessao["encerrada"] and sessao["expira_em"] > datetime.now(timezone.utc)


def criar_servico(usuarios: list[dict] | None = None) -> tuple[AuthService, SessoesEmMemoria]:
    sessoes = SessoesEmMemoria()
    return AuthService(UsuariosEmMemoria(usuarios or [USUARIO]), sessoes, CONFIGURACAO), sessoes


def entrar(servico: AuthService, senha: str = "segredo123"):
    return servico.autenticar(CredenciaisLogin(email=" Mariana@example.com ", senha=senha))


def test_login_gera_tokens_e_sessao() -> None:
    servico, sessoes = criar_servico()

    sessao = entrar(servico)

    conteudo = jwt.decode(sessao.access_token, SEGREDO, algorithms=["HS256"])
    assert conteudo["sub"] == "u-1"
    assert conteudo["perfil"] == "recepcao"
    assert sessoes.sessoes[conteudo["sid"]]["hash"] == hash_refresh_token(sessao.refresh_token)
    assert sessao.usuario.perfil is PerfilUsuario.RECEPCAO


def test_senha_errada_gera_credenciais_invalidas() -> None:
    servico, sessoes = criar_servico()

    with pytest.raises(CredenciaisInvalidas):
        entrar(servico, senha="errada")
    assert sessoes.sessoes == {}


def test_email_inexistente_gera_credenciais_invalidas() -> None:
    servico, _ = criar_servico()

    with pytest.raises(CredenciaisInvalidas):
        servico.autenticar(CredenciaisLogin(email="ninguem@example.com", senha="segredo123"))


@pytest.mark.parametrize("ajuste", [{"perfil": None, "nome": None, "ativo": None}, {"ativo": False}])
def test_usuario_sem_perfil_ativo_nao_entra(ajuste: dict) -> None:
    servico, _ = criar_servico([{**USUARIO, **ajuste}])

    with pytest.raises(UsuarioSemAcesso):
        entrar(servico)


def test_obter_usuario_pelo_access_token() -> None:
    servico, _ = criar_servico()
    sessao = entrar(servico)

    assert servico.obter_usuario(sessao.access_token).nome == "Mariana"


@pytest.mark.parametrize(
    "token",
    [
        "nao-e-um-jwt",
        jwt.encode({"sub": "u-1", "sid": "s-1", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "outro-segredo", algorithm="HS256"),
        jwt.encode({"sub": "u-1", "sid": "s-1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}, SEGREDO, algorithm="HS256"),
    ],
    ids=["mal-formado", "assinatura-errada", "expirado"],
)
def test_token_invalido_gera_sessao_invalida(token: str) -> None:
    servico, _ = criar_servico()
    entrar(servico)

    with pytest.raises(SessaoInvalida):
        servico.obter_usuario(token)


def test_renovar_troca_o_refresh_token_e_invalida_o_antigo() -> None:
    servico, _ = criar_servico()
    primeira = entrar(servico)

    segunda = servico.renovar(primeira.refresh_token)

    assert segunda.refresh_token != primeira.refresh_token
    with pytest.raises(SessaoInvalida):
        servico.renovar(primeira.refresh_token)


def test_logout_invalida_access_e_refresh() -> None:
    servico, _ = criar_servico()
    sessao = entrar(servico)

    servico.encerrar(sessao.access_token)

    with pytest.raises(SessaoInvalida):
        servico.obter_usuario(sessao.access_token)
    with pytest.raises(SessaoInvalida):
        servico.renovar(sessao.refresh_token)


def test_logout_com_token_invalido_nao_falha() -> None:
    servico, _ = criar_servico()

    servico.encerrar("lixo")
