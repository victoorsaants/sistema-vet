from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencias import (
    exigir_perfis,
    obter_agendamento_service,
    obter_agora,
    obter_expediente_service,
)
from app.schemas.agenda import (
    AgendamentoEntrada,
    AgendamentoSaida,
    AlteracaoStatus,
    DiaAgenda,
    Expediente,
    Folga,
    FolgaEntrada,
    StatusAgendamento,
    VeterinarioResumo,
)
from app.schemas.auth import PerfilUsuario, UsuarioLogado
from app.services.agendamento_service import AgendamentoService
from app.services.expediente_service import ExpedienteService

router = APIRouter(tags=["agenda"])

somente_recepcao = exigir_perfis(PerfilUsuario.RECEPCAO)
equipe_clinica = exigir_perfis(PerfilUsuario.RECEPCAO, PerfilUsuario.VETERINARIO)


@router.get("/veterinarios", response_model=list[VeterinarioResumo], dependencies=[Depends(equipe_clinica)])
def listar_veterinarios(
    expediente_service: ExpedienteService = Depends(obter_expediente_service),
) -> list[VeterinarioResumo]:
    return expediente_service.listar_veterinarios()


@router.get(
    "/veterinarios/{veterinario_id}/expediente",
    response_model=Expediente,
    dependencies=[Depends(somente_recepcao)],
)
def obter_expediente(
    veterinario_id: UUID,
    expediente_service: ExpedienteService = Depends(obter_expediente_service),
) -> Expediente:
    return expediente_service.obter_expediente(str(veterinario_id))


@router.put(
    "/veterinarios/{veterinario_id}/expediente",
    response_model=Expediente,
    dependencies=[Depends(somente_recepcao)],
)
def salvar_expediente(
    veterinario_id: UUID,
    expediente: Expediente,
    expediente_service: ExpedienteService = Depends(obter_expediente_service),
) -> Expediente:
    return expediente_service.salvar_expediente(str(veterinario_id), expediente)


@router.get(
    "/veterinarios/{veterinario_id}/folgas",
    response_model=list[Folga],
    dependencies=[Depends(somente_recepcao)],
)
def listar_folgas(
    veterinario_id: UUID,
    expediente_service: ExpedienteService = Depends(obter_expediente_service),
    agora: datetime = Depends(obter_agora),
) -> list[Folga]:
    return expediente_service.listar_folgas(str(veterinario_id), agora)


@router.post(
    "/veterinarios/{veterinario_id}/folgas",
    response_model=Folga,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(somente_recepcao)],
)
def criar_folga(
    veterinario_id: UUID,
    entrada: FolgaEntrada,
    expediente_service: ExpedienteService = Depends(obter_expediente_service),
) -> Folga:
    return expediente_service.criar_folga(str(veterinario_id), entrada)


@router.delete(
    "/veterinarios/{veterinario_id}/folgas/{folga_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(somente_recepcao)],
)
def remover_folga(
    veterinario_id: UUID,
    folga_id: UUID,
    expediente_service: ExpedienteService = Depends(obter_expediente_service),
) -> None:
    expediente_service.remover_folga(str(veterinario_id), str(folga_id))


@router.get(
    "/veterinarios/{veterinario_id}/agenda",
    response_model=list[DiaAgenda],
    dependencies=[Depends(equipe_clinica)],
)
def consultar_agenda(
    veterinario_id: UUID,
    inicio: date,
    dias: int = Query(default=7, ge=1, le=31),
    agendamento_service: AgendamentoService = Depends(obter_agendamento_service),
    agora: datetime = Depends(obter_agora),
) -> list[DiaAgenda]:
    return agendamento_service.montar_agenda(str(veterinario_id), inicio, dias, agora)


@router.get("/agendamentos", response_model=list[AgendamentoSaida])
def listar_agendamentos(
    de: datetime | None = None,
    ate: datetime | None = None,
    veterinario_id: UUID | None = None,
    status_agendamento: list[StatusAgendamento] | None = Query(default=None, alias="status"),
    usuario: UsuarioLogado = Depends(equipe_clinica),
    agendamento_service: AgendamentoService = Depends(obter_agendamento_service),
    agora: datetime = Depends(obter_agora),
) -> list[AgendamentoSaida]:
    filtro_veterinario = str(veterinario_id) if veterinario_id else None
    if usuario.perfil is PerfilUsuario.VETERINARIO:
        filtro_veterinario = agendamento_service.veterinario_do_usuario(usuario.id)
        if filtro_veterinario is None:
            return []
    return agendamento_service.listar(de or agora, ate, filtro_veterinario, status_agendamento)


@router.post("/agendamentos", response_model=AgendamentoSaida, status_code=status.HTTP_201_CREATED)
def agendar(
    entrada: AgendamentoEntrada,
    usuario: UsuarioLogado = Depends(somente_recepcao),
    agendamento_service: AgendamentoService = Depends(obter_agendamento_service),
    agora: datetime = Depends(obter_agora),
) -> AgendamentoSaida:
    return agendamento_service.agendar(entrada, usuario.id, agora)


@router.get(
    "/agendamentos/{agendamento_id}",
    response_model=AgendamentoSaida,
    dependencies=[Depends(equipe_clinica)],
)
def obter_agendamento(
    agendamento_id: UUID,
    agendamento_service: AgendamentoService = Depends(obter_agendamento_service),
) -> AgendamentoSaida:
    return agendamento_service.obter(str(agendamento_id))


@router.patch(
    "/agendamentos/{agendamento_id}/status",
    response_model=AgendamentoSaida,
    dependencies=[Depends(somente_recepcao)],
)
def alterar_status(
    agendamento_id: UUID,
    alteracao: AlteracaoStatus,
    agendamento_service: AgendamentoService = Depends(obter_agendamento_service),
) -> AgendamentoSaida:
    return agendamento_service.alterar_status(str(agendamento_id), alteracao.status)
