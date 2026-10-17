from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    agenda,
    animais,
    atendimentos,
    auth,
    financeiro,
    health,
    notificacoes,
    tutores,
    veterinarios,
)
from app.api.tratadores_erro import registrar_tratadores_erro
from app.config import settings
from app.db.conexao import fechar_pool
from app.despacho_notificacoes import DespachoNotificacoes


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI) -> AsyncIterator[None]:
    despacho = DespachoNotificacoes(settings.intervalo_envio_segundos)
    if settings.envio_automatico_notificacoes:
        despacho.iniciar()
    yield
    despacho.parar()
    fechar_pool()


app = FastAPI(
    title="AjuVet+ API",
    description="API do sistema de gestão veterinária AjuVet+",
    version="0.1.0",
    lifespan=ciclo_de_vida,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_tratadores_erro(app)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tutores.router, prefix="/api/v1")
app.include_router(animais.router, prefix="/api/v1")
app.include_router(veterinarios.router, prefix="/api/v1")
app.include_router(agenda.router, prefix="/api/v1")
app.include_router(atendimentos.router, prefix="/api/v1")
app.include_router(notificacoes.router, prefix="/api/v1")
app.include_router(financeiro.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "AjuVet+ API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
