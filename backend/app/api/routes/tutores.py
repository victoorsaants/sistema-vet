from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencias import exigir_perfis, obter_tutor_service
from app.schemas.auth import PerfilUsuario
from app.schemas.comum import Pagina
from app.schemas.tutor import TutorEntrada, TutorResumo, TutorSaida
from app.services.tutor_service import TutorService

router = APIRouter(
    prefix="/tutores",
    tags=["tutores"],
    dependencies=[Depends(exigir_perfis(PerfilUsuario.RECEPCAO))],
)


@router.get("", response_model=Pagina[TutorResumo])
def listar_tutores(
    busca: str | None = Query(default=None, max_length=100),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    tutor_service: TutorService = Depends(obter_tutor_service),
) -> Pagina[TutorResumo]:
    return tutor_service.listar(busca, pagina, tamanho)


@router.post("", response_model=TutorSaida, status_code=status.HTTP_201_CREATED)
def criar_tutor(
    entrada: TutorEntrada,
    tutor_service: TutorService = Depends(obter_tutor_service),
) -> TutorSaida:
    return tutor_service.criar(entrada)


@router.get("/{tutor_id}", response_model=TutorSaida)
def obter_tutor(
    tutor_id: UUID,
    tutor_service: TutorService = Depends(obter_tutor_service),
) -> TutorSaida:
    return tutor_service.obter(str(tutor_id))


@router.put("/{tutor_id}", response_model=TutorSaida)
def atualizar_tutor(
    tutor_id: UUID,
    entrada: TutorEntrada,
    tutor_service: TutorService = Depends(obter_tutor_service),
) -> TutorSaida:
    return tutor_service.atualizar(str(tutor_id), entrada)
