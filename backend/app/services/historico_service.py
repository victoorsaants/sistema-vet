from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.repositories.atendimento_repository import HistoricoRepository
from app.schemas.atendimento import (
    EventoHistorico,
    HistoricoClinico,
    ReferenciaAtendimento,
    ResumoHistorico,
)
from app.services.excecoes import RecursoNaoEncontrado

NOMES_TIPO = {
    "consulta": "Consulta",
    "retorno": "Retorno",
    "vacinacao": "Vacinação",
    "exame": "Exame",
    "procedimento": "Procedimento",
}
TIPOS_DE_CONSULTA = {"consulta", "retorno"}


def formatar_data(dia: date) -> str:
    return dia.strftime("%d/%m/%Y")


def juntar(partes: list[str | None], separador: str = " ") -> str | None:
    texto = separador.join(parte for parte in partes if parte)
    return texto or None


class HistoricoService:
    def __init__(self, historico_repository: HistoricoRepository, fuso: ZoneInfo) -> None:
        self._historico_repository = historico_repository
        self._fuso = fuso

    def montar(
        self,
        animal_id: str,
        tipo_evento: str | None,
        de: date | None,
        ate: date | None,
        pagina: int,
        tamanho: int,
        agora: datetime,
    ) -> HistoricoClinico:
        cadastro = self._historico_repository.buscar_animal(animal_id)
        if cadastro is None:
            raise RecursoNaoEncontrado("Animal não encontrado.")

        atendimentos = self._historico_repository.atendimentos(animal_id)
        exames = self._historico_repository.exames(animal_id)
        vacinas = self._historico_repository.vacinas(animal_id)
        prescricoes = self._historico_repository.prescricoes(animal_id)

        eventos = (
            [self._evento_atendimento(linha) for linha in atendimentos]
            + [self._evento_exame(linha) for linha in exames]
            + [self._evento_vacina(linha) for linha in vacinas]
            + [self._evento_prescricao(linha) for linha in prescricoes]
        )
        eventos = [evento for evento in eventos if self._no_filtro(evento, tipo_evento, de, ate)]
        eventos.sort(key=lambda evento: evento.data, reverse=True)
        inicio = (pagina - 1) * tamanho

        return HistoricoClinico(
            animal=cadastro["animal"],
            tutor=cadastro["tutor"],
            resumo=ResumoHistorico(
                consultas=sum(1 for linha in atendimentos if linha["tipo"] in TIPOS_DE_CONSULTA),
                exames=len(exames),
                vacinas=len(vacinas),
                tratamentos=len(prescricoes),
            ),
            ultimo_atendimento=self._ultimo_atendimento(atendimentos),
            proximo_agendamento=self._historico_repository.proximo_agendamento(animal_id, agora),
            eventos=eventos[inicio : inicio + tamanho],
            total_eventos=len(eventos),
            pagina=pagina,
            tamanho=tamanho,
        )

    def _no_filtro(self, evento: EventoHistorico, tipo: str | None, de: date | None, ate: date | None) -> bool:
        dia = evento.data.astimezone(self._fuso).date()
        return (tipo is None or evento.tipo == tipo) and (de is None or dia >= de) and (ate is None or dia <= ate)

    def _ultimo_atendimento(self, atendimentos: list[dict]) -> ReferenciaAtendimento | None:
        finalizados = [linha for linha in atendimentos if linha["status"] == "finalizado"]
        if not finalizados:
            return None
        ultimo = max(finalizados, key=lambda linha: linha["realizado_em"])
        return ReferenciaAtendimento(
            id=ultimo["id"], data=ultimo["realizado_em"], tipo=ultimo["tipo"], veterinario=ultimo["veterinario"]
        )

    def _evento_atendimento(self, linha: dict) -> EventoHistorico:
        titulo = NOMES_TIPO[linha["tipo"]]
        if linha["status"] == "em_andamento":
            titulo = f"{titulo} (em andamento)"
        retorno = f"Retorno em {formatar_data(linha['retorno_em'])}." if linha["retorno_em"] else None
        return EventoHistorico(
            tipo="atendimento",
            data=linha["realizado_em"],
            titulo=titulo,
            descricao=juntar([linha["diagnostico"] or linha["observacoes"] or linha["condicao_geral"], retorno]),
            veterinario=linha["veterinario"],
            atendimento_id=linha["id"],
        )

    def _evento_exame(self, linha: dict) -> EventoHistorico:
        return EventoHistorico(
            tipo="exame",
            data=linha["data"],
            titulo=f"Exame: {linha['nome']}",
            descricao=linha["resultado"] or "Aguardando resultado.",
            veterinario=linha["veterinario"],
            atendimento_id=linha["atendimento_id"],
        )

    def _evento_vacina(self, linha: dict) -> EventoHistorico:
        data = linha["realizado_em"] or datetime.combine(linha["aplicada_em"], time(12), tzinfo=self._fuso)
        proxima = f"Próxima dose em {formatar_data(linha['proxima_dose_em'])}" if linha["proxima_dose_em"] else None
        lote = f"Lote {linha['lote']}" if linha["lote"] else None
        return EventoHistorico(
            tipo="vacina",
            data=data,
            titulo=f"Vacina {linha['vacina']}",
            descricao=juntar([linha["dose"], lote, proxima], " · "),
            veterinario=linha["veterinario"],
            atendimento_id=linha["atendimento_id"],
        )

    def _evento_prescricao(self, linha: dict) -> EventoHistorico:
        medicamentos = ", ".join(linha["medicamentos"]) or None
        return EventoHistorico(
            tipo="prescricao",
            data=linha["realizado_em"],
            titulo="Prescrição",
            descricao=juntar([f"{medicamentos}." if medicamentos else None, linha["orientacoes"]]),
            veterinario=linha["veterinario"],
            atendimento_id=linha["atendimento_id"],
        )
