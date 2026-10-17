from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.repositories.enviador_email import Email, EnviadorEmail
from app.repositories.notificacao_repository import NotificacaoRepository
from app.schemas.comum import Pagina
from app.schemas.notificacao import NotificacaoSaida, ResultadoEnvio, ResumoNotificacoes
from app.services.excecoes import DadosInvalidos, RecursoNaoEncontrado
from app.services.mensagens_tutor import DoseLembrete, Mensagem, RedatorMensagens

NOTIFICACAO_NAO_ENCONTRADA = "Notificação não encontrada."
SEM_EMAIL = "Tutor sem e-mail cadastrado."
HORA_DOS_LEMBRETES = time(9, 0)
DIAS_ANTES_RETORNO = 1
DIAS_ANTES_VACINA = 3
HORAS_ANTES_AGENDAMENTO = 24
MAXIMO_LEMBRETES_MEDICAMENTO = 90
MAXIMO_TENTATIVAS = 3
MINUTOS_ENTRE_TENTATIVAS = 5
TAMANHO_MAXIMO_ERRO = 500
STATUS_REENVIAVEIS = {"enviada", "falhou", "cancelada"}


def inicio_do_tratamento(agora: datetime, fuso: ZoneInfo) -> datetime:
    proxima_hora = agora.astimezone(fuso) + timedelta(hours=1)
    return proxima_hora.replace(minute=0, second=0, microsecond=0)


