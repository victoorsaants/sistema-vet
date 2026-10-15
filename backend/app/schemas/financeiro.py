from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.agenda import TipoAtendimento
from app.schemas.atendimento import Referencia
from app.schemas.comum import EntradaBase, Pagina

TipoLancamento = Literal["receita", "despesa"]
StatusLancamento = Literal["pendente", "pago", "cancelado"]
FormaPagamento = Literal["dinheiro", "pix", "cartao_credito", "cartao_debito", "transferencia", "boleto"]

VALOR_MAXIMO = Decimal("9999999999.99")


class CategoriaSaida(BaseModel):
    id: str
    nome: str
    tipo: TipoLancamento


class LancamentoDados(EntradaBase):
    categoria_id: UUID
    descricao: str = Field(min_length=2, max_length=200)
    valor: Decimal = Field(gt=0, le=VALOR_MAXIMO, decimal_places=2)
    data_competencia: date
    vencimento: date | None = None
    forma_pagamento: FormaPagamento | None = None
    tutor_id: UUID | None = None
    atendimento_id: UUID | None = None


class LancamentoEntrada(LancamentoDados):
    tipo: TipoLancamento
    status: Literal["pendente", "pago"] = "pendente"


class Pagamento(BaseModel):
    forma_pagamento: FormaPagamento


class AtendimentoDoLancamento(BaseModel):
    id: str
    tipo: TipoAtendimento
    realizado_em: datetime
    animal: str


class LancamentoSaida(BaseModel):
    id: str
    tipo: TipoLancamento
    categoria: Referencia
    descricao: str
    valor: float
    forma_pagamento: FormaPagamento | None
    status: StatusLancamento
    data_competencia: date
    vencimento: date | None
    pago_em: datetime | None
    tutor: Referencia | None
    atendimento: AtendimentoDoLancamento | None
    registrado_por: str | None
    criado_em: datetime
    atualizado_em: datetime


class ExtratoLancamentos(Pagina[LancamentoSaida]):
    total_receitas: float
    total_despesas: float


class Variacao(BaseModel):
    receitas: float | None
    despesas: float | None
    saldo: float | None
    lancamentos: float | None


class FluxoMensal(BaseModel):
    mes: date
    receitas: float
    despesas: float


class TotalCategoria(BaseModel):
    categoria: str
    valor: float
    percentual: float


class ResumoFinanceiro(BaseModel):
    mes: date
    receitas: float
    despesas: float
    saldo: float
    total_lancamentos: int
    a_receber: float
    a_pagar: float
    variacao: Variacao
    fluxo: list[FluxoMensal]
    despesas_por_categoria: list[TotalCategoria]
    ultimos_lancamentos: list[LancamentoSaida]
