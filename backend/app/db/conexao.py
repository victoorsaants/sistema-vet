from collections.abc import Iterator
from functools import lru_cache

import psycopg
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg.types.string import TextLoader
from psycopg_pool import ConnectionPool, PoolTimeout

from app.config import settings
from app.services.excecoes import ServicoIndisponivel

SEGUNDOS_ESPERA_CONEXAO = 5


def configurar_conexao(conexao: Connection) -> None:
    conexao.adapters.register_loader("uuid", TextLoader)


@lru_cache
def obter_pool() -> ConnectionPool:
    return ConnectionPool(
        settings.database_url,
        min_size=1,
        max_size=10,
        timeout=SEGUNDOS_ESPERA_CONEXAO,
        kwargs={"row_factory": dict_row},
        configure=configurar_conexao,
        open=True,
    )


def fechar_pool() -> None:
    if obter_pool.cache_info().currsize:
        obter_pool().close()


def abrir_conexao() -> Iterator[Connection]:
    try:
        with obter_pool().connection() as conexao:
            yield conexao
    except (PoolTimeout, psycopg.OperationalError) as erro:
        raise ServicoIndisponivel() from erro
