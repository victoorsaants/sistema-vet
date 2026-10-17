from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.dependencias import obter_expediente_service, obter_usuario_atual, obter_veterinario_service
from app.main import app
from app.schemas.auth import PerfilUsuario, UsuarioLogado

RECEPCIONISTA = UsuarioLogado(id="u1", email=None, nome="Mariana", perfil=PerfilUsuario.RECEPCAO)
VETERINARIA = UsuarioLogado(id="u2", email=None, nome="Mayara", perfil=PerfilUsuario.VETERINARIO)
VETERINARIO_ID = "10000000-0000-4000-8000-000000000001"


@pytest.fixture
def servicos() -> tuple[MagicMock, MagicMock]:
    veterinario_service, expediente_service = MagicMock(), MagicMock()
    app.dependency_overrides[obter_veterinario_service] = lambda: veterinario_service
    app.dependency_overrides[obter_expediente_service] = lambda: expediente_service
    yield veterinario_service, expediente_service
    app.dependency_overrides.clear()


def entrar_como(usuario: UsuarioLogado) -> TestClient:
    app.dependency_overrides[obter_usuario_atual] = lambda: usuario
    return TestClient(app)


def test_so_a_recepcao_gerencia_veterinarios(servicos: tuple[MagicMock, MagicMock]) -> None:
    _, expediente_service = servicos
    expediente_service.listar_veterinarios.return_value = []
    cliente = entrar_como(VETERINARIA)

    respostas = [
        cliente.get("/api/v1/veterinarios/cadastros"),
        cliente.post("/api/v1/veterinarios", json={"nome": "Dr. Paulo", "crmv": "CRMV-SE 2"}),
        cliente.put(f"/api/v1/veterinarios/{VETERINARIO_ID}/acesso", json={"email_login": "a@b.com"}),
    ]

    assert [resposta.status_code for resposta in respostas] == [403, 403, 403]
    assert cliente.get("/api/v1/veterinarios").status_code == 200


def test_senha_curta_e_recusada_com_mensagem_clara(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(RECEPCIONISTA).post(
        "/api/v1/veterinarios",
        json={"nome": "Dr. Paulo", "crmv": "CRMV-SE 2", "email_login": "paulo@clinica.com", "senha_login": "123"},
    )

    assert resposta.status_code == 422
    assert resposta.json()["campos"] == {"senha_login": "A senha precisa ter pelo menos 8 caracteres."}
