from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from psycopg import Connection

from app.repositories.agenda_repository import AgendamentoRepository, VeterinarioRepository
from app.repositories.animal_repository import AnimalRepository
from app.repositories.atendimento_repository import AnexoRepository, AtendimentoRepository
from app.repositories.enviador_email import Email, EnviadorArquivo
from app.repositories.notificacao_repository import NotificacaoRepository
from app.schemas.atendimento import InicioAtendimento, RegistroAtendimento
from app.services.atendimento_service import AtendimentoService
from app.services.excecoes import DadosInvalidos
from app.services.mensagens_tutor import RedatorMensagens
from app.services.notificacao_service import NotificacaoService
from tests.integracao.test_atendimento import criar_usuario_veterinario

FUSO = ZoneInfo("America/Maceio")
AGORA = datetime(2030, 1, 7, 9, 20, tzinfo=FUSO)


class EnviadorFalso:
    def __init__(self, falhar: bool = False) -> None:
        self.enviados: list[Email] = []
        self.falhar = falhar

    def enviar(self, email: Email) -> None:
        if self.falhar:
            raise ConnectionError("servidor recusou")
        self.enviados.append(email)


@pytest.fixture
def cenario(conexao: Connection) -> dict:
    mariana = criar_usuario_veterinario(conexao, "mariana@teste.local", "Dra. Mariana Costa", "SE-1234")
    tutor_id = conexao.execute(
        """
        insert into tutores (nome, cpf, telefone_principal, email, endereco, cidade, estado, cep)
        values ('Carlos Eduardo Silva', '52998224725', '79988881234', 'carlos@teste.local', 'Rua A', 'Aracaju', 'SE', '49037000')
        returning id
        """
    ).fetchone()["id"]
    animal_id = conexao.execute(
        "insert into animais (tutor_id, nome, especie, sexo, peso_kg) values (%s, 'Mel', 'Gato', 'femea', 4) returning id",
        (tutor_id,),
    ).fetchone()["id"]
    notificacoes = NotificacaoService(NotificacaoRepository(conexao), RedatorMensagens("AjuVet+", "", FUSO), FUSO)
    atendimentos = AtendimentoService(
        AtendimentoRepository(conexao),
        AnexoRepository(conexao),
        AgendamentoRepository(conexao),
        VeterinarioRepository(conexao),
        AnimalRepository(conexao),
        notificacoes,
        FUSO,
    )
    return {
        "conexao": conexao,
        "mariana": mariana,
        "tutor_id": tutor_id,
        "animal_id": animal_id,
        "atendimentos": atendimentos,
        "notificacoes": notificacoes,
    }


def finalizar_com_receita(cenario: dict) -> str:
    servico = cenario["atendimentos"]
    atendimento = servico.iniciar(
        InicioAtendimento(animal_id=cenario["animal_id"], tipo="consulta"), cenario["mariana"], AGORA
    )
    registro = RegistroAtendimento(
        retorno_em=date(2030, 1, 14),
        vacinas=[{"vacina": "Antirrábica", "proxima_dose_em": date(2031, 1, 7)}],
        prescricao={
            "orientacoes": "Manter em repouso.",
            "itens": [
                {"medicamento": "Amoxicilina 50 mg", "dose": "1 comprimido", "frequencia": "a cada 12 horas", "duracao_dias": 7},
                {"medicamento": "Pomada", "dose": "fina camada", "frequencia": "conforme necessário"},
            ],
        },
    )
    servico.registrar(atendimento.id, registro, cenario["mariana"], AGORA)
    servico.finalizar(atendimento.id, cenario["mariana"], AGORA)
    return atendimento.id


def notificacoes_do_atendimento(cenario: dict, atendimento_id: str, **filtros):
    return cenario["notificacoes"].listar({"atendimento_id": atendimento_id, **filtros}, 1, 200)


def test_finalizar_atendimento_programa_receita_e_lembretes(cenario: dict) -> None:
    atendimento_id = finalizar_com_receita(cenario)

    pagina = notificacoes_do_atendimento(cenario, atendimento_id, status="pendente")
    por_tipo = {}
    for notificacao in pagina.itens:
        por_tipo.setdefault(notificacao.tipo, []).append(notificacao)

    assert {tipo: len(itens) for tipo, itens in por_tipo.items()} == {
        "prescricao": 1,
        "lembrete_medicamento": 14,
        "lembrete_retorno": 1,
        "lembrete_vacina": 1,
    }
    receita = por_tipo["prescricao"][0]
    assert receita.agendada_para == AGORA
    assert receita.assunto == "Receita da Mel"
    assert "a partir de 07/01/2030 às 10:00" in receita.mensagem
    medicamentos = sorted(por_tipo["lembrete_medicamento"], key=lambda n: n.agendada_para)
    assert medicamentos[0].agendada_para == datetime(2030, 1, 7, 10, tzinfo=FUSO)
    assert medicamentos[-1].agendada_para == datetime(2030, 1, 13, 22, tzinfo=FUSO)
    assert "(dose 14 de 14)" in medicamentos[-1].mensagem
    assert por_tipo["lembrete_retorno"][0].agendada_para == datetime(2030, 1, 13, 9, tzinfo=FUSO)
    assert por_tipo["lembrete_vacina"][0].agendada_para == datetime(2031, 1, 4, 9, tzinfo=FUSO)


