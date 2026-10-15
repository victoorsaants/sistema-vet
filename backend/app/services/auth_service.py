import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.repositories.sessao_repository import SessaoRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.auth import CredenciaisLogin, PerfilUsuario, SessaoAutenticada, UsuarioLogado
from app.services.excecoes import CredenciaisInvalidas, SessaoInvalida, UsuarioSemAcesso

ALGORITMO_JWT = "HS256"
HASH_PARA_USUARIO_INEXISTENTE = bcrypt.hashpw(b"usuario-inexistente", bcrypt.gensalt()).decode()


@dataclass(frozen=True)
class ConfiguracaoTokens:
    segredo: str
    minutos_access: int
    dias_refresh: int


def gerar_hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def senha_confere(senha: str, hash_senha: str) -> bool:
    return bcrypt.checkpw(senha.encode(), hash_senha.encode())


def hash_refresh_token(refresh_token: str) -> str:
    return hashlib.sha256(refresh_token.encode()).hexdigest()


class AuthService:
    def __init__(
        self,
        usuario_repository: UsuarioRepository,
        sessao_repository: SessaoRepository,
        configuracao: ConfiguracaoTokens,
    ) -> None:
        self._usuario_repository = usuario_repository
        self._sessao_repository = sessao_repository
        self._configuracao = configuracao

    def autenticar(self, credenciais: CredenciaisLogin) -> SessaoAutenticada:
        registro = self._usuario_repository.buscar_credenciais(credenciais.email.strip())
        hash_senha = registro["encrypted_password"] if registro else HASH_PARA_USUARIO_INEXISTENTE
        if not senha_confere(credenciais.senha, hash_senha) or registro is None:
            raise CredenciaisInvalidas()

        usuario = self._validar_acesso(registro)
        refresh_token = secrets.token_urlsafe(48)
        sessao_id = self._sessao_repository.criar(
            usuario.id, hash_refresh_token(refresh_token), self._validade_refresh()
        )
        return self._montar_sessao(usuario, sessao_id, refresh_token)

    def renovar(self, refresh_token: str) -> SessaoAutenticada:
        sessao = self._sessao_repository.buscar_ativa_por_refresh(hash_refresh_token(refresh_token))
        if sessao is None:
            raise SessaoInvalida()

        usuario = self._carregar_usuario(sessao["usuario_id"])
        novo_refresh_token = secrets.token_urlsafe(48)
        self._sessao_repository.renovar(
            sessao["id"], hash_refresh_token(novo_refresh_token), self._validade_refresh()
        )
        return self._montar_sessao(usuario, sessao["id"], novo_refresh_token)

    def obter_usuario(self, access_token: str) -> UsuarioLogado:
        conteudo = self._decodificar(access_token)
        if not self._sessao_repository.esta_ativa(conteudo["sid"]):
            raise SessaoInvalida()
        return self._carregar_usuario(conteudo["sub"])

    def encerrar(self, access_token: str) -> None:
        try:
            conteudo = self._decodificar(access_token, verificar_expiracao=False)
        except SessaoInvalida:
            return
        self._sessao_repository.encerrar(conteudo["sid"])

    def _decodificar(self, access_token: str, verificar_expiracao: bool = True) -> dict:
        try:
            return jwt.decode(
                access_token,
                self._configuracao.segredo,
                algorithms=[ALGORITMO_JWT],
                options={"require": ["sub", "sid", "exp"], "verify_exp": verificar_expiracao},
            )
        except jwt.PyJWTError as erro:
            raise SessaoInvalida() from erro

    def _carregar_usuario(self, usuario_id: str) -> UsuarioLogado:
        registro = self._usuario_repository.buscar_por_id(usuario_id)
        if registro is None:
            raise SessaoInvalida()
        return self._validar_acesso(registro)

    def _validar_acesso(self, registro: dict) -> UsuarioLogado:
        if registro["perfil"] is None or not registro["ativo"]:
            raise UsuarioSemAcesso()
        return UsuarioLogado(
            id=registro["id"],
            email=registro["email"],
            nome=registro["nome"],
            perfil=PerfilUsuario(registro["perfil"]),
        )

    def _validade_refresh(self) -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=self._configuracao.dias_refresh)

    def _montar_sessao(self, usuario: UsuarioLogado, sessao_id: str, refresh_token: str) -> SessaoAutenticada:
        expira_em = datetime.now(timezone.utc) + timedelta(minutes=self._configuracao.minutos_access)
        access_token = jwt.encode(
            {"sub": usuario.id, "sid": sessao_id, "perfil": usuario.perfil.value, "exp": expira_em},
            self._configuracao.segredo,
            algorithm=ALGORITMO_JWT,
        )
        return SessaoAutenticada(
            access_token=access_token,
            refresh_token=refresh_token,
            expira_em=int(expira_em.timestamp()),
            usuario=usuario,
        )
