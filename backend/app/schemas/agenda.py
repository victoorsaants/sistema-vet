from datetime import date, datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from app.schemas.comum import EntradaBase

TipoAtendimento = Literal["consulta", "retorno", "vacinacao", "exame", "procedimento"]
StatusAgendamento = Literal["agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "faltou"]
StatusAlteravel = Literal["confirmado", "cancelado", "faltou"]

NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]


class VeterinarioResumo(BaseModel):
    id: str
    nome: str
    crmv: str
    especialidade: str | None


class FaixaExpediente(BaseModel):
    dia_semana: int = Field(ge=0, le=6, description="0 = domingo, 6 = sábado")
    hora_inicio: time
    hora_fim: time
    duracao_minutos: int = Field(default=30, ge=5, le=240)

    @model_validator(mode="after")
    def validar_horas(self) -> "FaixaExpediente":
        if self.hora_fim <= self.hora_inicio:
            raise PydanticCustomError("faixa_invertida", "O horário final deve ser depois do inicial.")
        return self


class Expediente(BaseModel):
    faixas: list[FaixaExpediente] = Field(max_length=28)

    @model_validator(mode="after")
    def validar_sobreposicao(self) -> "Expediente":
        por_dia: dict[int, list[FaixaExpediente]] = {}
        for faixa in self.faixas:
            por_dia.setdefault(faixa.dia_semana, []).append(faixa)
        for dia, faixas in por_dia.items():
            ordenadas = sorted(faixas, key=lambda faixa: faixa.hora_inicio)
            for anterior, atual in zip(ordenadas, ordenadas[1:]):
                if atual.hora_inicio < anterior.hora_fim:
                    raise PydanticCustomError(
                        "faixas_sobrepostas",
                        "Há faixas de horário que se sobrepõem na {dia}.",
                        {"dia": NOMES_DIAS[dia]},
                    )
        return self


class FolgaEntrada(EntradaBase):
    data_inicio: date
    data_fim: date
    motivo: str | None = Field(default=None, max_length=200)

    @field_validator("data_fim")
    @classmethod
    def validar_periodo(cls, data_fim: date, info) -> date:
        data_inicio = info.data.get("data_inicio")
        if data_inicio and data_fim < data_inicio:
            raise PydanticCustomError("periodo_invertido", "A data final deve ser igual ou depois da inicial.")
        return data_fim


class Folga(BaseModel):
    id: str
    data_inicio: date
    data_fim: date
    motivo: str | None


class HorarioAgenda(BaseModel):
    inicio: datetime
    fim: datetime
    disponivel: bool


class DiaAgenda(BaseModel):
    data: date
    atende: bool
    horarios: list[HorarioAgenda]


class AgendamentoEntrada(EntradaBase):
    animal_id: UUID
    veterinario_id: UUID
    tipo: TipoAtendimento
    especialidade: str | None = Field(default=None, max_length=100)
    inicio: datetime
    observacoes: str | None = Field(default=None, max_length=1000)

    @field_validator("inicio")
    @classmethod
    def exigir_fuso(cls, inicio: datetime) -> datetime:
        if inicio.tzinfo is None:
            raise PydanticCustomError("sem_fuso", "Informe o horário com fuso horário.")
        return inicio


class AlteracaoStatus(BaseModel):
    status: StatusAlteravel


class AnimalDoAgendamento(BaseModel):
    id: str
    nome: str
    especie: str
    raca: str | None


class PessoaDoAgendamento(BaseModel):
    id: str
    nome: str
    telefone_principal: str | None = None


class AgendamentoSaida(BaseModel):
    id: str
    inicio: datetime
    fim: datetime
    tipo: TipoAtendimento
    especialidade: str | None
    status: StatusAgendamento
    observacoes: str | None
    animal: AnimalDoAgendamento
    tutor: PessoaDoAgendamento
    veterinario: PessoaDoAgendamento
