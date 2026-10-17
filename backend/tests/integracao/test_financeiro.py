from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from psycopg import Connection

from app.repositories.financeiro_repository import FinanceiroRepository
from app.schemas.financeiro import LancamentoDados, LancamentoEntrada, Pagamento
from app.services.excecoes import DadosInvalidos
from app.services.financeiro_service import FinanceiroService

FUSO = ZoneInfo("America/Maceio")
AGORA = datetime(2030, 3, 10, 15, 30, tzinfo=FUSO)


@pytest.fixture
def cenario(conexao: Connection) -> dict:
    conexao.execute("delete from lancamentos")
    categorias = {
        (linha["tipo"], linha["nome"]): linha["id"]
        for linha in conexao.execute("select id, nome, tipo from categorias_financeiras").fetchall()
    }
    usuario_id = conexao.execute(
        "insert into auth.users (email, encrypted_password) values ('recepcao@teste.local', 'x') returning id"
    ).fetchone()["id"]
    conexao.execute("insert into perfis (id, nome, perfil) values (%s, 'Mariana', 'recepcao')", (usuario_id,))
    tutor_id = conexao.execute(
        """
        insert into tutores (nome, cpf, telefone_principal, endereco, cidade, estado, cep)
        values ('Carlos Eduardo Silva', '52998224725', '79988881234', 'Rua A', 'Aracaju', 'SE', '49037000')
        returning id
        """
    ).fetchone()["id"]
    return {
        "servico": FinanceiroService(FinanceiroRepository(conexao), FUSO),
        "categorias": categorias,
        "usuario_id": usuario_id,
        "tutor_id": tutor_id,
    }


def lancar(cenario: dict, tipo: str, categoria: str, valor: str, data: date, status: str = "pago", **extras):
    entrada = LancamentoEntrada(
        tipo=tipo,
        categoria_id=cenario["categorias"][(tipo, categoria)],
        descricao=f"{categoria} {valor}",
        valor=Decimal(valor),
        data_competencia=data,
        status=status,
        forma_pagamento="pix" if status == "pago" else None,
        **extras,
    )
    return cenario["servico"].criar(entrada, cenario["usuario_id"], AGORA)


def test_receita_paga_registra_pagamento_e_autor(cenario: dict) -> None:
    lancamento = lancar(cenario, "receita", "Consultas", "120.00", date(2030, 3, 10), tutor_id=cenario["tutor_id"])

    assert (lancamento.status, lancamento.valor, lancamento.forma_pagamento) == ("pago", 120.0, "pix")
    assert lancamento.pago_em == AGORA
    assert lancamento.tutor.nome == "Carlos Eduardo Silva"
    assert lancamento.registrado_por == "Mariana"


def test_pago_exige_forma_e_categoria_precisa_ser_do_tipo(cenario: dict) -> None:
    servico = cenario["servico"]
    base = {"descricao": "Teste", "valor": Decimal("10"), "data_competencia": date(2030, 3, 1)}

    with pytest.raises(DadosInvalidos) as sem_forma:
        servico.criar(
            LancamentoEntrada(tipo="receita", status="pago", categoria_id=cenario["categorias"][("receita", "Consultas")], **base),
            cenario["usuario_id"],
            AGORA,
        )
    with pytest.raises(DadosInvalidos) as categoria_errada:
        servico.criar(
            LancamentoEntrada(tipo="receita", categoria_id=cenario["categorias"][("despesa", "Aluguel e contas")], **base),
            cenario["usuario_id"],
            AGORA,
        )

    assert sem_forma.value.campos == {"forma_pagamento": "Informe a forma de pagamento."}
    assert categoria_errada.value.campos == {"categoria_id": "Selecione uma categoria de receita."}


