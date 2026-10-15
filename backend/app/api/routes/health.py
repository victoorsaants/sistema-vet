import psycopg
from fastapi import APIRouter
from psycopg_pool import PoolTimeout

from app.db.conexao import obter_pool

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    try:
        with obter_pool().connection() as conexao:
            conexao.execute("select 1")
        banco_conectado = True
    except (PoolTimeout, psycopg.OperationalError):
        banco_conectado = False

    return {
        "status": "ok",
        "service": "ajuvet-api",
        "banco": {"conectado": banco_conectado},
    }
