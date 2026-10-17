from typing import Any, Generic, TypeVar

from pydantic import BaseModel, model_validator

T = TypeVar("T")


class EntradaBase(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def limpar_textos(cls, dados: Any) -> Any:
        if not isinstance(dados, dict):
            return dados
        limpos = {}
        for campo, valor in dados.items():
            if isinstance(valor, str):
                valor = valor.strip() or None
            limpos[campo] = valor
        return limpos


class Pagina(BaseModel, Generic[T]):
    itens: list[T]
    total: int
    pagina: int
    tamanho: int
