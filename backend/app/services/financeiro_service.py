import csv
import io
from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.repositories.financeiro_repository import FinanceiroRepository
from app.schemas.financeiro import (
    CategoriaSaida,
    ExtratoLancamentos,
    FluxoMensal,
    LancamentoDados,
    LancamentoEntrada,
    LancamentoSaida,
    Pagamento,
    ResumoFinanceiro,
    TotalCategoria,
    Variacao,
)
from app.services.excecoes import DadosInvalidos, RecursoNaoEncontrado

LANCAMENTO_NAO_ENCONTRADO = "Lançamento não encontrado."
MESES_NO_FLUXO = 6
QUANTIDADE_ULTIMOS = 5
LIMITE_RELATORIO = 5000

NOMES_FORMA_PAGAMENTO = {
    "dinheiro": "Dinheiro",
    "pix": "Pix",
    "cartao_credito": "Cartão de crédito",
    "cartao_debito": "Cartão de débito",
    "transferencia": "Transferência",
    "boleto": "Boleto",
}

COLUNAS_RELATORIO = [
    "Data",
    "Tipo",
    "Categoria",
    "Descrição",
    "Tutor",
    "Valor (R$)",
    "Forma de pagamento",
    "Situação",
    "Vencimento",
    "Pago em",
]


