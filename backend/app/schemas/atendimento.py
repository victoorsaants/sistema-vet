from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator
from pydantic_core import PydanticCustomError

from app.schemas.agenda import TipoAtendimento
from app.schemas.comum import EntradaBase

StatusAtendimento = Literal["em_andamento", "finalizado"]
StatusExame = Literal["solicitado", "realizado", "cancelado"]
TipoEvento = Literal["atendimento", "exame", "vacina", "prescricao"]


class InicioAtendimento(BaseModel):
    agendamento_id: UUID | None = None
    animal_id: UUID | None = None
    tipo: TipoAtendimento | None = None

    @model_validator(mode="after")
    def exigir_origem(self) -> "InicioAtendimento":
        if self.agendamento_id is None and (self.animal_id is None or self.tipo is None):
            raise PydanticCustomError(
                "origem_atendimento",
                "Informe o agendamento ou o animal e o tipo de atendimento.",
            )
        return self


class ExameEntrada(EntradaBase):
    nome: str = Field(min_length=1, max_length=100)
    resultado: str | None = Field(default=None, max_length=2000)


class VacinaEntrada(EntradaBase):
    vacina: str = Field(min_length=1, max_length=100)
    lote: str | None = Field(default=None, max_length=50)
    dose: str | None = Field(default=None, max_length=50)
    proxima_dose_em: date | None = None


class ItemPrescricaoEntrada(EntradaBase):
    medicamento: str = Field(min_length=1, max_length=150)
    dose: str = Field(min_length=1, max_length=100)
    frequencia: str = Field(min_length=1, max_length=100)
    duracao_dias: int | None = Field(default=None, ge=1, le=365)
    via: str | None = Field(default=None, max_length=50)
    observacoes: str | None = Field(default=None, max_length=500)


class PrescricaoEntrada(EntradaBase):
    orientacoes: str | None = Field(default=None, max_length=2000)
    itens: list[ItemPrescricaoEntrada] = Field(default_factory=list, max_length=20)


class RegistroAtendimento(EntradaBase):
    peso_kg: float | None = Field(default=None, gt=0, le=200)
    temperatura_c: float | None = Field(default=None, ge=25, le=45)
    frequencia_cardiaca: int | None = Field(default=None, gt=0, le=400)
    frequencia_respiratoria: int | None = Field(default=None, gt=0, le=200)
    condicao_geral: str | None = Field(default=None, max_length=50)
    queixa_principal: str | None = Field(default=None, max_length=1000)
    diagnostico: str | None = Field(default=None, max_length=2000)
    procedimentos: list[str] = Field(default_factory=list, max_length=20)
    observacoes: str | None = Field(default=None, max_length=2000)
    retorno_em: date | None = None
    exames: list[ExameEntrada] = Field(default_factory=list, max_length=30)
    vacinas: list[VacinaEntrada] = Field(default_factory=list, max_length=10)
    prescricao: PrescricaoEntrada | None = None

    @model_validator(mode="after")
    def limpar_procedimentos(self) -> "RegistroAtendimento":
        vistos = []
        for procedimento in (texto.strip() for texto in self.procedimentos):
            if procedimento and procedimento not in vistos:
                if len(procedimento) > 100:
                    raise PydanticCustomError("procedimento_longo", "Procedimento com texto muito longo.")
                vistos.append(procedimento)
        self.procedimentos = vistos
        return self


class AnimalDoAtendimento(BaseModel):
    id: str
    nome: str
    especie: str
    raca: str | None
    sexo: Literal["macho", "femea"] | None
    data_nascimento: date | None
    peso_kg: float | None
    altura_cm: float | None
    porte: Literal["pequeno", "medio", "grande"] | None
    microchip: str | None
    observacoes: str | None


class TutorDoAtendimento(BaseModel):
    id: str
    nome: str
    telefone_principal: str
    email: str | None
    endereco: str | None
    bairro: str | None
    cidade: str | None
    estado: str | None
    cep: str | None


class Referencia(BaseModel):
    id: str
    nome: str


class VeterinarioDoAtendimento(Referencia):
    perfil_id: str | None


class ExameSaida(BaseModel):
    id: str
    nome: str
    status: StatusExame
    resultado: str | None


class AnexoSaida(BaseModel):
    id: str
    nome_arquivo: str
    tipo_mime: str
    tamanho_bytes: int
    exame_id: str | None
    criado_em: datetime


class VacinaSaida(BaseModel):
    id: str
    vacina: str
    lote: str | None
    dose: str | None
    aplicada_em: date
    proxima_dose_em: date | None


class ItemPrescricaoSaida(BaseModel):
    medicamento: str
    dose: str
    frequencia: str
    duracao_dias: int | None
    via: str | None
    observacoes: str | None


class PrescricaoSaida(BaseModel):
    orientacoes: str | None
    itens: list[ItemPrescricaoSaida]


class AtendimentoSaida(BaseModel):
    id: str
    agendamento_id: str | None
    tipo: TipoAtendimento
    status: StatusAtendimento
    realizado_em: datetime
    peso_kg: float | None
    temperatura_c: float | None
    frequencia_cardiaca: int | None
    frequencia_respiratoria: int | None
    condicao_geral: str | None
    queixa_principal: str | None
    diagnostico: str | None
    procedimentos: list[str]
    observacoes: str | None
    retorno_em: date | None
    animal: AnimalDoAtendimento
    tutor: TutorDoAtendimento
    veterinario: VeterinarioDoAtendimento
    exames: list[ExameSaida] = []
    anexos: list[AnexoSaida] = []
    vacinas: list[VacinaSaida] = []
    prescricao: PrescricaoSaida | None = None


class AtendimentoResumo(BaseModel):
    id: str
    tipo: TipoAtendimento
    status: StatusAtendimento
    realizado_em: datetime
    diagnostico: str | None
    animal: Referencia
    tutor: Referencia
    veterinario: Referencia


class EventoHistorico(BaseModel):
    tipo: TipoEvento
    data: datetime
    titulo: str
    descricao: str | None
    veterinario: str | None
    atendimento_id: str | None


class ReferenciaAtendimento(BaseModel):
    id: str
    data: datetime
    tipo: TipoAtendimento
    veterinario: str


class ResumoHistorico(BaseModel):
    consultas: int
    exames: int
    vacinas: int
    tratamentos: int


class HistoricoClinico(BaseModel):
    animal: AnimalDoAtendimento
    tutor: Referencia
    resumo: ResumoHistorico
    ultimo_atendimento: ReferenciaAtendimento | None
    proximo_agendamento: ReferenciaAtendimento | None
    eventos: list[EventoHistorico]
    total_eventos: int
    pagina: int
    tamanho: int
