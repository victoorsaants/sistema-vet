from datetime import datetime

from app.repositories.sessao_repository import SessaoRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.veterinario_repository import CadastroVeterinarioRepository
from app.schemas.auth import PerfilUsuario
from app.schemas.veterinario import (
    AcessoEntrada,
    AlteracaoVeterinario,
    NovoVeterinario,
    VeterinarioCadastro,
)
from app.services.auth_service import gerar_hash_senha
from app.services.excecoes import DadosInvalidos, RecursoNaoEncontrado

VETERINARIO_NAO_ENCONTRADO = "Veterinário não encontrado."
CAMPOS_CADASTRO = ("nome", "crmv", "especialidade", "telefone", "email")


class VeterinarioService:
    def __init__(
        self,
        veterinario_repository: CadastroVeterinarioRepository,
        usuario_repository: UsuarioRepository,
        sessao_repository: SessaoRepository,
    ) -> None:
        self._veterinario_repository = veterinario_repository
        self._usuario_repository = usuario_repository
        self._sessao_repository = sessao_repository

    def listar(self, agora: datetime) -> list[VeterinarioCadastro]:
        return [VeterinarioCadastro(**linha) for linha in self._veterinario_repository.listar(agora)]

    def obter(self, veterinario_id: str, agora: datetime) -> VeterinarioCadastro:
        linha = self._veterinario_repository.buscar(veterinario_id, agora)
        if linha is None:
            raise RecursoNaoEncontrado(VETERINARIO_NAO_ENCONTRADO)
        return VeterinarioCadastro(**linha)

    def cadastrar(self, entrada: NovoVeterinario, agora: datetime) -> VeterinarioCadastro:
        if entrada.email_login and not entrada.senha_login:
            raise DadosInvalidos({"senha_login": "Defina a senha de acesso."})
        if entrada.senha_login and not entrada.email_login:
            raise DadosInvalidos({"email_login": "Informe o e-mail de acesso."})

        dados = entrada.model_dump(include=set(CAMPOS_CADASTRO))
        if entrada.email_login:
            dados["perfil_id"] = self._criar_login(entrada.email_login, entrada.senha_login, entrada.nome, True)
        veterinario_id = self._veterinario_repository.criar(dados)
        return self.obter(veterinario_id, agora)

    def atualizar(self, veterinario_id: str, entrada: AlteracaoVeterinario, agora: datetime) -> VeterinarioCadastro:
        atual = self._para_alteracao(veterinario_id)
        if atual["ativo"] and not entrada.ativo:
            pendentes = self.obter(veterinario_id, agora).agendamentos_futuros
            if pendentes:
                raise DadosInvalidos(
                    {
                        "ativo": f"Há {pendentes} agendamento(s) futuro(s) com este veterinário. "
                        "Cancele ou remarque antes de desativar."
                    }
                )

        self._veterinario_repository.atualizar(
            veterinario_id, {**entrada.model_dump(include=set(CAMPOS_CADASTRO)), "ativo": entrada.ativo}
        )
        if atual["perfil_id"]:
            self._usuario_repository.atualizar_perfil(atual["perfil_id"], entrada.nome, entrada.ativo)
            if not entrada.ativo:
                self._sessao_repository.encerrar_do_usuario(atual["perfil_id"])
        return self.obter(veterinario_id, agora)

    def definir_acesso(self, veterinario_id: str, entrada: AcessoEntrada, agora: datetime) -> VeterinarioCadastro:
        atual = self._para_alteracao(veterinario_id)
        if atual["perfil_id"] is None:
            if not entrada.senha_login:
                raise DadosInvalidos({"senha_login": "Defina a senha de acesso."})
            nome = self.obter(veterinario_id, agora).nome
            perfil_id = self._criar_login(entrada.email_login, entrada.senha_login, nome, atual["ativo"])
            self._veterinario_repository.atualizar(veterinario_id, {"perfil_id": perfil_id})
            return self.obter(veterinario_id, agora)

        self._usuario_repository.atualizar_email(atual["perfil_id"], entrada.email_login)
        if entrada.senha_login:
            self._usuario_repository.atualizar_senha(atual["perfil_id"], gerar_hash_senha(entrada.senha_login))
            self._sessao_repository.encerrar_do_usuario(atual["perfil_id"])
        return self.obter(veterinario_id, agora)

    def _criar_login(self, email: str, senha: str, nome: str, ativo: bool) -> str:
        usuario_id = self._usuario_repository.criar(email, gerar_hash_senha(senha))
        self._usuario_repository.criar_perfil(usuario_id, nome, PerfilUsuario.VETERINARIO.value, ativo)
        return usuario_id

    def _para_alteracao(self, veterinario_id: str) -> dict:
        atual = self._veterinario_repository.buscar_para_alteracao(veterinario_id)
        if atual is None:
            raise RecursoNaoEncontrado(VETERINARIO_NAO_ENCONTRADO)
        return atual
