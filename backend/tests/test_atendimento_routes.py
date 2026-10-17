from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.dependencias import obter_anexo_service, obter_atendimento_service, obter_usuario_atual
from app.main import app
from app.schemas.auth import PerfilUsuario, UsuarioLogado

RECEPCIONISTA = UsuarioLogado(id="u1", email=None, nome="Mariana", perfil=PerfilUsuario.RECEPCAO)
VETERINARIA = UsuarioLogado(id="u2", email=None, nome="Mayara", perfil=PerfilUsuario.VETERINARIO)
ATENDIMENTO_ID = "40000000-0000-4000-8000-000000000001"
ANEXO_ID = "70000000-0000-4000-8000-000000000001"


@pytest.fixture
def servicos() -> tuple[MagicMock, MagicMock]:
    atendimento_service, anexo_service = MagicMock(), MagicMock()
    app.dependency_overrides[obter_atendimento_service] = lambda: atendimento_service
    app.dependency_overrides[obter_anexo_service] = lambda: anexo_service
    yield atendimento_service, anexo_service
    app.dependency_overrides.clear()


def entrar_como(usuario: UsuarioLogado) -> TestClient:
    app.dependency_overrides[obter_usuario_atual] = lambda: usuario
    return TestClient(app)


def test_recepcao_nao_registra_atendimento(servicos: tuple[MagicMock, MagicMock]) -> None:
    cliente = entrar_como(RECEPCIONISTA)

    respostas = [
        cliente.post("/api/v1/atendimentos", json={"agendamento_id": ATENDIMENTO_ID}),
        cliente.put(f"/api/v1/atendimentos/{ATENDIMENTO_ID}", json={}),
        cliente.post(f"/api/v1/atendimentos/{ATENDIMENTO_ID}/finalizar"),
        cliente.post(f"/api/v1/atendimentos/{ATENDIMENTO_ID}/anexos", files={"arquivo": ("a.pdf", b"%PDF-")}),
    ]

    assert [resposta.status_code for resposta in respostas] == [403, 403, 403, 403]


def test_recepcao_lista_todos_mesmo_pedindo_meus(servicos: tuple[MagicMock, MagicMock]) -> None:
    atendimento_service, _ = servicos
    atendimento_service.listar.return_value = []

    entrar_como(RECEPCIONISTA).get("/api/v1/atendimentos?meus=true&status=em_andamento")

    atendimento_service.listar.assert_called_once_with(None, "em_andamento", RECEPCIONISTA, False)


def test_upload_repassa_nome_e_conteudo(servicos: tuple[MagicMock, MagicMock]) -> None:
    _, anexo_service = servicos
    anexo_service.enviar.return_value = {
        "id": ANEXO_ID,
        "nome_arquivo": "Hemograma.pdf",
        "tipo_mime": "application/pdf",
        "tamanho_bytes": 5,
        "exame_id": None,
        "criado_em": "2030-01-07T12:00:00Z",
    }

    resposta = entrar_como(VETERINARIA).post(
        f"/api/v1/atendimentos/{ATENDIMENTO_ID}/anexos",
        files={"arquivo": ("Hemograma.pdf", b"%PDF-", "application/pdf")},
    )

    assert resposta.status_code == 201
    anexo_service.enviar.assert_called_once_with(ATENDIMENTO_ID, VETERINARIA, "Hemograma.pdf", b"%PDF-", None)


def test_download_abre_o_arquivo_no_navegador(servicos: tuple[MagicMock, MagicMock], tmp_path: Path) -> None:
    _, anexo_service = servicos
    arquivo = tmp_path / "x.pdf"
    arquivo.write_bytes(b"%PDF-1.7")
    anexo_service.abrir.return_value = (arquivo, "Hemograma.pdf", "application/pdf")

    resposta = entrar_como(RECEPCIONISTA).get(f"/api/v1/anexos/{ANEXO_ID}/arquivo")

    assert resposta.status_code == 200
    assert resposta.content == b"%PDF-1.7"
    assert resposta.headers["content-type"] == "application/pdf"
    assert resposta.headers["content-disposition"].startswith("inline")


def test_historico_rejeita_tipo_desconhecido(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(RECEPCIONISTA).get(f"/api/v1/animais/{ATENDIMENTO_ID}/historico?tipo=cirurgia")

    assert resposta.status_code == 422
