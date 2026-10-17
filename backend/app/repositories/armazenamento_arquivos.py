from pathlib import Path, PurePosixPath


class ArmazenamentoArquivos:
    def __init__(self, pasta_base: Path) -> None:
        self._pasta_base = pasta_base.resolve()

    def salvar(self, caminho: str, conteudo: bytes) -> None:
        destino = self.localizar(caminho)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(conteudo)

    def remover(self, caminho: str) -> None:
        self.localizar(caminho).unlink(missing_ok=True)

    def localizar(self, caminho: str) -> Path:
        relativo = PurePosixPath(caminho)
        if relativo.is_absolute() or ".." in relativo.parts:
            raise ValueError("Caminho de arquivo inválido.")
        destino = (self._pasta_base / Path(*relativo.parts)).resolve()
        if not destino.is_relative_to(self._pasta_base):
            raise ValueError("Caminho de arquivo inválido.")
        return destino
