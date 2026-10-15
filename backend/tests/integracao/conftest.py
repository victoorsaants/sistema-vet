import os
from collections.abc import Iterator

import psycopg
import pytest
from psycopg import Connection, sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from psycopg.rows import dict_row

from app.config import settings
from app.db.conexao import configurar_conexao
from scripts.migrar import aplicar_migrations

NOME_BANCO_TESTE = "ajuvet_teste"


def url_banco_teste() -> str:
    if os.environ.get("TEST_DATABASE_URL"):
        return os.environ["TEST_DATABASE_URL"]
    return make_conninfo(settings.database_url, dbname=NOME_BANCO_TESTE)


@pytest.fixture(scope="session")
def banco_teste() -> str:
    url = url_banco_teste()
    nome = conninfo_to_dict(url)["dbname"]
    try:
        with psycopg.connect(make_conninfo(url, dbname="postgres"), autocommit=True) as admin:
            admin.execute(sql.SQL("drop database if exists {} with (force)").format(sql.Identifier(nome)))
            admin.execute(sql.SQL("create database {}").format(sql.Identifier(nome)))
    except psycopg.OperationalError:
        pytest.skip("Banco local indisponível. Rode backend/scripts/banco_local.ps1 para os testes de integração.")
    with psycopg.connect(url) as conexao:
        aplicar_migrations(conexao)
    return url


@pytest.fixture
def conexao(banco_teste: str) -> Iterator[Connection]:
    with psycopg.connect(banco_teste, row_factory=dict_row) as conexao:
        configurar_conexao(conexao)
        yield conexao
        conexao.rollback()
