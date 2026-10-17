from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

from app.schemas.comum import EntradaBase
from app.schemas.validadores import (
    validar_cep,
    validar_cpf,
    validar_email,
    validar_telefone,
    validar_uf,
)


class TutorDados(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    cpf: str | None = None
    data_nascimento: date | None = None
    telefone_principal: str
    telefone_secundario: str | None = None
    email: str | None = Field(default=None, max_length=254)
    cep: str | None = None
    endereco: str | None = Field(default=None, max_length=200)
    bairro: str | None = Field(default=None, max_length=100)
    cidade: str | None = Field(default=None, max_length=100)
    estado: str | None = None
    como_conheceu: str | None = Field(default=None, max_length=100)


class TutorEntrada(EntradaBase, TutorDados):
    cpf: str
    endereco: str = Field(max_length=200)
    cidade: str = Field(max_length=100)
    estado: str
    cep: str

    _validar_cpf = field_validator("cpf")(validar_cpf)
    _validar_telefones = field_validator("telefone_principal", "telefone_secundario")(validar_telefone)
    _validar_email = field_validator("email")(validar_email)
    _validar_cep = field_validator("cep")(validar_cep)
    _validar_uf = field_validator("estado")(validar_uf)

    @field_validator("data_nascimento")
    @classmethod
    def validar_nascimento(cls, valor: date | None) -> date | None:
        if valor is not None and valor > date.today():
            raise PydanticCustomError("data_futura", "A data não pode estar no futuro.")
        return valor


class TutorSaida(TutorDados):
    id: str
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime


class TutorResumo(BaseModel):
    id: str
    nome: str
    cpf: str | None
    telefone_principal: str
    email: str | None
    cidade: str | None
    total_animais: int
