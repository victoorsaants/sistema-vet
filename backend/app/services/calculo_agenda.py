from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.schemas.agenda import DiaAgenda, HorarioAgenda


def dia_semana_banco(dia: date) -> int:
    return dia.isoweekday() % 7


def inicio_do_dia(dia: date, fuso: ZoneInfo) -> datetime:
    return datetime.combine(dia, time.min, tzinfo=fuso)


def horarios_da_faixa(dia: date, faixa: dict, fuso: ZoneInfo) -> list[tuple[datetime, datetime]]:
    duracao = timedelta(minutes=faixa["duracao_minutos"])
    atual = datetime.combine(dia, faixa["hora_inicio"], tzinfo=fuso)
    limite = datetime.combine(dia, faixa["hora_fim"], tzinfo=fuso)
    horarios = []
    while atual + duracao <= limite:
        horarios.append((atual, atual + duracao))
        atual += duracao
    return horarios


def sobrepoe(inicio: datetime, fim: datetime, periodos: list[dict]) -> bool:
    return any(periodo["inicio"] < fim and periodo["fim"] > inicio for periodo in periodos)


def montar_dias(
    primeiro_dia: date,
    quantidade_dias: int,
    faixas: list[dict],
    indisponiveis: list[dict],
    agora: datetime,
    fuso: ZoneInfo,
) -> list[DiaAgenda]:
    dias = []
    for deslocamento in range(quantidade_dias):
        dia = primeiro_dia + timedelta(days=deslocamento)
        faixas_do_dia = [faixa for faixa in faixas if faixa["dia_semana"] == dia_semana_banco(dia)]
        horarios = [
            HorarioAgenda(
                inicio=inicio,
                fim=fim,
                disponivel=inicio > agora and not sobrepoe(inicio, fim, indisponiveis),
            )
            for faixa in faixas_do_dia
            for inicio, fim in horarios_da_faixa(dia, faixa, fuso)
        ]
        horarios.sort(key=lambda horario: horario.inicio)
        dias.append(DiaAgenda(data=dia, atende=bool(faixas_do_dia), horarios=horarios))
    return dias


def encontrar_fim_do_horario(inicio: datetime, faixas: list[dict], fuso: ZoneInfo) -> datetime | None:
    inicio_local = inicio.astimezone(fuso)
    dia = inicio_local.date()
    for faixa in faixas:
        if faixa["dia_semana"] != dia_semana_banco(dia):
            continue
        for inicio_horario, fim_horario in horarios_da_faixa(dia, faixa, fuso):
            if inicio_horario == inicio_local:
                return fim_horario
    return None
