from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import pytest
from pydantic import ValidationError

from app.schemas.agenda import Expediente, FolgaEntrada
from app.services.calculo_agenda import dia_semana_banco, encontrar_fim_do_horario, montar_dias

FUSO = ZoneInfo("America/Maceio")
SEGUNDA = date(2026, 10, 19)
MANHA_SEGUNDA = {"dia_semana": 1, "hora_inicio": time(8), "hora_fim": time(10), "duracao_minutos": 30}
TARDE_SEGUNDA = {"dia_semana": 1, "hora_inicio": time(14), "hora_fim": time(15), "duracao_minutos": 60}
ANTES_DE_TUDO = datetime(2026, 10, 1, tzinfo=FUSO)


def em(dia: date, hora: int, minuto: int = 0) -> datetime:
    return datetime(dia.year, dia.month, dia.day, hora, minuto, tzinfo=FUSO)


def horarios_livres(dia) -> list[str]:
    return [h.inicio.astimezone(FUSO).strftime("%H:%M") for h in dia.horarios if h.disponivel]


def test_domingo_e_zero_e_sabado_e_seis() -> None:
    assert dia_semana_banco(date(2026, 10, 18)) == 0
    assert dia_semana_banco(date(2026, 10, 24)) == 6


def test_monta_horarios_das_faixas_do_dia() -> None:
    dias = montar_dias(SEGUNDA, 2, [TARDE_SEGUNDA, MANHA_SEGUNDA], [], ANTES_DE_TUDO, FUSO)

    assert dias[0].atende
    assert horarios_livres(dias[0]) == ["08:00", "08:30", "09:00", "09:30", "14:00"]
    assert not dias[1].atende
    assert dias[1].horarios == []


def test_horario_ocupado_ou_em_folga_fica_indisponivel() -> None:
    ocupados = [
        {"inicio": em(SEGUNDA, 8, 30), "fim": em(SEGUNDA, 9, 0)},
        {"inicio": em(SEGUNDA, 13, 0), "fim": em(SEGUNDA, 18, 0)},
    ]

    dia = montar_dias(SEGUNDA, 1, [MANHA_SEGUNDA, TARDE_SEGUNDA], ocupados, ANTES_DE_TUDO, FUSO)[0]

    assert horarios_livres(dia) == ["08:00", "09:00", "09:30"]
    assert len(dia.horarios) == 5


def test_horarios_que_ja_passaram_ficam_indisponiveis() -> None:
    agora = em(SEGUNDA, 9, 10)

    dia = montar_dias(SEGUNDA, 1, [MANHA_SEGUNDA], [], agora, FUSO)[0]

    assert horarios_livres(dia) == ["09:30"]


def test_encontra_fim_so_para_horario_da_grade() -> None:
    assert encontrar_fim_do_horario(em(SEGUNDA, 9, 30), [MANHA_SEGUNDA], FUSO) == em(SEGUNDA, 10, 0)
    assert encontrar_fim_do_horario(em(SEGUNDA, 9, 15), [MANHA_SEGUNDA], FUSO) is None
    assert encontrar_fim_do_horario(em(SEGUNDA, 10, 0), [MANHA_SEGUNDA], FUSO) is None


def test_encontra_fim_com_horario_em_outro_fuso() -> None:
    inicio_utc = em(SEGUNDA, 8, 0).astimezone(ZoneInfo("UTC"))

    assert encontrar_fim_do_horario(inicio_utc, [MANHA_SEGUNDA], FUSO) == em(SEGUNDA, 8, 30)


def test_expediente_recusa_faixas_sobrepostas() -> None:
    with pytest.raises(ValidationError, match="se sobrepõem na segunda"):
        Expediente(faixas=[MANHA_SEGUNDA, {**MANHA_SEGUNDA, "hora_inicio": time(9), "hora_fim": time(11)}])


def test_expediente_recusa_faixa_invertida() -> None:
    with pytest.raises(ValidationError, match="horário final deve ser depois"):
        Expediente(faixas=[{**MANHA_SEGUNDA, "hora_inicio": time(10), "hora_fim": time(8)}])


def test_folga_recusa_periodo_invertido() -> None:
    with pytest.raises(ValidationError, match="data final"):
        FolgaEntrada(data_inicio=date(2026, 10, 20), data_fim=date(2026, 10, 19))
