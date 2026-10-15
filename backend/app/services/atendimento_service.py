import re
import unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo

from app.repositories.agenda_repository import AgendamentoRepository, VeterinarioRepository
from app.repositories.animal_repository import AnimalRepository
from app.repositories.atendimento_repository import AnexoRepository, AtendimentoRepository
from app.schemas.atendimento import (
    AtendimentoResumo,
    AtendimentoSaida,
    InicioAtendimento,
    RegistroAtendimento,
)
from app.schemas.auth import UsuarioLogado
from app.services.excecoes import AcaoNaoPermitida, DadosInvalidos, RecursoNaoEncontrado
from app.services.notificacao_service import NotificacaoService

ATENDIMENTO_NAO_ENCONTRADO = "Atendimento não encontrado."
SEM_CADASTRO_VETERINARIO = "Seu login não está ligado a um cadastro de veterinário."
STATUS_AGENDAMENTO_ATENDIVEL = {"agendado", "confirmado"}
LIMITE_LISTAGEM = 100

VEZES_POR_EXTENSO = {"uma": 1, "duas": 2, "tres": 3, "quatro": 4, "seis": 6}


def sem_acentos(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def intervalo_em_horas(frequencia: str) -> int | None:
    texto = sem_acentos(frequencia.lower())
    em_horas = re.search(r"(\d+)\s*(?:h\b|hora)", texto)
    if em_horas and int(em_horas.group(1)) > 0:
        return int(em_horas.group(1))
    vezes = re.search(r"(\d+|uma|duas|tres|quatro|seis)\s*(?:x|vez|vezes)\s*(?:ao|por|no)\s*dia", texto)
    if vezes:
        quantidade = VEZES_POR_EXTENSO.get(vezes.group(1)) or int(vezes.group(1))
        return 24 // quantidade if 0 < quantidade <= 24 else None
    return None


class AtendimentoService:
    def __init__(
        self,
        atendimento_repository: AtendimentoRepository,
        anexo_repository: AnexoRepository,
        agendamento_repository: AgendamentoRepository,
        veterinario_repository: VeterinarioRepository,
        animal_repository: AnimalRepository,
        notificacao_service: NotificacaoService,
        fuso: ZoneInfo,
    ) -> None:
        self._atendimento_repository = atendimento_repository
        self._anexo_repository = anexo_repository
        self._agendamento_repository = agendamento_repository
        self._veterinario_repository = veterinario_repository
        self._animal_repository = animal_repository
        self._notificacao_service = notificacao_service
        self._fuso = fuso

    def iniciar(self, entrada: InicioAtendimento, usuario: UsuarioLogado, agora: datetime) -> AtendimentoSaida:
        veterinario_id = self._veterinario_do_usuario(usuario)
        if entrada.agendamento_id is None:
            animal = self._animal_repository.buscar_por_id(str(entrada.animal_id))
            if animal is None or not animal["ativo"]:
                raise DadosInvalidos({"animal_id": "Selecione um animal cadastrado."})
            return self._criar(None, animal["id"], entrada.tipo, veterinario_id, agora)

        agendamento_id = str(entrada.agendamento_id)
        existente = self._atendimento_repository.buscar_por_agendamento(agendamento_id)
        if existente:
            return self.obter(existente)
        agendamento = self._agendamento_repository.buscar_para_atendimento(agendamento_id)
        if agendamento is None:
            raise RecursoNaoEncontrado("Agendamento não encontrado.")
        if agendamento["veterinario_id"] != veterinario_id:
            raise AcaoNaoPermitida("Este agendamento é de outro veterinário.")
        if agendamento["status"] not in STATUS_AGENDAMENTO_ATENDIVEL:
            raise DadosInvalidos({"agendamento_id": "Este agendamento não pode mais ser atendido."})
        self._agendamento_repository.alterar_status(agendamento_id, "em_atendimento")
        return self._criar(agendamento_id, agendamento["animal_id"], agendamento["tipo"], veterinario_id, agora)

    def registrar(
        self,
        atendimento_id: str,
        entrada: RegistroAtendimento,
        usuario: UsuarioLogado,
        agora: datetime,
    ) -> AtendimentoSaida:
        atendimento = self.garantir_edicao(atendimento_id, usuario)
        data_atendimento = agora.astimezone(self._fuso).date()
        for vacina in entrada.vacinas:
            if vacina.proxima_dose_em and vacina.proxima_dose_em <= data_atendimento:
                raise DadosInvalidos({"vacinas": "A próxima dose deve ser depois da data de hoje."})

        dados = entrada.model_dump(exclude={"exames", "vacinas", "prescricao"})
        self._atendimento_repository.atualizar(atendimento_id, dados)
        self._atendimento_repository.substituir_exames(
            atendimento_id, [exame.model_dump() for exame in entrada.exames], agora
        )
        self._atendimento_repository.substituir_vacinas(
            atendimento_id,
            atendimento["animal_id"],
            data_atendimento,
            [vacina.model_dump() for vacina in entrada.vacinas],
        )
        self._atendimento_repository.substituir_prescricao(atendimento_id, self._prescricao_para_banco(entrada))
        return self.obter(atendimento_id)

    def finalizar(self, atendimento_id: str, usuario: UsuarioLogado, agora: datetime) -> AtendimentoSaida:
        atendimento = self.garantir_edicao(atendimento_id, usuario)
        self._atendimento_repository.atualizar(atendimento_id, {"status": "finalizado"})
        if atendimento["agendamento_id"]:
            self._agendamento_repository.alterar_status(atendimento["agendamento_id"], "concluido")
        if atendimento["peso_kg"]:
            self._atendimento_repository.atualizar_peso_animal(atendimento["animal_id"], atendimento["peso_kg"])
        self._notificacao_service.gerar_do_atendimento(atendimento_id, agora)
        return self.obter(atendimento_id)

    def obter(self, atendimento_id: str) -> AtendimentoSaida:
        linha = self._atendimento_repository.buscar(atendimento_id)
        if linha is None:
            raise RecursoNaoEncontrado(ATENDIMENTO_NAO_ENCONTRADO)
        return AtendimentoSaida(
            **linha,
            exames=self._atendimento_repository.listar_exames(atendimento_id),
            anexos=self._anexo_repository.listar(atendimento_id),
            vacinas=self._atendimento_repository.listar_vacinas(atendimento_id),
            prescricao=self._atendimento_repository.buscar_prescricao(atendimento_id),
        )

    def listar(
        self,
        animal_id: str | None,
        status: str | None,
        usuario: UsuarioLogado,
        apenas_meus: bool,
    ) -> list[AtendimentoResumo]:
        veterinario_id = self._veterinario_do_usuario(usuario) if apenas_meus else None
        linhas = self._atendimento_repository.listar(animal_id, veterinario_id, status, LIMITE_LISTAGEM)
        return [AtendimentoResumo(**linha) for linha in linhas]

    def _criar(
        self,
        agendamento_id: str | None,
        animal_id: str,
        tipo: str,
        veterinario_id: str,
        agora: datetime,
    ) -> AtendimentoSaida:
        atendimento_id = self._atendimento_repository.criar(
            {
                "agendamento_id": agendamento_id,
                "animal_id": animal_id,
                "veterinario_id": veterinario_id,
                "tipo": tipo,
                "realizado_em": agora,
            }
        )
        return self.obter(atendimento_id)

    def garantir_edicao(self, atendimento_id: str, usuario: UsuarioLogado) -> dict:
        atendimento = self._atendimento_repository.buscar_para_alteracao(atendimento_id)
        if atendimento is None:
            raise RecursoNaoEncontrado(ATENDIMENTO_NAO_ENCONTRADO)
        if atendimento["veterinario_id"] != self._veterinario_do_usuario(usuario):
            raise AcaoNaoPermitida("Só o veterinário responsável pode alterar este atendimento.")
        if atendimento["status"] != "em_andamento":
            raise AcaoNaoPermitida("Este atendimento já foi finalizado e não pode mais ser alterado.")
        return atendimento

    def _veterinario_do_usuario(self, usuario: UsuarioLogado) -> str:
        veterinario_id = self._veterinario_repository.buscar_id_por_perfil(usuario.id)
        if veterinario_id is None:
            raise AcaoNaoPermitida(SEM_CADASTRO_VETERINARIO)
        return veterinario_id

    def _prescricao_para_banco(self, entrada: RegistroAtendimento) -> dict | None:
        prescricao = entrada.prescricao
        if prescricao is None or (not prescricao.itens and not prescricao.orientacoes):
            return None
        return {
            "orientacoes": prescricao.orientacoes,
            "itens": [
                {**item.model_dump(), "intervalo_horas": intervalo_em_horas(item.frequencia)}
                for item in prescricao.itens
            ],
        }
