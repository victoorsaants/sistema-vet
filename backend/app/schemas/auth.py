from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.schemas.comum import EntradaBase
from app.schemas.veterinario import validar_senha


class PerfilUsuario(str, Enum):
    RECEPCAO = "recepcao"
    VETERINARIO = "veterinario"


class CredenciaisLogin(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    senha: str = Field(min_length=1, max_length=128)


class RenovacaoSessao(BaseModel):
    refresh_token: str = Field(min_length=1)


class UsuarioLogado(BaseModel):
    id: str
    email: str | None
    nome: str
    perfil: PerfilUsuario


class DadosVeterinarioPerfil(BaseModel):
    crmv: str
    especialidade: str | None
    telefone: str | None


class PerfilDetalhado(UsuarioLogado):
    veterinario: DadosVeterinarioPerfil | None


class AlteracaoPerfil(EntradaBase):
    nome: str = Field(min_length=2, max_length=150)


class AlteracaoSenha(BaseModel):
    senha_atual: str = Field(min_length=1, max_length=128)
    nova_senha: str = Field(min_length=1, max_length=128)

    _validar_nova_senha = field_validator("nova_senha")(validar_senha)


class SessaoAutenticada(BaseModel):
    access_token: str
    refresh_token: str
    expira_em: int = Field(description="Momento em que o access_token expira, em segundos desde 1970 (UTC).")
    usuario: UsuarioLogado
