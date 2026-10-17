from pathlib import Path, PureWindowsPath
from uuid import uuid4

from app.repositories.armazenamento_arquivos import ArmazenamentoArquivos
from app.repositories.atendimento_repository import AnexoRepository, AtendimentoRepository
from app.schemas.atendimento import AnexoSaida
from app.schemas.auth import UsuarioLogado
from app.services.atendimento_service import AtendimentoService
from app.services.excecoes import DadosInvalidos, RecursoNaoEncontrado

ANEXO_NAO_ENCONTRADO = "Anexo não encontrado."
TAMANHO_MAXIMO_NOME = 150


def identificar_tipo(conteudo: bytes) -> tuple[str, str] | None:
    if conteudo.startswith(b"%PDF-"):
        return "application/pdf", ".pdf"
    if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if conteudo.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


def limpar_nome_arquivo(nome: str | None, extensao: str) -> str:
    base = PureWindowsPath(nome or "").name.strip()
    base = "".join(caractere for caractere in base if caractere.isprintable())
    return (base or f"arquivo{extensao}")[:TAMANHO_MAXIMO_NOME]


class AnexoService:
    def __init__(
        self,
        anexo_repository: AnexoRepository,
        atendimento_repository: AtendimentoRepository,
        atendimento_service: AtendimentoService,
        armazenamento: ArmazenamentoArquivos,
        tamanho_maximo_bytes: int,
    ) -> None:
        self._anexo_repository = anexo_repository
        self._atendimento_repository = atendimento_repository
        self._atendimento_service = atendimento_service
        self._armazenamento = armazenamento
        self._tamanho_maximo_bytes = tamanho_maximo_bytes

    def enviar(
        self,
        atendimento_id: str,
        usuario: UsuarioLogado,
        nome_original: str | None,
        conteudo: bytes,
        exame_id: str | None,
    ) -> AnexoSaida:
        self._atendimento_service.garantir_edicao(atendimento_id, usuario)
        if not conteudo:
            raise DadosInvalidos({"arquivo": "O arquivo está vazio."})
        if len(conteudo) > self._tamanho_maximo_bytes:
            limite_mb = self._tamanho_maximo_bytes // (1024 * 1024)
            raise DadosInvalidos({"arquivo": f"O arquivo passa do limite de {limite_mb} MB."})
        tipo = identificar_tipo(conteudo)
        if tipo is None:
            raise DadosInvalidos({"arquivo": "Envie um arquivo PDF, JPG, PNG ou WEBP."})
        if exame_id and exame_id not in {e["id"] for e in self._atendimento_repository.listar_exames(atendimento_id)}:
            raise DadosInvalidos({"exame_id": "Exame não encontrado neste atendimento."})

        tipo_mime, extensao = tipo
        caminho = f"anexos/{atendimento_id}/{uuid4().hex}{extensao}"
        self._armazenamento.salvar(caminho, conteudo)
        try:
            linha = self._anexo_repository.criar(
                {
                    "atendimento_id": atendimento_id,
                    "exame_id": exame_id,
                    "nome_arquivo": limpar_nome_arquivo(nome_original, extensao),
                    "caminho_storage": caminho,
                    "tipo_mime": tipo_mime,
                    "tamanho_bytes": len(conteudo),
                    "enviado_por": usuario.id,
                }
            )
        except Exception:
            self._armazenamento.remover(caminho)
            raise
        return AnexoSaida(**linha)

    def remover(self, atendimento_id: str, anexo_id: str, usuario: UsuarioLogado) -> None:
        self._atendimento_service.garantir_edicao(atendimento_id, usuario)
        anexo = self._anexo_repository.buscar(anexo_id)
        if anexo is None or anexo["atendimento_id"] != atendimento_id:
            raise RecursoNaoEncontrado(ANEXO_NAO_ENCONTRADO)
        self._anexo_repository.remover(anexo_id)
        self._armazenamento.remover(anexo["caminho_storage"])

    def abrir(self, anexo_id: str) -> tuple[Path, str, str]:
        anexo = self._anexo_repository.buscar(anexo_id)
        if anexo is None:
            raise RecursoNaoEncontrado(ANEXO_NAO_ENCONTRADO)
        arquivo = self._armazenamento.localizar(anexo["caminho_storage"])
        if not arquivo.is_file():
            raise RecursoNaoEncontrado("O arquivo deste anexo não foi encontrado.")
        return arquivo, anexo["nome_arquivo"], anexo["tipo_mime"]
