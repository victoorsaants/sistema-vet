from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.dependencias import obter_agendamento_service, obter_agora, obter_usuario_atual
from app.main import app
from app.schemas.auth import PerfilUsuario, UsuarioLogado

RECEPCIONISTA = UsuarioLogado(id="u1", email=None, nome="Mariana", perfil=PerfilUsuario.RECEPCAO)
VETERINARIA = UsuarioLogado(id="u2", email=None, nome="Mayara", perfil=PerfilUsuario.VETERINARIO)
AGORA = datetime(2030, 1, 1, 12, tzinfo=timezone.utc)
VETERINARIO_ID = "10000000-0000-4000-8000-000000000001"


@pytest.fixture
def servico() -> MagicMock:
    agendamento_service = MagicMock()
    agendamento_service.listar.return_value = []
    app.dependency_overrides[obter_agendamento_service] = lambda: agendamento_service
    app.dependency_overrides[obter_agora] = lambda: AGORA
    yield agendamento_service
    app.dependency_overrides.clear()


def entrar_como(usuario: UsuarioLogado) -> TestClient:
    app.dependency_overrides[obter_usuario_atual] = lambda: usuario
    return TestClient(app)


def test_recepcao_lista_a_partir_de_agora_com_filtros(servico: MagicMock) -> None:
    resposta = entrar_como(RECEPCIONISTA).get(
        f"/api/v1/agendamentos?veterinario_id={VETERINARIO_ID}&status=agendado&status=confirmado"
    )

    assert resposta.status_code == 200
    servico.listar.assert_called_once_with(AGORA, None, VETERINARIO_ID, ["agendado", "confirmado"])


def test_veterinaria_so_ve_a_propria_agenda(servico: MagicMock) -> None:
    servico.veterinario_do_usuario.return_value = VETERINARIO_ID

    entrar_como(VETERINARIA).get("/api/v1/agendamentos?veterinario_id=20000000-0000-4000-8000-000000000009")

    servico.veterinario_do_usuario.assert_called_once_with("u2")
    assert servico.listar.call_args.args[2] == VETERINARIO_ID


def test_veterinaria_sem_cadastro_de_veterinario_ve_lista_vazia(servico: MagicMock) -> None:
    servico.veterinario_do_usuario.return_value = None

    resposta = entrar_como(VETERINARIA).get("/api/v1/agendamentos")

    assert resposta.json() == []
    servico.listar.assert_not_called()


def test_veterinaria_nao_agenda_nem_muda_status(servico: MagicMock) -> None:
    cliente = entrar_como(VETERINARIA)

    criar = cliente.post("/api/v1/agendamentos", json={})
    mudar = cliente.patch(f"/api/v1/agendamentos/{VETERINARIO_ID}/status", json={"status": "cancelado"})

    assert (criar.status_code, mudar.status_code) == (403, 403)


def test_agendamento_sem_fuso_horario_e_recusado(servico: MagicMock) -> None:
    resposta = entrar_como(RECEPCIONISTA).post(
        "/api/v1/agendamentos",
        json={
            "animal_id": VETERINARIO_ID,
            "veterinario_id": VETERINARIO_ID,
            "tipo": "consulta",
            "inicio": "2030-01-07T08:00:00",
        },
    )

    assert resposta.status_code == 422
    assert resposta.json()["campos"] == {"inicio": "Informe o horário com fuso horário."}
