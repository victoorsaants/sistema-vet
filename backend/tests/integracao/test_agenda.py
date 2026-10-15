from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import pytest
from psycopg import Connection

from app.repositories.agenda_repository import (
    AgendamentoRepository,
    ExpedienteRepository,
    VeterinarioRepository,
)
from app.repositories.animal_repository import AnimalRepository
from app.repositories.notificacao_repository import NotificacaoRepository
from app.schemas.agenda import AgendamentoEntrada, Expediente, FolgaEntrada
from app.services.agendamento_service import AgendamentoService
from app.services.excecoes import ConflitoDados, DadosInvalidos
from app.services.expediente_service import ExpedienteService
from app.services.mensagens_tutor import RedatorMensagens
from app.services.notificacao_service import NotificacaoService

FUSO = ZoneInfo("America/Maceio")
SEGUNDA = date(2030, 1, 7)
AGORA = datetime(2030, 1, 1, 12, tzinfo=FUSO)


def em(dia: date, hora: int, minuto: int = 0) -> datetime:
    return datetime(dia.year, dia.month, dia.day, hora, minuto, tzinfo=FUSO)


@pytest.fixture
def cenario(conexao: Connection) -> dict:
    veterinario_id = conexao.execute(
        "insert into veterinarios (nome, crmv) values ('Dra. Mariana Costa', 'CRMV-TESTE 1') returning id"
    ).fetchone()["id"]
    tutor_id = conexao.execute(
        """
        insert into tutores (nome, cpf, telefone_principal, endereco, cidade, estado, cep)
        values ('Carlos Eduardo Silva', '52998224725', '79988881234', 'Rua A', 'Aracaju', 'SE', '49037000')
        returning id
        """
    ).fetchone()["id"]
    animal_id = conexao.execute(
        "insert into animais (tutor_id, nome, especie, peso_kg) values (%s, 'Thor', 'Cão', 32.5) returning id",
        (tutor_id,),
    ).fetchone()["id"]
    expediente = ExpedienteService(VeterinarioRepository(conexao), ExpedienteRepository(conexao), FUSO)
    expediente.salvar_expediente(
        veterinario_id,
        Expediente(
            faixas=[
                {"dia_semana": 1, "hora_inicio": time(8), "hora_fim": time(10), "duracao_minutos": 30},
                {"dia_semana": 2, "hora_inicio": time(14), "hora_fim": time(16), "duracao_minutos": 60},
            ]
        ),
    )
    agendamentos = AgendamentoService(
        AgendamentoRepository(conexao),
        ExpedienteRepository(conexao),
        VeterinarioRepository(conexao),
        AnimalRepository(conexao),
        NotificacaoService(NotificacaoRepository(conexao), RedatorMensagens("AjuVet+", "", FUSO), FUSO),
        FUSO,
    )
    return {
        "veterinario_id": veterinario_id,
        "animal_id": animal_id,
        "expediente": expediente,
        "agendamentos": agendamentos,
    }


def agendar(cenario: dict, inicio: datetime):
    entrada = AgendamentoEntrada(
        animal_id=cenario["animal_id"],
        veterinario_id=cenario["veterinario_id"],
        tipo="consulta",
        inicio=inicio,
    )
    return cenario["agendamentos"].agendar(entrada, criado_por=None, agora=AGORA)


def livres(cenario: dict, dia: date) -> list[str]:
    agenda = cenario["agendamentos"].montar_agenda(cenario["veterinario_id"], dia, 1, AGORA)[0]
    return [h.inicio.astimezone(FUSO).strftime("%H:%M") for h in agenda.horarios if h.disponivel]


def test_expediente_salvo_e_relido(cenario: dict) -> None:
    expediente = cenario["expediente"].obter_expediente(cenario["veterinario_id"])

    assert [(f.dia_semana, f.hora_inicio, f.duracao_minutos) for f in expediente.faixas] == [
        (1, time(8), 30),
        (2, time(14), 60),
    ]


def test_agendar_ocupa_o_horario_e_cancelar_libera(cenario: dict) -> None:
    agendamento = agendar(cenario, em(SEGUNDA, 8, 30))

    assert agendamento.fim.astimezone(FUSO) == em(SEGUNDA, 9, 0)
    assert agendamento.animal.nome == "Thor"
    assert agendamento.tutor.nome == "Carlos Eduardo Silva"
    assert livres(cenario, SEGUNDA) == ["08:00", "09:00", "09:30"]

    cenario["agendamentos"].alterar_status(agendamento.id, "cancelado")

    assert livres(cenario, SEGUNDA) == ["08:00", "08:30", "09:00", "09:30"]


