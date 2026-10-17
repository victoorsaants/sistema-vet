from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from psycopg import Connection

from app.repositories.agenda_repository import AgendamentoRepository, VeterinarioRepository
from app.repositories.animal_repository import AnimalRepository
from app.repositories.armazenamento_arquivos import ArmazenamentoArquivos
from app.repositories.atendimento_repository import (
    AnexoRepository,
    AtendimentoRepository,
    HistoricoRepository,
)
from app.repositories.notificacao_repository import NotificacaoRepository
from app.schemas.atendimento import InicioAtendimento, RegistroAtendimento
from app.schemas.auth import PerfilUsuario, UsuarioLogado
from app.services.anexo_service import AnexoService
from app.services.atendimento_service import AtendimentoService
from app.services.excecoes import AcaoNaoPermitida, DadosInvalidos
from app.services.historico_service import HistoricoService
from app.services.mensagens_tutor import RedatorMensagens
from app.services.notificacao_service import NotificacaoService

FUSO = ZoneInfo("America/Maceio")
AGORA = datetime(2030, 1, 7, 9, 5, tzinfo=FUSO)
PDF = b"%PDF-1.7 conteudo de teste"


def criar_usuario_veterinario(conexao: Connection, email: str, nome: str, crmv: str) -> UsuarioLogado:
    usuario_id = conexao.execute(
        "insert into auth.users (email, encrypted_password) values (%s, 'x') returning id", (email,)
    ).fetchone()["id"]
    conexao.execute("insert into perfis (id, nome, perfil) values (%s, %s, 'veterinario')", (usuario_id, nome))
    conexao.execute("insert into veterinarios (perfil_id, nome, crmv) values (%s, %s, %s)", (usuario_id, nome, crmv))
    return UsuarioLogado(id=usuario_id, email=email, nome=nome, perfil=PerfilUsuario.VETERINARIO)


@pytest.fixture
def cenario(conexao: Connection, tmp_path: Path) -> dict:
    mariana = criar_usuario_veterinario(conexao, "mariana@teste.local", "Dra. Mariana Costa", "CRMV-T 1")
    paulo = criar_usuario_veterinario(conexao, "paulo@teste.local", "Dr. Paulo Henrique", "CRMV-T 2")
    tutor_id = conexao.execute(
        """
        insert into tutores (nome, cpf, telefone_principal, endereco, cidade, estado, cep)
        values ('Carlos Eduardo Silva', '52998224725', '79988881234', 'Rua A', 'Aracaju', 'SE', '49037000')
        returning id
        """
    ).fetchone()["id"]
    animal_id = conexao.execute(
        "insert into animais (tutor_id, nome, especie, peso_kg) values (%s, 'Thor', 'Cão', 30) returning id",
        (tutor_id,),
    ).fetchone()["id"]
    veterinario_id = conexao.execute(
        "select id from veterinarios where perfil_id = %s", (mariana.id,)
    ).fetchone()["id"]
    agendamento_id = conexao.execute(
        """
        insert into agendamentos (animal_id, veterinario_id, tipo, inicio, fim, status)
        values (%s, %s, 'consulta', '2030-01-07 09:00-03', '2030-01-07 09:30-03', 'confirmado')
        returning id
        """,
        (animal_id, veterinario_id),
    ).fetchone()["id"]
    atendimentos = AtendimentoService(
        AtendimentoRepository(conexao),
        AnexoRepository(conexao),
        AgendamentoRepository(conexao),
        VeterinarioRepository(conexao),
        AnimalRepository(conexao),
        NotificacaoService(NotificacaoRepository(conexao), RedatorMensagens("AjuVet+", "", FUSO), FUSO),
        FUSO,
    )
    anexos = AnexoService(
        AnexoRepository(conexao),
        AtendimentoRepository(conexao),
        atendimentos,
        ArmazenamentoArquivos(tmp_path),
        1024,
    )
    return {
        "conexao": conexao,
        "mariana": mariana,
        "paulo": paulo,
        "animal_id": animal_id,
        "agendamento_id": agendamento_id,
        "atendimentos": atendimentos,
        "anexos": anexos,
        "historico": HistoricoService(HistoricoRepository(conexao), FUSO),
        "pasta": tmp_path,
    }