def test_envio_respeita_horario_e_registra_destinatario(cenario: dict) -> None:
    atendimento_id = finalizar_com_receita(cenario)
    enviador = EnviadorFalso()

    resultado = cenario["notificacoes"].enviar_pendentes(enviador, AGORA, 50)

    assert (resultado.enviadas, resultado.com_falha) == (1, 0)
    assert [email.assunto for email in enviador.enviados] == ["Receita da Mel"]
    assert enviador.enviados[0].destinatario == "carlos@teste.local"
    assert "<h1" in enviador.enviados[0].html
    enviada = notificacoes_do_atendimento(cenario, atendimento_id, status="enviada").itens[0]
    assert (enviada.destinatario, enviada.enviada_em, enviada.tentativas) == ("carlos@teste.local", AGORA, 1)

    duas_horas_depois = AGORA + timedelta(hours=2)
    cenario["notificacoes"].enviar_pendentes(enviador, duas_horas_depois, 50)

    assert [email.assunto for email in enviador.enviados[1:]] == ["Hora do remédio da Mel"]


def test_tutor_sem_email_falha_e_pode_reenviar_depois_de_corrigir(cenario: dict) -> None:
    conexao = cenario["conexao"]
    conexao.execute("update tutores set email = null where id = %s", (cenario["tutor_id"],))
    atendimento_id = finalizar_com_receita(cenario)
    servico = cenario["notificacoes"]

    servico.enviar_pendentes(EnviadorFalso(), AGORA, 50)

    receita = notificacoes_do_atendimento(cenario, atendimento_id, tipo="prescricao").itens[0]
    assert (receita.status, receita.erro) == ("falhou", "Tutor sem e-mail cadastrado.")
    assert servico.resumo(AGORA).com_falha == 1

    conexao.execute("update tutores set email = 'novo@teste.local' where id = %s", (cenario["tutor_id"],))
    reenviada = servico.reenviar(receita.id, AGORA)
    enviador = EnviadorFalso()
    servico.enviar_pendentes(enviador, AGORA, 50)

    assert (reenviada.status, reenviada.erro) == ("pendente", None)
    assert [email.destinatario for email in enviador.enviados] == ["novo@teste.local"]


def test_falha_no_servidor_tenta_de_novo_e_desiste_na_terceira(cenario: dict) -> None:
    atendimento_id = finalizar_com_receita(cenario)
    servico = cenario["notificacoes"]
    enviador = EnviadorFalso(falhar=True)
    instante = AGORA

    for _ in range(3):
        servico.enviar_proxima(enviador, instante)
        receita = notificacoes_do_atendimento(cenario, atendimento_id, tipo="prescricao").itens[0]
        instante = receita.agendada_para

    assert (receita.status, receita.tentativas) == ("falhou", 3)
    assert receita.erro == "Falha no envio: servidor recusou"


def test_cancelar_so_vale_para_pendentes(cenario: dict) -> None:
    atendimento_id = finalizar_com_receita(cenario)
    servico = cenario["notificacoes"]
    retorno = notificacoes_do_atendimento(cenario, atendimento_id, tipo="lembrete_retorno").itens[0]

    cancelada = servico.cancelar(retorno.id)

    assert cancelada.status == "cancelada"
    with pytest.raises(DadosInvalidos):
        servico.cancelar(retorno.id)
    with pytest.raises(DadosInvalidos):
        servico.reenviar(servico.reenviar(retorno.id, AGORA).id, AGORA)


def test_enviador_de_arquivo_grava_eml(tmp_path: Path) -> None:
    enviador = EnviadorArquivo(tmp_path / "emails", "AjuVet+ <nao-responda@ajuvet.local>")

    enviador.enviar(Email("carlos@teste.local", "Receita da Mel", "Olá!", "<p>Olá!</p>"))

    arquivo = next((tmp_path / "emails").glob("*.eml"))
    conteudo = arquivo.read_text(encoding="utf-8")
    assert "To: carlos@teste.local" in conteudo
    assert "multipart/alternative" in conteudo
