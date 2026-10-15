from collections.abc import Callable
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection

from app.config import settings
from app.db.conexao import abrir_conexao
from app.repositories.agenda_repository import (
    AgendamentoRepository,
    ExpedienteRepository,
    VeterinarioRepository,
)
from app.repositories.animal_repository import AnimalRepository
from app.repositories.armazenamento_arquivos import ArmazenamentoArquivos
from app.repositories.enviador_email import EnviadorArquivo, EnviadorEmail, EnviadorSmtp
from app.repositories.financeiro_repository import FinanceiroRepository
from app.repositories.atendimento_repository import (
    AnexoRepository,
    AtendimentoRepository,
    HistoricoRepository,
)
from app.repositories.notificacao_repository import NotificacaoRepository
from app.repositories.sessao_repository import SessaoRepository
from app.repositories.tutor_repository import TutorRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.veterinario_repository import CadastroVeterinarioRepository
from app.schemas.auth import PerfilUsuario, UsuarioLogado
from app.services.agendamento_service import AgendamentoService
from app.services.anexo_service import AnexoService
from app.services.animal_service import AnimalService
from app.services.atendimento_service import AtendimentoService
from app.services.auth_service import AuthService, ConfiguracaoTokens
from app.services.expediente_service import ExpedienteService
from app.services.financeiro_service import FinanceiroService
from app.services.historico_service import HistoricoService
from app.services.mensagens_tutor import RedatorMensagens
from app.services.notificacao_service import NotificacaoService
from app.services.tutor_service import TutorService
from app.services.veterinario_service import VeterinarioService

esquema_bearer = HTTPBearer(auto_error=False)


def obter_configuracao_tokens() -> ConfiguracaoTokens:
    if not settings.jwt_segredo:
        raise RuntimeError("Configure JWT_SEGREDO no arquivo backend/.env.")
    return ConfiguracaoTokens(
        segredo=settings.jwt_segredo,
        minutos_access=settings.jwt_minutos_access,
        dias_refresh=settings.dias_refresh,
    )


def obter_auth_service(conexao: Connection = Depends(abrir_conexao)) -> AuthService:
    return AuthService(UsuarioRepository(conexao), SessaoRepository(conexao), obter_configuracao_tokens())


def obter_veterinario_service(conexao: Connection = Depends(abrir_conexao)) -> VeterinarioService:
    return VeterinarioService(
        CadastroVeterinarioRepository(conexao), UsuarioRepository(conexao), SessaoRepository(conexao)
    )


def obter_tutor_service(conexao: Connection = Depends(abrir_conexao)) -> TutorService:
    return TutorService(TutorRepository(conexao))


def obter_animal_service(conexao: Connection = Depends(abrir_conexao)) -> AnimalService:
    return AnimalService(AnimalRepository(conexao), TutorRepository(conexao))


def obter_fuso() -> ZoneInfo:
    return ZoneInfo(settings.fuso_horario)


def obter_agora() -> datetime:
    return datetime.now(timezone.utc)


def criar_redator() -> RedatorMensagens:
    return RedatorMensagens(settings.nome_clinica, settings.contato_clinica, ZoneInfo(settings.fuso_horario))


def criar_enviador() -> EnviadorEmail:
    if settings.smtp_host:
        return EnviadorSmtp(
            settings.smtp_host,
            settings.smtp_porta,
            settings.smtp_usuario,
            settings.smtp_senha,
            settings.smtp_tls,
            settings.email_remetente,
        )
    return EnviadorArquivo(settings.pasta_emails, settings.email_remetente)


def criar_notificacao_service(conexao: Connection) -> NotificacaoService:
    return NotificacaoService(NotificacaoRepository(conexao), criar_redator(), ZoneInfo(settings.fuso_horario))


def obter_notificacao_service(conexao: Connection = Depends(abrir_conexao)) -> NotificacaoService:
    return criar_notificacao_service(conexao)


def obter_financeiro_service(
    conexao: Connection = Depends(abrir_conexao),
    fuso: ZoneInfo = Depends(obter_fuso),
) -> FinanceiroService:
    return FinanceiroService(FinanceiroRepository(conexao), fuso)


def obter_expediente_service(
    conexao: Connection = Depends(abrir_conexao),
    fuso: ZoneInfo = Depends(obter_fuso),
) -> ExpedienteService:
    return ExpedienteService(VeterinarioRepository(conexao), ExpedienteRepository(conexao), fuso)


def obter_agendamento_service(
    conexao: Connection = Depends(abrir_conexao),
    fuso: ZoneInfo = Depends(obter_fuso),
) -> AgendamentoService:
    return AgendamentoService(
        AgendamentoRepository(conexao),
        ExpedienteRepository(conexao),
        VeterinarioRepository(conexao),
        AnimalRepository(conexao),
        criar_notificacao_service(conexao),
        fuso,
    )


def obter_atendimento_service(
    conexao: Connection = Depends(abrir_conexao),
    fuso: ZoneInfo = Depends(obter_fuso),
) -> AtendimentoService:
    return AtendimentoService(
        AtendimentoRepository(conexao),
        AnexoRepository(conexao),
        AgendamentoRepository(conexao),
        VeterinarioRepository(conexao),
        AnimalRepository(conexao),
        criar_notificacao_service(conexao),
        fuso,
    )


def obter_anexo_service(
    conexao: Connection = Depends(abrir_conexao),
    atendimento_service: AtendimentoService = Depends(obter_atendimento_service),
) -> AnexoService:
    return AnexoService(
        AnexoRepository(conexao),
        AtendimentoRepository(conexao),
        atendimento_service,
        ArmazenamentoArquivos(settings.pasta_arquivos),
        settings.tamanho_maximo_anexo_mb * 1024 * 1024,
    )


def obter_historico_service(
    conexao: Connection = Depends(abrir_conexao),
    fuso: ZoneInfo = Depends(obter_fuso),
) -> HistoricoService:
    return HistoricoService(HistoricoRepository(conexao), fuso)


def obter_access_token(
    credenciais: HTTPAuthorizationCredentials | None = Depends(esquema_bearer),
) -> str:
    if credenciais is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credenciais.credentials


def obter_usuario_atual(
    access_token: str = Depends(obter_access_token),
    auth_service: AuthService = Depends(obter_auth_service),
) -> UsuarioLogado:
    return auth_service.obter_usuario(access_token)


def exigir_perfis(*perfis: PerfilUsuario) -> Callable[..., UsuarioLogado]:
    def verificar_perfil(
        usuario: UsuarioLogado = Depends(obter_usuario_atual),
    ) -> UsuarioLogado:
        if usuario.perfil not in perfis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seu perfil não tem acesso a esta funcionalidade.",
            )
        return usuario

    return verificar_perfil
