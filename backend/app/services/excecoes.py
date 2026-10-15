class ErroAutenticacao(Exception):
    pass


class CredenciaisInvalidas(ErroAutenticacao):
    pass


class SessaoInvalida(ErroAutenticacao):
    pass


class UsuarioSemAcesso(ErroAutenticacao):
    pass


class ServicoIndisponivel(Exception):
    pass


class RecursoNaoEncontrado(Exception):
    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem


class ConflitoDados(Exception):
    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem


class AcaoNaoPermitida(Exception):
    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem


class DadosInvalidos(Exception):
    def __init__(self, campos: dict[str, str]) -> None:
        super().__init__(campos)
        self.campos = campos