def test_pendente_pode_ser_editado_pago_e_cancelado(cenario: dict) -> None:
    servico = cenario["servico"]
    pendente = lancar(cenario, "despesa", "Aluguel e contas", "1500.00", date(2030, 3, 5), status="pendente",
                      vencimento=date(2030, 3, 15))

    editado = servico.atualizar(
        pendente.id,
        LancamentoDados(
            categoria_id=cenario["categorias"][("despesa", "Aluguel e contas")],
            descricao="Aluguel de março",
            valor=Decimal("1600.00"),
            data_competencia=date(2030, 3, 5),
            vencimento=date(2030, 3, 15),
        ),
    )
    pago = servico.pagar(pendente.id, Pagamento(forma_pagamento="boleto"), AGORA)

    assert (editado.descricao, editado.valor) == ("Aluguel de março", 1600.0)
    assert (pago.status, pago.forma_pagamento, pago.pago_em) == ("pago", "boleto", AGORA)
    with pytest.raises(DadosInvalidos):
        servico.pagar(pendente.id, Pagamento(forma_pagamento="pix"), AGORA)
    with pytest.raises(DadosInvalidos):
        servico.atualizar(pendente.id, LancamentoDados(**{**editado.model_dump(), "categoria_id": editado.categoria.id}))
    assert servico.cancelar(pendente.id).status == "cancelado"


def test_resumo_do_mes_compara_com_o_anterior(cenario: dict) -> None:
    lancar(cenario, "receita", "Consultas", "100.00", date(2030, 2, 10))
    lancar(cenario, "despesa", "Materiais", "50.00", date(2030, 2, 11))
    lancar(cenario, "receita", "Consultas", "150.00", date(2030, 3, 2))
    lancar(cenario, "receita", "Exames", "50.00", date(2030, 3, 3))
    lancar(cenario, "despesa", "Medicamentos", "60.00", date(2030, 3, 4))
    lancar(cenario, "despesa", "Materiais", "20.00", date(2030, 3, 4))
    lancar(cenario, "receita", "Vacinas", "80.00", date(2030, 3, 6), status="pendente")
    cancelado = lancar(cenario, "despesa", "Materiais", "999.00", date(2030, 3, 7))
    cenario["servico"].cancelar(cancelado.id)

    resumo = cenario["servico"].resumo(date(2030, 3, 20))

    assert (resumo.mes, resumo.receitas, resumo.despesas, resumo.saldo) == (date(2030, 3, 1), 200.0, 80.0, 120.0)
    assert (resumo.a_receber, resumo.a_pagar, resumo.total_lancamentos) == (80.0, 0.0, 5)
    assert resumo.variacao.model_dump() == {"receitas": 100.0, "despesas": 60.0, "saldo": 140.0, "lancamentos": 150.0}
    assert [(m.mes.month, m.receitas, m.despesas) for m in resumo.fluxo[-2:]] == [(2, 100.0, 50.0), (3, 200.0, 80.0)]
    assert len(resumo.fluxo) == 6
    assert [(c.categoria, c.percentual) for c in resumo.despesas_por_categoria] == [("Medicamentos", 75.0), ("Materiais", 25.0)]
    assert len(resumo.ultimos_lancamentos) == 5


def test_extrato_filtra_e_soma_e_relatorio_sai_em_csv(cenario: dict) -> None:
    servico = cenario["servico"]
    lancar(cenario, "receita", "Consultas", "1234.50", date(2030, 3, 2), tutor_id=cenario["tutor_id"])
    lancar(cenario, "despesa", "Materiais", "34.50", date(2030, 3, 3))
    lancar(cenario, "receita", "Exames", "10.00", date(2030, 4, 1))
    filtros = {"de": date(2030, 3, 1), "ate": date(2030, 3, 31)}

    extrato = servico.listar(filtros, 1, 20)
    por_tutor = servico.listar({"busca": "carlos"}, 1, 20)
    relatorio = servico.relatorio_csv(filtros)

    assert (extrato.total, extrato.total_receitas, extrato.total_despesas) == (2, 1234.5, 34.5)
    assert [item.descricao for item in por_tutor.itens] == ["Consultas 1234.50"]
    linhas = relatorio.lstrip("﻿").splitlines()
    assert linhas[0].startswith("Data;Tipo;Categoria;Descrição")
    assert linhas[1].startswith("02/03/2030;Receita;Consultas;Consultas 1234.50;Carlos Eduardo Silva;1.234,50;Pix;Recebido")
    assert len(linhas) == 3
