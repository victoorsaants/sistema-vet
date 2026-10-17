import pytest
from fastapi import Depends
from fastapi.testclient import TestClient

from app.api.dependencias import exigir_perfis, obter_auth_service
from app.main import app
from app.schemas.auth import (
    CredenciaisLogin,
    PerfilUsuario,
    SessaoAutenticada,
    UsuarioLogado,
)
from app.services.excecoes import (
    CredenciaisInvalidas,
    ServicoIndisponivel,
    SessaoInvalida,
    UsuarioSemAcesso,
)

RECEPCIONISTA = UsuarioLogado(
    id="u-recepcao", email="mariana@example.com", nome="Mariana", perfil=PerfilUsuario.RECEPCAO
)
VETERINARIA = UsuarioLogado(
    id="u-vet", email="mayara@example.com", nome="Mayara", perfil=PerfilUsuario.VETERINARIO
)
TOKENS = {"token-recepcao": RECEPCIONISTA, "token-vet": VETERINARIA}


class AuthServiceFalso:
    def __init__(self) -> None:
        self.sessoes_encerradas: list[str] = []

    def autenticar(self, credenciais: CredenciaisLogin) -> SessaoAutenticada:
        if credenciais.email == "fora-do-ar@example.com":
            raise ServicoIndisponivel()
        if credenciais.email == "sem-perfil@example.com":
            raise UsuarioSemAcesso()
        if credenciais.senha != "senha-correta":
            raise CredenciaisInvalidas()
        return SessaoAutenticada(
            access_token="token-recepcao",
            refresh_token="refresh-1",
            expira_em=2_000_000_000,
            usuario=RECEPCIONISTA,
        )

    def renovar(self, refresh_token: str) -> SessaoAutenticada:
        if refresh_token != "refresh-1":
            raise SessaoInvalida()
        return SessaoAutenticada(
            access_token="token-recepcao",
            refresh_token="refresh-2",
            expira_em=2_000_000_100,
            usuario=RECEPCIONISTA,
        )

    def obter_usuario(self, access_token: str) -> UsuarioLogado:
        if access_token not in TOKENS:
            raise SessaoInvalida()
        return TOKENS[access_token]

    def encerrar(self, access_token: str) -> None:
        self.sessoes_encerradas.append(access_token)


@app.get("/teste/somente-veterinario")
def rota_somente_veterinario(
    usuario: UsuarioLogado = Depends(exigir_perfis(PerfilUsuario.VETERINARIO)),
) -> dict:
    return {"nome": usuario.nome}


@pytest.fixture
def auth_service() -> AuthServiceFalso:
    servico = AuthServiceFalso()
    app.dependency_overrides[obter_auth_service] = lambda: servico
    yield servico
    app.dependency_overrides.clear()


@pytest.fixture
def cliente(auth_service: AuthServiceFalso) -> TestClient:
    return TestClient(app)


def test_login_devolve_tokens_e_usuario(cliente: TestClient) -> None:
    resposta = cliente.post(
        "/api/v1/auth/login", json={"email": "mariana@example.com", "senha": "senha-correta"}
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["access_token"] == "token-recepcao"
    assert corpo["refresh_token"] == "refresh-1"
    assert corpo["usuario"] == {
        "id": "u-recepcao",
        "email": "mariana@example.com",
        "nome": "Mariana",
        "perfil": "recepcao",
    }


def test_login_com_senha_errada_responde_401(cliente: TestClient) -> None:
    resposta = cliente.post(
        "/api/v1/auth/login", json={"email": "mariana@example.com", "senha": "errada"}
    )

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "E-mail ou senha incorretos."


def test_login_de_usuario_sem_perfil_responde_403(cliente: TestClient) -> None:
    resposta = cliente.post(
        "/api/v1/auth/login", json={"email": "sem-perfil@example.com", "senha": "senha-correta"}
    )

    assert resposta.status_code == 403


def test_login_com_banco_fora_do_ar_responde_503(cliente: TestClient) -> None:
    resposta = cliente.post(
        "/api/v1/auth/login", json={"email": "fora-do-ar@example.com", "senha": "x"}
    )

    assert resposta.status_code == 503


def test_login_sem_senha_responde_422(cliente: TestClient) -> None:
    resposta = cliente.post("/api/v1/auth/login", json={"email": "mariana@example.com"})

    assert resposta.status_code == 422


def test_renovar_sessao_troca_refresh_token(cliente: TestClient) -> None:
    resposta = cliente.post("/api/v1/auth/renovar", json={"refresh_token": "refresh-1"})

    assert resposta.status_code == 200
    assert resposta.json()["refresh_token"] == "refresh-2"


def test_renovar_com_refresh_token_invalido_responde_401(cliente: TestClient) -> None:
    resposta = cliente.post("/api/v1/auth/renovar", json={"refresh_token": "vencido"})

    assert resposta.status_code == 401


def test_me_sem_token_responde_401(cliente: TestClient) -> None:
    resposta = cliente.get("/api/v1/auth/me")

    assert resposta.status_code == 401
    assert resposta.headers["www-authenticate"] == "Bearer"


def test_me_com_token_invalido_responde_401(cliente: TestClient) -> None:
    resposta = cliente.get("/api/v1/auth/me", headers={"Authorization": "Bearer qualquer"})

    assert resposta.status_code == 401


def test_me_devolve_usuario_do_token(cliente: TestClient) -> None:
    resposta = cliente.get("/api/v1/auth/me", headers={"Authorization": "Bearer token-vet"})

    assert resposta.status_code == 200
    assert resposta.json()["perfil"] == "veterinario"


def test_logout_encerra_a_sessao_do_token(
    cliente: TestClient, auth_service: AuthServiceFalso
) -> None:
    resposta = cliente.post(
        "/api/v1/auth/logout", headers={"Authorization": "Bearer token-recepcao"}
    )

    assert resposta.status_code == 204
    assert auth_service.sessoes_encerradas == ["token-recepcao"]


def test_rota_de_veterinario_bloqueia_recepcao(cliente: TestClient) -> None:
    resposta = cliente.get(
        "/teste/somente-veterinario", headers={"Authorization": "Bearer token-recepcao"}
    )

    assert resposta.status_code == 403


def test_rota_de_veterinario_libera_veterinario(cliente: TestClient) -> None:
    resposta = cliente.get(
        "/teste/somente-veterinario", headers={"Authorization": "Bearer token-vet"}
    )

    assert resposta.status_code == 200
    assert resposta.json() == {"nome": "Mayara"}
