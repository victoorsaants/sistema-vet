from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.dependencias import exigir_perfis, obter_agora, obter_veterinario_service
from app.schemas.auth import PerfilUsuario
from app.schemas.veterinario import AcessoEntrada, AlteracaoVeterinario, NovoVeterinario, VeterinarioCadastro
from app.services.veterinario_service import VeterinarioService

router = APIRouter(
    prefix="/veterinarios",
    tags=["veterinarios"],
    dependencies=[Depends(exigir_perfis(PerfilUsuario.RECEPCAO))],
)


@router.get("/cadastros", response_model=list[VeterinarioCadastro])
def listar_cadastros(
    veterinario_service: VeterinarioService = Depends(obter_veterinario_service),
    agora: datetime = Depends(obter_agora),
) -> list[VeterinarioCadastro]:
    return veterinario_service.listar(agora)


@router.post("", response_model=VeterinarioCadastro, status_code=status.HTTP_201_CREATED)
def cadastrar_veterinario(
    entrada: NovoVeterinario,
    veterinario_service: VeterinarioService = Depends(obter_veterinario_service),
    agora: datetime = Depends(obter_agora),
) -> VeterinarioCadastro:
    return veterinario_service.cadastrar(entrada, agora)


@router.get("/{veterinario_id}", response_model=VeterinarioCadastro)
def obter_veterinario(
    veterinario_id: UUID,
    veterinario_service: VeterinarioService = Depends(obter_veterinario_service),
    agora: datetime = Depends(obter_agora),
) -> VeterinarioCadastro:
    return veterinario_service.obter(str(veterinario_id), agora)


@router.put("/{veterinario_id}", response_model=VeterinarioCadastro)
def atualizar_veterinario(
    veterinario_id: UUID,
    entrada: AlteracaoVeterinario,
    veterinario_service: VeterinarioService = Depends(obter_veterinario_service),
    agora: datetime = Depends(obter_agora),
) -> VeterinarioCadastro:
    return veterinario_service.atualizar(str(veterinario_id), entrada, agora)


@router.put("/{veterinario_id}/acesso", response_model=VeterinarioCadastro)
def definir_acesso(
    veterinario_id: UUID,
    entrada: AcessoEntrada,
    veterinario_service: VeterinarioService = Depends(obter_veterinario_service),
    agora: datetime = Depends(obter_agora),
) -> VeterinarioCadastro:
    return veterinario_service.definir_acesso(str(veterinario_id), entrada, agora)
