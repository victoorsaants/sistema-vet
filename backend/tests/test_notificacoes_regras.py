from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.services.mensagens_tutor import RedatorMensagens
from app.services.notificacao_service import horario_do_lembrete, horarios_das_doses, inicio_do_tratamento

FUSO = ZoneInfo("America/Maceio")
AGORA = datetime(2030, 1, 7, 14, 20, tzinfo=FUSO)
REDATOR = RedatorMensagens("AjuVet+ Clínica Veterinária", "(79) 3333-4444", FUSO)

DADOS = {
    "tutor_nome": "Carlos Eduardo Silva",
    "animal_nome": "Mel",
    "animal_sexo": "femea",
    "veterinario_nome": "Dra. Mariana Costa",
    "veterinario_crmv": "SE-1234",
    "realizado_em": AGORA,
    "retorno_em": date(2030, 1, 14),
}


def item(medicamento: str, intervalo: int | None, dias: int | None) -> dict:
    return {
        "medicamento": medicamento,
        "dose": "1 comprimido",
        "frequencia": f"a cada {intervalo} horas",
        "intervalo_horas": intervalo,
        "duracao_dias": dias,
        "via": "oral",
        "observacoes": None,
    }


def test_tratamento_comeca_na_hora_cheia_seguinte() -> None:
    assert inicio_do_tratamento(AGORA, FUSO) == datetime(2030, 1, 7, 15, tzinfo=FUSO)


def test_doses_do_mesmo_horario_viram_um_lembrete() -> None:
    inicio = datetime(2030, 1, 7, 15, tzinfo=FUSO)

    doses = horarios_das_doses(
        inicio, [item("Amoxicilina", 12, 2), item("Dipirona", 6, 1), item("Uso contínuo", 24, None)], 90
    )

    assert [horario.hour for horario, _ in doses] == [15, 21, 3, 9, 15, 3]
    primeiro_horario, primeiro_lote = doses[0]
    assert primeiro_horario == inicio
    assert [(dose.medicamento, dose.numero, dose.total) for dose in primeiro_lote] == [
        ("Amoxicilina", 1, 4),
        ("Dipirona", 1, 4),
    ]
    assert [(dose.medicamento, dose.numero) for dose in doses[-1][1]] == [("Amoxicilina", 4)]


def test_lembretes_de_medicamento_tem_limite() -> None:
    doses = horarios_das_doses(AGORA, [item("Insulina", 1, 30)], 90)

    assert len(doses) == 90


def test_lembrete_sai_as_nove_da_vespera_ou_na_hora_se_ja_passou() -> None:
    assert horario_do_lembrete(date(2030, 1, 14), 1, AGORA, FUSO) == datetime(2030, 1, 13, 9, tzinfo=FUSO)
    assert horario_do_lembrete(date(2030, 1, 8), 3, AGORA, FUSO) == AGORA
    assert horario_do_lembrete(date(2030, 1, 7), 1, AGORA, FUSO) is None


def test_receita_lista_medicamentos_orientacoes_e_lembretes() -> None:
    mensagem = REDATOR.receita(
        DADOS, [item("Amoxicilina 250 mg", 12, 7)], "Repouso relativo.", datetime(2030, 1, 7, 15, tzinfo=FUSO)
    )

    assert mensagem.assunto == "Receita da Mel"
    assert "Olá, Carlos!" in mensagem.texto
    assert "Dra. Mariana Costa (CRMV SE-1234) no atendimento de 07/01/2030" in mensagem.texto
    assert "- Amoxicilina 250 mg: 1 comprimido, a cada 12 horas, por 7 dias (via oral)" in mensagem.texto
    assert "Orientações:\nRepouso relativo." in mensagem.texto
    assert "a partir de 07/01/2030 às 15:00" in mensagem.texto
    assert "Retorno recomendado: 14/01/2030." in mensagem.texto
    assert "fale com a clínica: (79) 3333-4444" in mensagem.texto


def test_crmv_ja_identificado_nao_e_repetido() -> None:
    mensagem = REDATOR.receita({**DADOS, "veterinario_crmv": "CRMV-SE 0001"}, [], "Repouso.", None)

    assert "Dra. Mariana Costa (CRMV-SE 0001)" in mensagem.texto
    assert "lembretes" not in mensagem.texto


def test_lembrete_de_consulta_usa_o_fuso_da_clinica() -> None:
    dados = {**DADOS, "animal_nome": "Thor", "animal_sexo": "macho", "tipo": "retorno",
             "inicio": datetime(2030, 1, 9, 12, 30, tzinfo=ZoneInfo("UTC"))}

    mensagem = REDATOR.lembrete_agendamento(dados)

    assert mensagem.assunto == "Lembrete: retorno do Thor em 09/01/2030 às 09:30"
    assert "o Thor tem retorno marcado para quarta-feira, 09/01/2030, às 09:30" in mensagem.texto


def test_html_escapa_o_texto() -> None:
    html = REDATOR.html("Receita <b>", "Linha 1\nLinha <2>\n\nOutro parágrafo")

    assert "Receita &lt;b&gt;" in html
    assert "Linha 1<br>Linha &lt;2&gt;</p>" in html
    assert html.count("<p ") == 2
