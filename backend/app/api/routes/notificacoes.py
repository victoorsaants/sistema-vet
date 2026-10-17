from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencias import criar_enviador, exigir_perfis, obter_agora, obter_notificacao_service
from app.config import settings
from app.schemas.auth import PerfilUsuario
from app.schemas.comum import Pagina
from app.schemas.notificacao import (
    NotificacaoSaida,
    ResultadoEnvio,
    ResumoNotificacoes,
    StatusNotificacao,
    TipoNotificacao,
)
from app.services.notificacao_service import NotificacaoService

LIMITE_ENVIO_MANUAL = 50

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])

somente_recepcao = exigir_perfis(PerfilUsuario.RECEPCAO)
equipe_clinica = exigir_perfis(PerfilUsuario.RECEPCAO, PerfilUsuario.VETERINARIO)


@router.get("", response_model=Pagina[NotificacaoSaida], dependencies=[Depends(equipe_clinica)])
def listar_notificacoes(
    status_notificacao: StatusNotificacao | None = Query(default=None, alias="status"),
    tipo: TipoNotificacao | None = None,
    atendimento_id: UUID | None = None,
    busca: str | None = Query(default=None, max_length=100),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=200),
    notificacao_service: NotificacaoService = Depends(obter_notificacao_service),
) -> Pagina[NotificacaoSaida]:
    filtros = {
        "status": status_notificacao,
        "tipo": tipo,
        "atendimento_id": str(atendimento_id) if atendimento_id else None,
        "busca": (busca or "").strip() or None,
    }
    return notificacao_service.listar(filtros, pagina, tamanho)


@router.get("/resumo", response_model=ResumoNotificacoes, dependencies=[Depends(somente_recepcao)])
def resumo_notificacoes(
    notificacao_service: NotificacaoService = Depends(obter_notificacao_service),
    agora: datetime = Depends(obter_agora),
) -> ResumoNotificacoes:
    modo_envio = "smtp" if settings.smtp_host else "arquivo"
    return notificacao_service.resumo(agora).model_copy(update={"modo_envio": modo_envio})


@router.post("/enviar", response_model=ResultadoEnvio, dependencies=[Depends(somente_recepcao)])
def enviar_pendentes(
    notificacao_service: NotificacaoService = Depends(obter_notificacao_service),
    agora: datetime = Depends(obter_agora),
) -> ResultadoEnvio:
    return notificacao_service.enviar_pendentes(criar_enviador(), agora, LIMITE_ENVIO_MANUAL)


@router.post("/{notificacao_id}/reenviar", response_model=NotificacaoSaida, dependencies=[Depends(equipe_clinica)])
def reenviar_notificacao(
    notificacao_id: UUID,
    notificacao_service: NotificacaoService = Depends(obter_notificacao_service),
    agora: datetime = Depends(obter_agora),
) -> NotificacaoSaida:
    return notificacao_service.reenviar(str(notificacao_id), agora)


@router.post("/{notificacao_id}/cancelar", response_model=NotificacaoSaida, dependencies=[Depends(equipe_clinica)])
def cancelar_notificacao(
    notificacao_id: UUID,
    notificacao_service: NotificacaoService = Depends(obter_notificacao_service),
) -> NotificacaoSaida:
    return notificacao_service.cancelar(str(notificacao_id))
