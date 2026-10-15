from fastapi import APIRouter, Depends, status

from app.api.dependencias import (
    obter_access_token,
    obter_auth_service,
    obter_usuario_atual,
)
from app.schemas.auth import (
    CredenciaisLogin,
    RenovacaoSessao,
    SessaoAutenticada,
    UsuarioLogado,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessaoAutenticada)
def login(
    credenciais: CredenciaisLogin,
    auth_service: AuthService = Depends(obter_auth_service),
) -> SessaoAutenticada:
    return auth_service.autenticar(credenciais)


@router.post("/renovar", response_model=SessaoAutenticada)
def renovar_sessao(
    renovacao: RenovacaoSessao,
    auth_service: AuthService = Depends(obter_auth_service),
) -> SessaoAutenticada:
    return auth_service.renovar(renovacao.refresh_token)


@router.get("/me", response_model=UsuarioLogado)
def usuario_logado(usuario: UsuarioLogado = Depends(obter_usuario_atual)) -> UsuarioLogado:
    return usuario


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    access_token: str = Depends(obter_access_token),
    auth_service: AuthService = Depends(obter_auth_service),
) -> None:
    auth_service.encerrar(access_token)
