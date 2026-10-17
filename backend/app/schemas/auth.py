from enum import Enum

from pydantic import BaseModel, Field


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


class SessaoAutenticada(BaseModel):
    access_token: str
    refresh_token: str
    expira_em: int = Field(description="Momento em que o access_token expira, em segundos desde 1970 (UTC).")
    usuario: UsuarioLogado
