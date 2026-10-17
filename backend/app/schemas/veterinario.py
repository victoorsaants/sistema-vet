from datetime import datetime

from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

from app.schemas.comum import EntradaBase
from app.schemas.validadores import validar_email, validar_telefone

TAMANHO_MINIMO_SENHA = 8


def validar_senha(senha: str | None) -> str | None:
    if senha is not None and len(senha) < TAMANHO_MINIMO_SENHA:
        raise PydanticCustomError(
            "senha_curta", "A senha precisa ter pelo menos {minimo} caracteres.", {"minimo": TAMANHO_MINIMO_SENHA}
        )
    return senha


class VeterinarioDados(EntradaBase):
    nome: str = Field(min_length=2, max_length=150)
    crmv: str = Field(min_length=3, max_length=30)
    especialidade: str | None = Field(default=None, max_length=100)
    telefone: str | None = None
    email: str | None = Field(default=None, max_length=254)

    _validar_telefone = field_validator("telefone")(validar_telefone)
    _validar_email = field_validator("email")(validar_email)

    @field_validator("crmv")
    @classmethod
    def padronizar_crmv(cls, crmv: str) -> str:
        return " ".join(crmv.upper().split())


class AcessoEntrada(EntradaBase):
    email_login: str = Field(max_length=254)
    senha_login: str | None = Field(default=None, max_length=128)

    _validar_email = field_validator("email_login")(validar_email)
    _validar_senha = field_validator("senha_login")(validar_senha)


class NovoVeterinario(VeterinarioDados):
    email_login: str | None = Field(default=None, max_length=254)
    senha_login: str | None = Field(default=None, max_length=128)

    _validar_email_login = field_validator("email_login")(validar_email)
    _validar_senha = field_validator("senha_login")(validar_senha)


class AlteracaoVeterinario(VeterinarioDados):
    ativo: bool


class AcessoVeterinario(BaseModel):
    email: str
    ativo: bool


class VeterinarioCadastro(BaseModel):
    id: str
    nome: str
    crmv: str
    especialidade: str | None
    telefone: str | None
    email: str | None
    ativo: bool
    acesso: AcessoVeterinario | None
    agendamentos_futuros: int
    atualizado_em: datetime
