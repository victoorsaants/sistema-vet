import re
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

from app.schemas.comum import EntradaBase

Sexo = Literal["macho", "femea"]
Porte = Literal["pequeno", "medio", "grande"]


class TutorDoAnimal(BaseModel):
    id: str
    nome: str
    telefone_principal: str


class AnimalDados(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=2, max_length=50)
    raca: str | None = Field(default=None, max_length=100)
    sexo: Sexo | None = None
    data_nascimento: date | None = None
    cor_pelagem: str | None = Field(default=None, max_length=100)
    peso_kg: float | None = Field(default=None, gt=0, le=200)
    altura_cm: float | None = Field(default=None, gt=0, le=250)
    largura_cm: float | None = Field(default=None, gt=0, le=250)
    porte: Porte | None = None
    microchip: str | None = None
    castrado: bool | None = None
    observacoes: str | None = Field(default=None, max_length=2000)


class AnimalEntrada(EntradaBase, AnimalDados):
    tutor_id: UUID
    peso_kg: float = Field(gt=0, le=200)

    @field_validator("microchip")
    @classmethod
    def normalizar_microchip(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        microchip = re.sub(r"[\s.\-]", "", valor)
        if not microchip.isalnum() or not 9 <= len(microchip) <= 23:
            raise PydanticCustomError("microchip_invalido", "Microchip inválido.")
        return microchip.upper()

    @field_validator("data_nascimento")
    @classmethod
    def validar_nascimento(cls, valor: date | None) -> date | None:
        if valor is not None and valor > date.today():
            raise PydanticCustomError("data_futura", "A data não pode estar no futuro.")
        return valor


class AnimalSaida(AnimalDados):
    id: str
    ativo: bool
    tutor: TutorDoAnimal
    criado_em: datetime
    atualizado_em: datetime


class AnimalResumo(BaseModel):
    id: str
    nome: str
    especie: str
    raca: str | None
    sexo: Sexo | None
    data_nascimento: date | None
    microchip: str | None
    tutor: TutorDoAnimal
