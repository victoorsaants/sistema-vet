from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.repositories.agenda_repository import (
    AgendamentoRepository,
    ExpedienteRepository,
    VeterinarioRepository,
)
from app.repositories.animal_repository import AnimalRepository
from app.schemas.agenda import AgendamentoEntrada, AgendamentoSaida, DiaAgenda
from app.services.calculo_agenda import encontrar_fim_do_horario, inicio_do_dia, montar_dias, sobrepoe
from app.services.excecoes import ConflitoDados, DadosInvalidos, RecursoNaoEncontrado
from app.services.notificacao_service import NotificacaoService

AGENDAMENTO_NAO_ENCONTRADO = "Agendamento não encontrado."
LIMITE_LISTAGEM = 200

STATUS_QUE_ENCERRAM = {"cancelado", "faltou"}

TRANSICOES_PERMITIDAS = {
    "agendado": {"confirmado", "cancelado", "faltou"},
    "confirmado": {"cancelado", "faltou"},
}


class AgendamentoService:
    def __init__(
        self,
        agendamento_repository: AgendamentoRepository,
        expediente_repository: ExpedienteRepository,
        veterinario_repository: VeterinarioRepository,
        animal_repository: AnimalRepository,
        notificacao_service: NotificacaoService,
        fuso: ZoneInfo,
    ) -> None:
        self._agendamento_repository = agendamento_repository
        self._expediente_repository = expediente_repository
        self._veterinario_repository = veterinario_repository
        self._animal_repository = animal_repository
        self._notificacao_service = notificacao_service
        self._fuso = fuso

    def montar_agenda(
        self, veterinario_id: str, primeiro_dia: date, quantidade_dias: int, agora: datetime
    ) -> list[DiaAgenda]:
        self._garantir_veterinario(veterinario_id)
        inicio = inicio_do_dia(primeiro_dia, self._fuso)
        fim = inicio_do_dia(primeiro_dia + timedelta(days=quantidade_dias), self._fuso)
        indisponiveis = self._indisponiveis(veterinario_id, inicio, fim)
        faixas = self._expediente_repository.listar_faixas(veterinario_id)
        return montar_dias(primeiro_dia, quantidade_dias, faixas, indisponiveis, agora, self._fuso)

    def agendar(self, entrada: AgendamentoEntrada, criado_por: str, agora: datetime) -> AgendamentoSaida:
        veterinario_id = str(entrada.veterinario_id)
        self._garantir_veterinario(veterinario_id)
        animal = self._animal_repository.buscar_por_id(str(entrada.animal_id))
        if animal is None or not animal["ativo"]:
            raise DadosInvalidos({"animal_id": "Selecione um animal cadastrado."})
        if entrada.inicio <= agora:
            raise DadosInvalidos({"inicio": "Escolha um horário futuro."})

        faixas = self._expediente_repository.listar_faixas(veterinario_id)
        fim = encontrar_fim_do_horario(entrada.inicio, faixas, self._fuso)
        if fim is None:
            raise DadosInvalidos({"inicio": "Escolha um dos horários da agenda do veterinário."})
        if sobrepoe(entrada.inicio, fim, self._indisponiveis(veterinario_id, entrada.inicio, fim)):
            raise ConflitoDados("Este horário não está mais disponível. Escolha outro horário.")

        agendamento_id = self._agendamento_repository.criar(
            {
                "animal_id": str(entrada.animal_id),
                "veterinario_id": veterinario_id,
                "tipo": entrada.tipo,
                "especialidade": entrada.especialidade,
                "inicio": entrada.inicio,
                "fim": fim,
                "observacoes": entrada.observacoes,
                "criado_por": criado_por,
            }
        )
        self._notificacao_service.agendar_lembrete_consulta(agendamento_id, agora)
        return self.obter(agendamento_id)

    def obter(self, agendamento_id: str) -> AgendamentoSaida:
        linha = self._agendamento_repository.buscar_por_id(agendamento_id)
        if linha is None:
            raise RecursoNaoEncontrado(AGENDAMENTO_NAO_ENCONTRADO)
        return AgendamentoSaida(**linha)

    def listar(
        self,
        de: datetime,
        ate: datetime | None,
        veterinario_id: str | None,
        status: list[str] | None,
    ) -> list[AgendamentoSaida]:
        linhas = self._agendamento_repository.listar(de, ate, veterinario_id, status, LIMITE_LISTAGEM)
        return [AgendamentoSaida(**linha) for linha in linhas]

    def veterinario_do_usuario(self, usuario_id: str) -> str | None:
        return self._veterinario_repository.buscar_id_por_perfil(usuario_id)

    def alterar_status(self, agendamento_id: str, novo_status: str) -> AgendamentoSaida:
        status_atual = self._agendamento_repository.buscar_status(agendamento_id)
        if status_atual is None:
            raise RecursoNaoEncontrado(AGENDAMENTO_NAO_ENCONTRADO)
        if novo_status not in TRANSICOES_PERMITIDAS.get(status_atual, set()):
            raise DadosInvalidos({"status": f"Não é possível mudar um agendamento {status_atual} para {novo_status}."})
        self._agendamento_repository.alterar_status(agendamento_id, novo_status)
        if novo_status in STATUS_QUE_ENCERRAM:
            self._notificacao_service.cancelar_do_agendamento(agendamento_id)
        return self.obter(agendamento_id)

    def _indisponiveis(self, veterinario_id: str, inicio: datetime, fim: datetime) -> list[dict]:
        return self._agendamento_repository.ocupados_no_periodo(
            veterinario_id, inicio, fim
        ) + self._expediente_repository.bloqueios_no_periodo(veterinario_id, inicio, fim)

    def _garantir_veterinario(self, veterinario_id: str) -> None:
        if self._veterinario_repository.buscar_ativo(veterinario_id) is None:
            raise RecursoNaoEncontrado("Veterinário não encontrado.")
