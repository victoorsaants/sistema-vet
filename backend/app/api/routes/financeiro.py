from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response

from app.api.dependencias import exigir_perfis, obter_agora, obter_financeiro_service, obter_fuso
from app.schemas.auth import PerfilUsuario, UsuarioLogado
from app.schemas.financeiro import (
    CategoriaSaida,
    ExtratoLancamentos,
    LancamentoDados,
    LancamentoEntrada,
    LancamentoSaida,
    Pagamento,
    ResumoFinanceiro,
    StatusLancamento,
    TipoLancamento,
)
from app.services.financeiro_service import FinanceiroService

somente_recepcao = exigir_perfis(PerfilUsuario.RECEPCAO)

router = APIRouter(prefix="/financeiro", tags=["financeiro"], dependencies=[Depends(somente_recepcao)])


def filtros_lancamentos(
    tipo: TipoLancamento | None = None,
    status_lancamento: StatusLancamento | None = Query(default=None, alias="status"),
    categoria_id: UUID | None = None,
    atendimento_id: UUID | None = None,
    de: date | None = None,
    ate: date | None = None,
    busca: str | None = Query(default=None, max_length=100),
) -> dict:
    return {
        "tipo": tipo,
        "status": status_lancamento,
        "categoria_id": str(categoria_id) if categoria_id else None,
        "atendimento_id": str(atendimento_id) if atendimento_id else None,
        "de": de,
        "ate": ate,
        "busca": (busca or "").strip() or None,
    }


@router.get("/categorias", response_model=list[CategoriaSaida])
def listar_categorias(
    tipo: TipoLancamento | None = None,
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
) -> list[CategoriaSaida]:
    return financeiro_service.listar_categorias(tipo)


@router.get("/resumo", response_model=ResumoFinanceiro)
def resumo_financeiro(
    mes: date | None = None,
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
    agora: datetime = Depends(obter_agora),
    fuso: ZoneInfo = Depends(obter_fuso),
) -> ResumoFinanceiro:
    return financeiro_service.resumo(mes or agora.astimezone(fuso).date())


@router.get("/lancamentos", response_model=ExtratoLancamentos)
def listar_lancamentos(
    filtros: dict = Depends(filtros_lancamentos),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
) -> ExtratoLancamentos:
    return financeiro_service.listar(filtros, pagina, tamanho)


@router.get("/relatorio")
def emitir_relatorio(
    filtros: dict = Depends(filtros_lancamentos),
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
) -> Response:
    periodo = "-".join(str(data) for data in (filtros["de"], filtros["ate"]) if data) or "completo"
    return Response(
        content=financeiro_service.relatorio_csv(filtros),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="relatorio-financeiro-{periodo}.csv"'},
    )


@router.post("/lancamentos", response_model=LancamentoSaida, status_code=status.HTTP_201_CREATED)
def criar_lancamento(
    entrada: LancamentoEntrada,
    usuario: UsuarioLogado = Depends(somente_recepcao),
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
    agora: datetime = Depends(obter_agora),
) -> LancamentoSaida:
    return financeiro_service.criar(entrada, usuario.id, agora)


@router.get("/lancamentos/{lancamento_id}", response_model=LancamentoSaida)
def obter_lancamento(
    lancamento_id: UUID,
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
) -> LancamentoSaida:
    return financeiro_service.obter(str(lancamento_id))


@router.put("/lancamentos/{lancamento_id}", response_model=LancamentoSaida)
def atualizar_lancamento(
    lancamento_id: UUID,
    entrada: LancamentoDados,
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
) -> LancamentoSaida:
    return financeiro_service.atualizar(str(lancamento_id), entrada)


@router.post("/lancamentos/{lancamento_id}/pagar", response_model=LancamentoSaida)
def pagar_lancamento(
    lancamento_id: UUID,
    pagamento: Pagamento,
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
    agora: datetime = Depends(obter_agora),
) -> LancamentoSaida:
    return financeiro_service.pagar(str(lancamento_id), pagamento, agora)


@router.post("/lancamentos/{lancamento_id}/cancelar", response_model=LancamentoSaida)
def cancelar_lancamento(
    lancamento_id: UUID,
    financeiro_service: FinanceiroService = Depends(obter_financeiro_service),
) -> LancamentoSaida:
    return financeiro_service.cancelar(str(lancamento_id))