def somar_meses(data: date, meses: int) -> date:
    indice = data.year * 12 + data.month - 1 + meses
    return date(indice // 12, indice % 12 + 1, 1)


def calcular_variacao(atual: float, anterior: float) -> float | None:
    if anterior == 0:
        return None
    return round((atual - anterior) / abs(anterior) * 100, 1)


def nome_situacao(tipo: str, status: str) -> str:
    if status == "pago":
        return "Recebido" if tipo == "receita" else "Pago"
    return {"pendente": "Pendente", "cancelado": "Cancelado"}[status]


def formatar_valor(valor: float) -> str:
    return f"{valor:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


class FinanceiroService:
    def __init__(self, financeiro_repository: FinanceiroRepository, fuso: ZoneInfo) -> None:
        self._financeiro_repository = financeiro_repository
        self._fuso = fuso

    def listar_categorias(self, tipo: str | None) -> list[CategoriaSaida]:
        return [CategoriaSaida(**linha) for linha in self._financeiro_repository.listar_categorias(tipo)]

    def criar(self, entrada: LancamentoEntrada, usuario_id: str, agora: datetime) -> LancamentoSaida:
        dados = self._validar(entrada, entrada.tipo)
        if entrada.status == "pago":
            self._exigir_forma_pagamento(entrada.forma_pagamento)
            dados["pago_em"] = agora
        lancamento_id = self._financeiro_repository.criar(
            {**dados, "tipo": entrada.tipo, "status": entrada.status, "registrado_por": usuario_id}
        )
        return self.obter(lancamento_id)

    def obter(self, lancamento_id: str) -> LancamentoSaida:
        linha = self._financeiro_repository.buscar(lancamento_id)
        if linha is None:
            raise RecursoNaoEncontrado(LANCAMENTO_NAO_ENCONTRADO)
        return LancamentoSaida(**linha)

    def atualizar(self, lancamento_id: str, entrada: LancamentoDados) -> LancamentoSaida:
        atual = self._para_alteracao(lancamento_id)
        if atual["status"] != "pendente":
            raise DadosInvalidos({"status": "Só é possível editar lançamentos pendentes."})
        self._financeiro_repository.atualizar(lancamento_id, self._validar(entrada, atual["tipo"]))
        return self.obter(lancamento_id)

    def pagar(self, lancamento_id: str, pagamento: Pagamento, agora: datetime) -> LancamentoSaida:
        atual = self._para_alteracao(lancamento_id)
        if atual["status"] != "pendente":
            raise DadosInvalidos({"status": "Este lançamento não está pendente."})
        self._financeiro_repository.atualizar(
            lancamento_id, {"status": "pago", "forma_pagamento": pagamento.forma_pagamento, "pago_em": agora}
        )
        return self.obter(lancamento_id)

    def cancelar(self, lancamento_id: str) -> LancamentoSaida:
        atual = self._para_alteracao(lancamento_id)
        if atual["status"] == "cancelado":
            raise DadosInvalidos({"status": "Este lançamento já está cancelado."})
        self._financeiro_repository.atualizar(lancamento_id, {"status": "cancelado"})
        return self.obter(lancamento_id)

    def listar(self, filtros: dict, pagina: int, tamanho: int) -> ExtratoLancamentos:
        linhas, totais = self._financeiro_repository.listar(filtros, (pagina - 1) * tamanho, tamanho)
        return ExtratoLancamentos(
            itens=[LancamentoSaida(**linha) for linha in linhas],
            total=totais["total"],
            pagina=pagina,
            tamanho=tamanho,
            total_receitas=totais["total_receitas"],
            total_despesas=totais["total_despesas"],
        )

    def resumo(self, mes: date) -> ResumoFinanceiro:
        inicio = mes.replace(day=1)
        fim = somar_meses(inicio, 1)
        atual = self._financeiro_repository.totais_do_periodo(inicio, fim)
        anterior = self._financeiro_repository.totais_do_periodo(somar_meses(inicio, -1), inicio)
        saldo = atual["receitas"] - atual["despesas"]
        saldo_anterior = anterior["receitas"] - anterior["despesas"]

        inicio_fluxo = somar_meses(inicio, 1 - MESES_NO_FLUXO)
        por_mes = {linha["mes"]: linha for linha in self._financeiro_repository.fluxo_mensal(inicio_fluxo, fim)}
        fluxo = []
        for deslocamento in range(MESES_NO_FLUXO):
            mes_fluxo = somar_meses(inicio_fluxo, deslocamento)
            linha = por_mes.get(mes_fluxo, {})
            fluxo.append(
                FluxoMensal(mes=mes_fluxo, receitas=linha.get("receitas", 0), despesas=linha.get("despesas", 0))
            )

        categorias = self._financeiro_repository.despesas_por_categoria(inicio, fim)
        total_despesas = sum(linha["valor"] for linha in categorias)
        return ResumoFinanceiro(
            mes=inicio,
            receitas=atual["receitas"],
            despesas=atual["despesas"],
            saldo=saldo,
            total_lancamentos=atual["lancamentos"],
            a_receber=atual["a_receber"],
            a_pagar=atual["a_pagar"],
            variacao=Variacao(
                receitas=calcular_variacao(atual["receitas"], anterior["receitas"]),
                despesas=calcular_variacao(atual["despesas"], anterior["despesas"]),
                saldo=calcular_variacao(saldo, saldo_anterior),
                lancamentos=calcular_variacao(atual["lancamentos"], anterior["lancamentos"]),
            ),
            fluxo=fluxo,
            despesas_por_categoria=[
                TotalCategoria(
                    categoria=linha["categoria"],
                    valor=linha["valor"],
                    percentual=round(linha["valor"] / total_despesas * 100, 1),
                )
                for linha in categorias
            ],
            ultimos_lancamentos=[
                LancamentoSaida(**linha)
                for linha in self._financeiro_repository.ultimos_do_periodo(inicio, fim, QUANTIDADE_ULTIMOS)
            ],
        )

    def relatorio_csv(self, filtros: dict) -> str:
        saida = io.StringIO()
        escritor = csv.writer(saida, delimiter=";", lineterminator="\r\n")
        escritor.writerow(COLUNAS_RELATORIO)
        for linha in self._financeiro_repository.listar_para_relatorio(filtros, LIMITE_RELATORIO):
            lancamento = LancamentoSaida(**linha)
            escritor.writerow(
                [
                    lancamento.data_competencia.strftime("%d/%m/%Y"),
                    "Receita" if lancamento.tipo == "receita" else "Despesa",
                    lancamento.categoria.nome,
                    lancamento.descricao,
                    lancamento.tutor.nome if lancamento.tutor else "",
                    formatar_valor(lancamento.valor),
                    NOMES_FORMA_PAGAMENTO.get(lancamento.forma_pagamento or "", ""),
                    nome_situacao(lancamento.tipo, lancamento.status),
                    lancamento.vencimento.strftime("%d/%m/%Y") if lancamento.vencimento else "",
                    lancamento.pago_em.astimezone(self._fuso).strftime("%d/%m/%Y %H:%M") if lancamento.pago_em else "",
                ]
            )
        return "﻿" + saida.getvalue()

    def _validar(self, entrada: LancamentoDados, tipo: str) -> dict:
        categoria = self._financeiro_repository.buscar_categoria(str(entrada.categoria_id))
        if categoria is None or not categoria["ativo"] or categoria["tipo"] != tipo:
            raise DadosInvalidos({"categoria_id": f"Selecione uma categoria de {tipo}."})

        tutor_id = str(entrada.tutor_id) if entrada.tutor_id else None
        if tutor_id and not self._financeiro_repository.tutor_existe(tutor_id):
            raise DadosInvalidos({"tutor_id": "Selecione um tutor cadastrado."})
        atendimento_id = str(entrada.atendimento_id) if entrada.atendimento_id else None
        if atendimento_id:
            atendimento = self._financeiro_repository.tutor_do_atendimento(atendimento_id)
            if atendimento is None:
                raise DadosInvalidos({"atendimento_id": "Atendimento não encontrado."})
            tutor_id = tutor_id or atendimento["tutor_id"]

        return {
            "categoria_id": str(entrada.categoria_id),
            "descricao": entrada.descricao,
            "valor": entrada.valor,
            "data_competencia": entrada.data_competencia,
            "vencimento": entrada.vencimento,
            "forma_pagamento": entrada.forma_pagamento,
            "tutor_id": tutor_id,
            "atendimento_id": atendimento_id,
        }

    def _exigir_forma_pagamento(self, forma_pagamento: str | None) -> None:
        if forma_pagamento is None:
            raise DadosInvalidos({"forma_pagamento": "Informe a forma de pagamento."})

    def _para_alteracao(self, lancamento_id: str) -> dict:
        atual = self._financeiro_repository.buscar_para_alteracao(lancamento_id)
        if atual is None:
            raise RecursoNaoEncontrado(LANCAMENTO_NAO_ENCONTRADO)
        return atual
