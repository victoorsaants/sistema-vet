from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencias import exigir_perfis, obter_animal_service
from app.schemas.animal import AnimalEntrada, AnimalResumo, AnimalSaida
from app.schemas.auth import PerfilUsuario
from app.schemas.comum import Pagina
from app.services.animal_service import AnimalService

router = APIRouter(prefix="/animais", tags=["animais"])

somente_recepcao = exigir_perfis(PerfilUsuario.RECEPCAO)
equipe_clinica = exigir_perfis(PerfilUsuario.RECEPCAO, PerfilUsuario.VETERINARIO)


@router.get("", response_model=Pagina[AnimalResumo], dependencies=[Depends(equipe_clinica)])
def listar_animais(
    busca: str | None = Query(default=None, max_length=100),
    tutor_id: UUID | None = None,
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    animal_service: AnimalService = Depends(obter_animal_service),
) -> Pagina[AnimalResumo]:
    return animal_service.listar(busca, str(tutor_id) if tutor_id else None, pagina, tamanho)


@router.post(
    "",
    response_model=AnimalSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(somente_recepcao)],
)
def criar_animal(
    entrada: AnimalEntrada,
    animal_service: AnimalService = Depends(obter_animal_service),
) -> AnimalSaida:
    return animal_service.criar(entrada)


@router.get("/{animal_id}", response_model=AnimalSaida, dependencies=[Depends(equipe_clinica)])
def obter_animal(
    animal_id: UUID,
    animal_service: AnimalService = Depends(obter_animal_service),
) -> AnimalSaida:
    return animal_service.obter(str(animal_id))


@router.put("/{animal_id}", response_model=AnimalSaida, dependencies=[Depends(somente_recepcao)])
def atualizar_animal(
    animal_id: UUID,
    entrada: AnimalEntrada,
    animal_service: AnimalService = Depends(obter_animal_service),
) -> AnimalSaida:
    return animal_service.atualizar(str(animal_id), entrada)