def status_agendamento(cenario: dict) -> str:
    return cenario["conexao"].execute(
        "select status from agendamentos where id = %s", (cenario["agendamento_id"],)
    ).fetchone()["status"]


def iniciar(cenario: dict, usuario: UsuarioLogado | None = None):
    return cenario["atendimentos"].iniciar(
        InicioAtendimento(agendamento_id=cenario["agendamento_id"]), usuario or cenario["mariana"], AGORA
    )


REGISTRO_COMPLETO = RegistroAtendimento(
    peso_kg=32.5,
    temperatura_c=38.7,
    frequencia_cardiaca=90,
    frequencia_respiratoria=18,
    condicao_geral="Estável",
    diagnostico="Dermatite alérgica leve.",
    procedimentos=["Consulta de rotina", "Exame físico"],
    retorno_em=date(2030, 1, 14),
    exames=[{"nome": "Hemograma completo"}, {"nome": "Bioquímica", "resultado": "Normal."}],
    vacinas=[{"vacina": "V10", "lote": "A123", "proxima_dose_em": date(2031, 1, 7)}],
    prescricao={
        "orientacoes": "Repouso relativo.",
        "itens": [{"medicamento": "Amoxicilina 250 mg", "dose": "1 comprimido", "frequencia": "a cada 12 horas", "duracao_dias": 7}],
    },
)


def test_iniciar_pelo_agendamento_marca_em_atendimento(cenario: dict) -> None:
    atendimento = iniciar(cenario)

    assert atendimento.status == "em_andamento"
    assert atendimento.animal.nome == "Thor"
    assert atendimento.tutor.nome == "Carlos Eduardo Silva"
    assert status_agendamento(cenario) == "em_atendimento"
    assert iniciar(cenario).id == atendimento.id


def test_outro_veterinario_nao_inicia_agendamento_alheio(cenario: dict) -> None:
    with pytest.raises(AcaoNaoPermitida, match="outro veterinário"):
        iniciar(cenario, cenario["paulo"])


def test_registro_completo_e_substituido_a_cada_salvamento(cenario: dict) -> None:
    atendimento = iniciar(cenario)
    servico = cenario["atendimentos"]

    salvo = servico.registrar(atendimento.id, REGISTRO_COMPLETO, cenario["mariana"], AGORA)

    assert salvo.temperatura_c == 38.7
    assert [(e.nome, e.status) for e in salvo.exames] == [("Hemograma completo", "solicitado"), ("Bioquímica", "realizado")]
    assert salvo.vacinas[0].aplicada_em == date(2030, 1, 7)
    assert salvo.prescricao.itens[0].medicamento == "Amoxicilina 250 mg"
    intervalo = cenario["conexao"].execute("select intervalo_horas from itens_prescricao").fetchone()
    assert intervalo["intervalo_horas"] == 12

    revisado = servico.registrar(
        atendimento.id, RegistroAtendimento(diagnostico="Revisado."), cenario["mariana"], AGORA
    )

    assert (revisado.exames, revisado.vacinas, revisado.prescricao) == ([], [], None)
    assert revisado.diagnostico == "Revisado."


def test_vacina_com_proxima_dose_no_passado_e_recusada(cenario: dict) -> None:
    atendimento = iniciar(cenario)
    registro = RegistroAtendimento(vacinas=[{"vacina": "V10", "proxima_dose_em": date(2030, 1, 1)}])

    with pytest.raises(DadosInvalidos):
        cenario["atendimentos"].registrar(atendimento.id, registro, cenario["mariana"], AGORA)


