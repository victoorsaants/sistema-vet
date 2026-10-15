from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.dependencias import obter_financeiro_service, obter_notificacao_service, obter_usuario_atual
from app.main import app
from app.schemas.auth import PerfilUsuario, UsuarioLogado

RECEPCIONISTA = UsuarioLogado(id="u1", email=None, nome="Mariana", perfil=PerfilUsuario.RECEPCAO)
VETERINARIA = UsuarioLogado(id="u2", email=None, nome="Mayara", perfil=PerfilUsuario.VETERINARIO)
CATEGORIA_ID = "50000000-0000-4000-8000-000000000001"
LANCAMENTO_ID = "80000000-0000-4000-8000-000000000001"


@pytest.fixture
def servicos() -> tuple[MagicMock, MagicMock]:
    financeiro_service, notificacao_service = MagicMock(), MagicMock()
    app.dependency_overrides[obter_financeiro_service] = lambda: financeiro_service
    app.dependency_overrides[obter_notificacao_service] = lambda: notificacao_service
    yield financeiro_service, notificacao_service
    app.dependency_overrides.clear()


def entrar_como(usuario: UsuarioLogado) -> TestClient:
    app.dependency_overrides[obter_usuario_atual] = lambda: usuario
    return TestClient(app)


def test_financeiro_e_exclusivo_da_recepcao(servicos: tuple[MagicMock, MagicMock]) -> None:
    cliente = entrar_como(VETERINARIA)

    respostas = [
        cliente.get("/api/v1/financeiro/resumo"),
        cliente.get("/api/v1/financeiro/lancamentos"),
        cliente.post(f"/api/v1/financeiro/lancamentos/{LANCAMENTO_ID}/cancelar"),
    ]

    assert [resposta.status_code for resposta in respostas] == [403, 403, 403]


def test_valor_com_tres_casas_e_recusado_em_portugues(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(RECEPCIONISTA).post(
        "/api/v1/financeiro/lancamentos",
        json={
            "tipo": "receita",
            "categoria_id": CATEGORIA_ID,
            "descricao": "Consulta",
            "valor": "10.555",
            "data_competencia": "2030-03-10",
        },
    )

    assert resposta.status_code == 422
    assert resposta.json()["campos"] == {"valor": "Use no máximo duas casas decimais."}


def test_relatorio_e_baixado_como_csv(servicos: tuple[MagicMock, MagicMock]) -> None:
    financeiro_service, _ = servicos
    financeiro_service.relatorio_csv.return_value = "﻿Data;Tipo\r\n"

    resposta = entrar_como(RECEPCIONISTA).get("/api/v1/financeiro/relatorio?de=2030-03-01&ate=2030-03-31&tipo=despesa")

    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "text/csv; charset=utf-8"
    assert 'filename="relatorio-financeiro-2030-03-01-2030-03-31.csv"' in resposta.headers["content-disposition"]
    filtros = financeiro_service.relatorio_csv.call_args.args[0]
    assert (filtros["tipo"], str(filtros["de"])) == ("despesa", "2030-03-01")


def test_veterinario_ve_notificacoes_mas_nao_dispara_envio(servicos: tuple[MagicMock, MagicMock]) -> None:
    _, notificacao_service = servicos
    notificacao_service.listar.return_value = {"itens": [], "total": 0, "pagina": 1, "tamanho": 20}
    cliente = entrar_como(VETERINARIA)

    assert cliente.get(f"/api/v1/notificacoes?atendimento_id={LANCAMENTO_ID}").status_code == 200
    assert cliente.post("/api/v1/notificacoes/enviar").status_code == 403
    assert cliente.get("/api/v1/notificacoes/resumo").status_code == 403