def horarios_das_doses(
    inicio: datetime, itens: list[dict], limite: int
) -> list[tuple[datetime, list[DoseLembrete]]]:
    agrupadas: dict[datetime, list[DoseLembrete]] = {}
    for item in itens:
        intervalo, dias = item.get("intervalo_horas"), item.get("duracao_dias")
        if not intervalo or not dias:
            continue
        total = max(1, dias * 24 // intervalo)
        for numero in range(1, total + 1):
            horario = inicio + timedelta(hours=intervalo * (numero - 1))
            agrupadas.setdefault(horario, []).append(
                DoseLembrete(item["medicamento"], item["dose"], numero, total)
            )
    return sorted(agrupadas.items())[:limite]


def horario_do_lembrete(data_alvo: date, dias_antes: int, agora: datetime, fuso: ZoneInfo) -> datetime | None:
    if data_alvo <= agora.astimezone(fuso).date():
        return None
    horario = datetime.combine(data_alvo - timedelta(days=dias_antes), HORA_DOS_LEMBRETES, tzinfo=fuso)
    return max(horario, agora)


class NotificacaoService:
    def __init__(self, notificacao_repository: NotificacaoRepository, redator: RedatorMensagens, fuso: ZoneInfo) -> None:
        self._notificacao_repository = notificacao_repository
        self._redator = redator
        self._fuso = fuso

    def gerar_do_atendimento(self, atendimento_id: str, agora: datetime) -> None:
        dados = self._notificacao_repository.dados_do_atendimento(atendimento_id)
        if dados is None:
            raise RecursoNaoEncontrado("Atendimento não encontrado.")
        base = {"tutor_id": dados["tutor_id"], "animal_id": dados["animal_id"], "atendimento_id": atendimento_id}
        novas = []

        prescricao = self._notificacao_repository.prescricao_do_atendimento(atendimento_id)
        if prescricao:
            doses = horarios_das_doses(
                inicio_do_tratamento(agora, self._fuso), prescricao["itens"], MAXIMO_LEMBRETES_MEDICAMENTO
            )
            receita = self._redator.receita(
                dados, prescricao["itens"], prescricao["orientacoes"], doses[0][0] if doses else None
            )
            com_prescricao = {**base, "prescricao_id": prescricao["id"]}
            novas.append(self._nova(com_prescricao, "prescricao", receita, agora))
            novas.extend(
                self._nova(com_prescricao, "lembrete_medicamento", self._redator.lembrete_medicamento(dados, lote), horario)
                for horario, lote in doses
            )

        if dados["retorno_em"]:
            horario = horario_do_lembrete(dados["retorno_em"], DIAS_ANTES_RETORNO, agora, self._fuso)
            if horario:
                novas.append(self._nova(base, "lembrete_retorno", self._redator.lembrete_retorno(dados), horario))

        for vacina in self._notificacao_repository.vacinas_com_proxima_dose(atendimento_id):
            horario = horario_do_lembrete(vacina["proxima_dose_em"], DIAS_ANTES_VACINA, agora, self._fuso)
            if horario:
                mensagem = self._redator.lembrete_vacina(dados, vacina["vacina"], vacina["proxima_dose_em"])
                novas.append(self._nova(base, "lembrete_vacina", mensagem, horario))

        self._notificacao_repository.criar(novas)

    def agendar_lembrete_consulta(self, agendamento_id: str, agora: datetime) -> None:
        dados = self._notificacao_repository.dados_do_agendamento(agendamento_id)
        if dados is None:
            raise RecursoNaoEncontrado("Agendamento não encontrado.")
        horario = max(agora, dados["inicio"] - timedelta(hours=HORAS_ANTES_AGENDAMENTO))
        base = {"tutor_id": dados["tutor_id"], "animal_id": dados["animal_id"], "agendamento_id": agendamento_id}
        mensagem = self._redator.lembrete_agendamento(dados)
        self._notificacao_repository.criar([self._nova(base, "confirmacao_agendamento", mensagem, horario)])

    def cancelar_do_agendamento(self, agendamento_id: str) -> None:
        self._notificacao_repository.cancelar_pendentes_do_agendamento(agendamento_id)

    def listar(self, filtros: dict, pagina: int, tamanho: int) -> Pagina[NotificacaoSaida]:
        linhas, total = self._notificacao_repository.listar(filtros, (pagina - 1) * tamanho, tamanho)
        itens = [NotificacaoSaida(**linha) for linha in linhas]
        return Pagina(itens=itens, total=total, pagina=pagina, tamanho=tamanho)

    def obter(self, notificacao_id: str) -> NotificacaoSaida:
        linha = self._notificacao_repository.buscar(notificacao_id)
        if linha is None:
            raise RecursoNaoEncontrado(NOTIFICACAO_NAO_ENCONTRADA)
        return NotificacaoSaida(**linha)

    def resumo(self, agora: datetime) -> ResumoNotificacoes:
        return ResumoNotificacoes(**self._notificacao_repository.contar_por_status(agora))

    def reenviar(self, notificacao_id: str, agora: datetime) -> NotificacaoSaida:
        status = self._status_para_alteracao(notificacao_id)
        if status not in STATUS_REENVIAVEIS:
            raise DadosInvalidos({"status": "Esta notificação já está na fila de envio."})
        self._notificacao_repository.atualizar(
            notificacao_id,
            {"status": "pendente", "agendada_para": agora, "enviada_em": None, "erro": None, "tentativas": 0},
        )
        return self.obter(notificacao_id)

    def cancelar(self, notificacao_id: str) -> NotificacaoSaida:
        if self._status_para_alteracao(notificacao_id) != "pendente":
            raise DadosInvalidos({"status": "Só é possível cancelar notificações que ainda não foram enviadas."})
        self._notificacao_repository.atualizar(notificacao_id, {"status": "cancelada"})
        return self.obter(notificacao_id)

    def enviar_proxima(self, enviador: EnviadorEmail, agora: datetime) -> bool | None:
        notificacao = self._notificacao_repository.proxima_para_envio(agora)
        if notificacao is None:
            return None
        if not notificacao["email"]:
            self._notificacao_repository.atualizar(notificacao["id"], {"status": "falhou", "erro": SEM_EMAIL})
            return False

        tentativas = notificacao["tentativas"] + 1
        email = Email(
            destinatario=notificacao["email"],
            assunto=notificacao["assunto"],
            texto=notificacao["mensagem"],
            html=self._redator.html(notificacao["assunto"], notificacao["mensagem"]),
        )
        try:
            enviador.enviar(email)
        except Exception as erro:
            falhou = tentativas >= MAXIMO_TENTATIVAS
            self._notificacao_repository.atualizar(
                notificacao["id"],
                {
                    "status": "falhou" if falhou else "pendente",
                    "agendada_para": agora + timedelta(minutes=MINUTOS_ENTRE_TENTATIVAS * tentativas),
                    "tentativas": tentativas,
                    "erro": f"Falha no envio: {erro}"[:TAMANHO_MAXIMO_ERRO],
                },
            )
            return False

        self._notificacao_repository.atualizar(
            notificacao["id"],
            {
                "status": "enviada",
                "enviada_em": agora,
                "destinatario": notificacao["email"],
                "tentativas": tentativas,
                "erro": None,
            },
        )
        return True

    def enviar_pendentes(self, enviador: EnviadorEmail, agora: datetime, limite: int) -> ResultadoEnvio:
        enviadas = com_falha = 0
        for _ in range(limite):
            resultado = self.enviar_proxima(enviador, agora)
            if resultado is None:
                break
            if resultado:
                enviadas += 1
            else:
                com_falha += 1
        return ResultadoEnvio(enviadas=enviadas, com_falha=com_falha)

    def _status_para_alteracao(self, notificacao_id: str) -> str:
        status = self._notificacao_repository.buscar_status(notificacao_id)
        if status is None:
            raise RecursoNaoEncontrado(NOTIFICACAO_NAO_ENCONTRADA)
        return status

    def _nova(self, base: dict, tipo: str, mensagem: Mensagem, horario: datetime) -> dict:
        return {
            **base,
            "tipo": tipo,
            "canal": "email",
            "assunto": mensagem.assunto,
            "mensagem": mensagem.texto,
            "agendada_para": horario,
        }
