from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.repositories.agenda_repository import ExpedienteRepository, VeterinarioRepository
from app.schemas.agenda import Expediente, FaixaExpediente, Folga, FolgaEntrada, VeterinarioResumo
from app.services.calculo_agenda import inicio_do_dia
from app.services.excecoes import RecursoNaoEncontrado

VETERINARIO_NAO_ENCONTRADO = "Veterinário não encontrado."


class ExpedienteService:
    def __init__(
        self,
        veterinario_repository: VeterinarioRepository,
        expediente_repository: ExpedienteRepository,
        fuso: ZoneInfo,
    ) -> None:
        self._veterinario_repository = veterinario_repository
        self._expediente_repository = expediente_repository
        self._fuso = fuso

    def listar_veterinarios(self) -> list[VeterinarioResumo]:
        return [VeterinarioResumo(**linha) for linha in self._veterinario_repository.listar_ativos()]

    def obter_expediente(self, veterinario_id: str) -> Expediente:
        self._garantir_veterinario(veterinario_id)
        faixas = self._expediente_repository.listar_faixas(veterinario_id)
        return Expediente(faixas=[FaixaExpediente(**faixa) for faixa in faixas])

    def salvar_expediente(self, veterinario_id: str, expediente: Expediente) -> Expediente:
        self._garantir_veterinario(veterinario_id)
        self._expediente_repository.substituir_faixas(
            veterinario_id, [faixa.model_dump() for faixa in expediente.faixas]
        )
        return self.obter_expediente(veterinario_id)

    def listar_folgas(self, veterinario_id: str, agora: datetime) -> list[Folga]:
        self._garantir_veterinario(veterinario_id)
        return [self._para_folga(linha) for linha in self._expediente_repository.listar_bloqueios(veterinario_id, agora)]

    def criar_folga(self, veterinario_id: str, entrada: FolgaEntrada) -> Folga:
        self._garantir_veterinario(veterinario_id)
        linha = self._expediente_repository.criar_bloqueio(
            veterinario_id,
            inicio_do_dia(entrada.data_inicio, self._fuso),
            inicio_do_dia(entrada.data_fim + timedelta(days=1), self._fuso),
            entrada.motivo,
        )
        return self._para_folga(linha)

    def remover_folga(self, veterinario_id: str, folga_id: str) -> None:
        if not self._expediente_repository.remover_bloqueio(veterinario_id, folga_id):
            raise RecursoNaoEncontrado("Folga não encontrada.")

    def _garantir_veterinario(self, veterinario_id: str) -> None:
        if self._veterinario_repository.buscar_ativo(veterinario_id) is None:
            raise RecursoNaoEncontrado(VETERINARIO_NAO_ENCONTRADO)

    def _para_folga(self, linha: dict) -> Folga:
        ultimo_instante = linha["fim"] - timedelta(microseconds=1)
        return Folga(
            id=linha["id"],
            data_inicio=linha["inicio"].astimezone(self._fuso).date(),
            data_fim=ultimo_instante.astimezone(self._fuso).date(),
            motivo=linha["motivo"],
        )