def test_nao_agenda_horario_ocupado(cenario: dict) -> None:
    agendar(cenario, em(SEGUNDA, 8, 30))

    with pytest.raises(ConflitoDados):
        agendar(cenario, em(SEGUNDA, 8, 30))


def test_banco_barra_conflito_mesmo_sem_a_checagem_do_servico(cenario: dict, conexao: Connection) -> None:
    agendar(cenario, em(SEGUNDA, 8, 30))
    repositorio = AgendamentoRepository(conexao)

    with pytest.raises(ConflitoDados, match="acabou de ser ocupado"), conexao.transaction():
        repositorio.criar(
            {
                "animal_id": cenario["animal_id"],
                "veterinario_id": cenario["veterinario_id"],
                "tipo": "consulta",
                "inicio": em(SEGUNDA, 8, 45),
                "fim": em(SEGUNDA, 9, 15),
            }
        )


@pytest.mark.parametrize(
    "inicio",
    [em(SEGUNDA, 8, 15), em(SEGUNDA, 10, 0), em(date(2030, 1, 9), 8, 0)],
    ids=["fora-da-grade", "fim-do-expediente", "dia-sem-expediente"],
)
def test_nao_agenda_fora_da_agenda(cenario: dict, inicio: datetime) -> None:
    with pytest.raises(DadosInvalidos) as erro:
        agendar(cenario, inicio)

    assert "inicio" in erro.value.campos


def test_nao_agenda_no_passado(cenario: dict) -> None:
    with pytest.raises(DadosInvalidos):
        agendar(cenario, em(date(2029, 12, 31), 8, 0))


def test_folga_bloqueia_os_dias_inteiros(cenario: dict) -> None:
    folga = cenario["expediente"].criar_folga(
        cenario["veterinario_id"],
        FolgaEntrada(data_inicio=SEGUNDA, data_fim=SEGUNDA, motivo="Congresso"),
    )

    assert (folga.data_inicio, folga.data_fim) == (SEGUNDA, SEGUNDA)
    assert livres(cenario, SEGUNDA) == []
    assert livres(cenario, date(2030, 1, 8)) == ["14:00", "15:00"]
    with pytest.raises(ConflitoDados):
        agendar(cenario, em(SEGUNDA, 8, 0))

    cenario["expediente"].remover_folga(cenario["veterinario_id"], folga.id)

    assert len(livres(cenario, SEGUNDA)) == 4


def test_transicoes_de_status(cenario: dict) -> None:
    agendamento = agendar(cenario, em(SEGUNDA, 9, 0))
    servico = cenario["agendamentos"]

    assert servico.alterar_status(agendamento.id, "confirmado").status == "confirmado"
    assert servico.alterar_status(agendamento.id, "faltou").status == "faltou"
    with pytest.raises(DadosInvalidos):
        servico.alterar_status(agendamento.id, "confirmado")


def test_listagem_filtra_por_periodo_e_status(cenario: dict) -> None:
    primeiro = agendar(cenario, em(SEGUNDA, 8, 0))
    agendar(cenario, em(date(2030, 1, 8), 14, 0))
    cenario["agendamentos"].alterar_status(primeiro.id, "cancelado")
    servico = cenario["agendamentos"]

    ativos = servico.listar(AGORA, None, cenario["veterinario_id"], ["agendado", "confirmado"])
    so_segunda = servico.listar(AGORA, em(date(2030, 1, 8), 0), None, None)

    assert [a.inicio.astimezone(FUSO).day for a in ativos] == [8]
    assert [a.status for a in so_segunda] == ["cancelado"]


def test_expediente_novo_substitui_o_anterior(cenario: dict) -> None:
    cenario["expediente"].salvar_expediente(
        cenario["veterinario_id"],
        Expediente(faixas=[{"dia_semana": 3, "hora_inicio": time(8), "hora_fim": time(9), "duracao_minutos": 20}]),
    )

    assert livres(cenario, SEGUNDA) == []
    assert livres(cenario, date(2030, 1, 9)) == ["08:00", "08:20", "08:40"]
