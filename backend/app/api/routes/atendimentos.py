from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.api.dependencias import (
    exigir_perfis,
    obter_agora,
    obter_anexo_service,
    obter_atendimento_service,
    obter_historico_service,
)
from app.config import settings
from app.schemas.atendimento import (
    AnexoSaida,
    AtendimentoResumo,
    AtendimentoSaida,
    HistoricoClinico,
    InicioAtendimento,
    RegistroAtendimento,
    StatusAtendimento,
    TipoEvento,
)
from app.schemas.auth import PerfilUsuario, UsuarioLogado
from app.services.anexo_service import AnexoService
from app.services.atendimento_service import AtendimentoService
from app.services.historico_service import HistoricoService

router = APIRouter(tags=["atendimentos"])

somente_veterinario = exigir_perfis(PerfilUsuario.VETERINARIO)
equipe_clinica = exigir_perfis(PerfilUsuario.RECEPCAO, PerfilUsuario.VETERINARIO)


@router.get("/atendimentos", response_model=list[AtendimentoResumo])
def listar_atendimentos(
    animal_id: UUID | None = None,
    status_atendimento: StatusAtendimento | None = Query(default=None, alias="status"),
    meus: bool = False,
    usuario: UsuarioLogado = Depends(equipe_clinica),
    atendimento_service: AtendimentoService = Depends(obter_atendimento_service),
) -> list[AtendimentoResumo]:
    apenas_meus = meus and usuario.perfil is PerfilUsuario.VETERINARIO
    return atendimento_service.listar(
        str(animal_id) if animal_id else None, status_atendimento, usuario, apenas_meus
    )


@router.post("/atendimentos", response_model=AtendimentoSaida, status_code=status.HTTP_201_CREATED)
def iniciar_atendimento(
    entrada: InicioAtendimento,
    usuario: UsuarioLogado = Depends(somente_veterinario),
    atendimento_service: AtendimentoService = Depends(obter_atendimento_service),
    agora: datetime = Depends(obter_agora),
) -> AtendimentoSaida:
    return atendimento_service.iniciar(entrada, usuario, agora)


@router.get(
    "/atendimentos/{atendimento_id}",
    response_model=AtendimentoSaida,
    dependencies=[Depends(equipe_clinica)],
)
def obter_atendimento(
    atendimento_id: UUID,
    atendimento_service: AtendimentoService = Depends(obter_atendimento_service),
) -> AtendimentoSaida:
    return atendimento_service.obter(str(atendimento_id))


@router.put("/atendimentos/{atendimento_id}", response_model=AtendimentoSaida)
def registrar_atendimento(
    atendimento_id: UUID,
    entrada: RegistroAtendimento,
    usuario: UsuarioLogado = Depends(somente_veterinario),
    atendimento_service: AtendimentoService = Depends(obter_atendimento_service),
    agora: datetime = Depends(obter_agora),
) -> AtendimentoSaida:
    return atendimento_service.registrar(str(atendimento_id), entrada, usuario, agora)


@router.post("/atendimentos/{atendimento_id}/finalizar", response_model=AtendimentoSaida)
def finalizar_atendimento(
    atendimento_id: UUID,
    usuario: UsuarioLogado = Depends(somente_veterinario),
    atendimento_service: AtendimentoService = Depends(obter_atendimento_service),
    agora: datetime = Depends(obter_agora),
) -> AtendimentoSaida:
    return atendimento_service.finalizar(str(atendimento_id), usuario, agora)


@router.post(
    "/atendimentos/{atendimento_id}/anexos",
    response_model=AnexoSaida,
    status_code=status.HTTP_201_CREATED,
)
def enviar_anexo(
    atendimento_id: UUID,
    arquivo: UploadFile = File(...),
    exame_id: UUID | None = Form(default=None),
    usuario: UsuarioLogado = Depends(somente_veterinario),
    anexo_service: AnexoService = Depends(obter_anexo_service),
) -> AnexoSaida:
    limite = settings.tamanho_maximo_anexo_mb * 1024 * 1024
    conteudo = arquivo.file.read(limite + 1)
    return anexo_service.enviar(
        str(atendimento_id), usuario, arquivo.filename, conteudo, str(exame_id) if exame_id else None
    )


@router.delete("/atendimentos/{atendimento_id}/anexos/{anexo_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_anexo(
    atendimento_id: UUID,
    anexo_id: UUID,
    usuario: UsuarioLogado = Depends(somente_veterinario),
    anexo_service: AnexoService = Depends(obter_anexo_service),
) -> None:
    anexo_service.remover(str(atendimento_id), str(anexo_id), usuario)


@router.get("/anexos/{anexo_id}/arquivo", dependencies=[Depends(equipe_clinica)])
def baixar_anexo(
    anexo_id: UUID,
    anexo_service: AnexoService = Depends(obter_anexo_service),
) -> FileResponse:
    caminho, nome, tipo_mime = anexo_service.abrir(str(anexo_id))
    return FileResponse(caminho, media_type=tipo_mime, filename=nome, content_disposition_type="inline")


@router.get(
    "/animais/{animal_id}/historico",
    response_model=HistoricoClinico,
    dependencies=[Depends(equipe_clinica)],
)
def historico_clinico(
    animal_id: UUID,
    tipo: TipoEvento | None = None,
    de: date | None = None,
    ate: date | None = None,
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    historico_service: HistoricoService = Depends(obter_historico_service),
    agora: datetime = Depends(obter_agora),
) -> HistoricoClinico:
    return historico_service.montar(str(animal_id), tipo, de, ate, pagina, tamanho, agora)
