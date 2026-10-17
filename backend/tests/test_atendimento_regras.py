from pathlib import Path

import pytest
from pydantic import ValidationError

from app.repositories.armazenamento_arquivos import ArmazenamentoArquivos
from app.schemas.atendimento import InicioAtendimento, RegistroAtendimento
from app.services.anexo_service import identificar_tipo, limpar_nome_arquivo
from app.services.atendimento_service import intervalo_em_horas


@pytest.mark.parametrize(
    ("frequencia", "horas"),
    [
        ("a cada 12 horas", 12),
        ("de 8 em 8 horas", 8),
        ("12/12h", 12),
        ("1 vez ao dia", 24),
        ("uma vez ao dia", 24),
        ("duas vezes ao dia", 12),
        ("3x ao dia", 8),
        ("Três vezes por dia", 8),
        ("quando houver dor", None),
    ],
)
def test_intervalo_em_horas(frequencia: str, horas: int | None) -> None:
    assert intervalo_em_horas(frequencia) == horas


@pytest.mark.parametrize(
    ("conteudo", "esperado"),
    [
        (b"%PDF-1.7 resto", ("application/pdf", ".pdf")),
        (b"\x89PNG\r\n\x1a\nresto", ("image/png", ".png")),
        (b"\xff\xd8\xff\xe0resto", ("image/jpeg", ".jpg")),
        (b"RIFF\x00\x00\x00\x00WEBPVP8 ", ("image/webp", ".webp")),
        (b"MZ\x90\x00 executavel", None),
        (b"<html>", None),
    ],
)
def test_identifica_tipo_pelo_conteudo(conteudo: bytes, esperado: tuple[str, str] | None) -> None:
    assert identificar_tipo(conteudo) == esperado


def test_nome_do_arquivo_perde_o_caminho() -> None:
    assert limpar_nome_arquivo(r"C:\Users\fulano\Hemograma.pdf", ".pdf") == "Hemograma.pdf"
    assert limpar_nome_arquivo("../../etc/passwd", ".pdf") == "passwd"
    assert limpar_nome_arquivo("", ".png") == "arquivo.png"


def test_armazenamento_nao_sai_da_pasta_base(tmp_path: Path) -> None:
    armazenamento = ArmazenamentoArquivos(tmp_path)
    armazenamento.salvar("anexos/a/b.pdf", b"%PDF-")

    assert (tmp_path / "anexos" / "a" / "b.pdf").read_bytes() == b"%PDF-"
    for caminho in ["../fora.pdf", "/etc/passwd", "anexos/../../fora.pdf"]:
        with pytest.raises(ValueError):
            armazenamento.localizar(caminho)


def test_procedimentos_sem_repeticao_nem_vazios() -> None:
    registro = RegistroAtendimento(procedimentos=["Exame físico", " ", "Exame físico ", "Vacinação"])

    assert registro.procedimentos == ["Exame físico", "Vacinação"]


def test_inicio_exige_agendamento_ou_animal_e_tipo() -> None:
    with pytest.raises(ValidationError, match="Informe o agendamento"):
        InicioAtendimento(animal_id="30000000-0000-4000-8000-000000000001")

    assert InicioAtendimento(agendamento_id="30000000-0000-4000-8000-000000000001").tipo is None