def test_finalizar_conclui_agendamento_atualiza_peso_e_trava_edicao(cenario: dict) -> None:
    atendimento = iniciar(cenario)
    servico = cenario["atendimentos"]
    servico.registrar(atendimento.id, REGISTRO_COMPLETO, cenario["mariana"], AGORA)

    finalizado = servico.finalizar(atendimento.id, cenario["mariana"], AGORA)

    assert finalizado.status == "finalizado"
    assert finalizado.animal.peso_kg == 32.5
    assert status_agendamento(cenario) == "concluido"
    with pytest.raises(AcaoNaoPermitida, match="finalizado"):
        servico.registrar(atendimento.id, REGISTRO_COMPLETO, cenario["mariana"], AGORA)


def test_outro_veterinario_nao_altera_atendimento(cenario: dict) -> None:
    atendimento = iniciar(cenario)

    with pytest.raises(AcaoNaoPermitida, match="responsável"):
        cenario["atendimentos"].registrar(atendimento.id, REGISTRO_COMPLETO, cenario["paulo"], AGORA)


def test_atendimento_sem_agendamento(cenario: dict) -> None:
    entrada = InicioAtendimento(animal_id=cenario["animal_id"], tipo="vacinacao")

    atendimento = cenario["atendimentos"].iniciar(entrada, cenario["paulo"], AGORA)

    assert (atendimento.agendamento_id, atendimento.tipo) == (None, "vacinacao")
    assert atendimento.veterinario.nome == "Dr. Paulo Henrique"


def test_anexos_validam_tipo_e_tamanho_e_podem_ser_removidos(cenario: dict) -> None:
    atendimento = iniciar(cenario)
    anexos = cenario["anexos"]
    mariana = cenario["mariana"]

    anexo = anexos.enviar(atendimento.id, mariana, r"C:\exames\Hemograma.pdf", PDF, None)
    caminho, nome, tipo = anexos.abrir(anexo.id)

    assert (nome, tipo, anexo.tamanho_bytes) == ("Hemograma.pdf", "application/pdf", len(PDF))
    assert caminho.read_bytes() == PDF
    with pytest.raises(DadosInvalidos):
        anexos.enviar(atendimento.id, mariana, "virus.exe", b"MZ\x90\x00", None)
    with pytest.raises(DadosInvalidos):
        anexos.enviar(atendimento.id, mariana, "grande.pdf", b"%PDF-" + b"0" * 2048, None)

    anexos.remover(atendimento.id, anexo.id, mariana)

    assert not caminho.exists()
    assert cenario["atendimentos"].obter(atendimento.id).anexos == []


def test_historico_reune_eventos_e_resumo(cenario: dict) -> None:
    atendimento = iniciar(cenario)
    servico = cenario["atendimentos"]
    servico.registrar(atendimento.id, REGISTRO_COMPLETO, cenario["mariana"], AGORA)
    servico.finalizar(atendimento.id, cenario["mariana"], AGORA)
    historico = cenario["historico"]

    completo = historico.montar(cenario["animal_id"], None, None, None, 1, 20, AGORA)
    so_vacinas = historico.montar(cenario["animal_id"], "vacina", None, None, 1, 20, AGORA)
    fora_do_periodo = historico.montar(cenario["animal_id"], None, date(2030, 2, 1), None, 1, 20, AGORA)

    assert sorted(evento.tipo for evento in completo.eventos) == ["atendimento", "exame", "exame", "prescricao", "vacina"]
    assert completo.resumo.model_dump() == {"consultas": 1, "exames": 2, "vacinas": 1, "tratamentos": 1}
    assert completo.ultimo_atendimento.veterinario == "Dra. Mariana Costa"
    consulta = next(evento for evento in completo.eventos if evento.tipo == "atendimento")
    assert consulta.descricao == "Dermatite alérgica leve. Retorno em 14/01/2030."
    assert [evento.titulo for evento in so_vacinas.eventos] == ["Vacina V10"]
    assert fora_do_periodo.total_eventos == 0


def test_listagem_dos_meus_atendimentos(cenario: dict) -> None:
    iniciar(cenario)
    servico = cenario["atendimentos"]

    meus = servico.listar(None, "em_andamento", cenario["mariana"], apenas_meus=True)
    do_paulo = servico.listar(None, None, cenario["paulo"], apenas_meus=True)

    assert [a.animal.nome for a in meus] == ["Thor"]
    assert do_paulo == []
