from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.services.excecoes import (
    AcaoNaoPermitida,
    ConflitoDados,
    CredenciaisInvalidas,
    DadosInvalidos,
    RecursoNaoEncontrado,
    ServicoIndisponivel,
    SessaoInvalida,
    UsuarioSemAcesso,
)

RESPOSTAS_POR_ERRO: dict[type[Exception], tuple[int, str]] = {
    CredenciaisInvalidas: (status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos."),
    SessaoInvalida: (status.HTTP_401_UNAUTHORIZED, "Sessão expirada. Faça login novamente."),
    UsuarioSemAcesso: (status.HTTP_403_FORBIDDEN, "Usuário sem acesso ao sistema."),
    ServicoIndisponivel: (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Serviço indisponível. Tente novamente em instantes.",
    ),
}

MENSAGEM_CAMPOS_INVALIDOS = "Verifique os campos destacados."
MENSAGEM_OBRIGATORIO = "Campo obrigatório."

MENSAGENS_VALIDACAO = {
    "string_too_short": "Texto muito curto.",
    "string_too_long": "Texto muito longo.",
    "greater_than": "Informe um valor maior que zero.",
    "less_than_equal": "Valor acima do permitido.",
    "float_parsing": "Informe um número.",
    "float_type": "Informe um número.",
    "int_parsing": "Informe um número inteiro.",
    "decimal_parsing": "Informe um valor válido.",
    "decimal_type": "Informe um valor válido.",
    "decimal_max_places": "Use no máximo duas casas decimais.",
    "decimal_max_digits": "Valor acima do permitido.",
    "date_from_datetime_parsing": "Data inválida.",
    "date_parsing": "Data inválida.",
    "date_type": "Data inválida.",
    "literal_error": "Selecione uma opção válida.",
    "bool_parsing": "Selecione uma opção válida.",
    "uuid_parsing": "Selecione uma opção válida.",
    "uuid_type": "Selecione uma opção válida.",
}


def mensagem_do_erro(erro: dict) -> str:
    if erro["type"] == "missing" or erro.get("input", "") is None:
        return MENSAGEM_OBRIGATORIO
    if erro["type"] == "value_error":
        return str(erro.get("ctx", {}).get("error", erro["msg"]))
    return MENSAGENS_VALIDACAO.get(erro["type"], erro["msg"])


def traduzir_erros_validacao(erros: list[dict]) -> dict[str, str]:
    campos: dict[str, str] = {}
    for erro in erros:
        campo = str(erro["loc"][-1]) if erro["loc"] else "geral"
        if campo in campos:
            continue
        campos[campo] = mensagem_do_erro(erro)
    return campos


def resposta_campos_invalidos(campos: dict[str, str]) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": MENSAGEM_CAMPOS_INVALIDOS, "campos": campos},
    )


def registrar_tratadores_erro(app: FastAPI) -> None:
    for tipo_erro, (codigo, mensagem) in RESPOSTAS_POR_ERRO.items():
        app.add_exception_handler(tipo_erro, _criar_tratador(codigo, mensagem))
    app.add_exception_handler(RequestValidationError, _tratar_validacao)
    app.add_exception_handler(DadosInvalidos, _tratar_dados_invalidos)
    app.add_exception_handler(RecursoNaoEncontrado, _tratar_nao_encontrado)
    app.add_exception_handler(ConflitoDados, _tratar_conflito)
    app.add_exception_handler(AcaoNaoPermitida, _tratar_acao_nao_permitida)


def _criar_tratador(codigo: int, mensagem: str):
    async def tratar(_: Request, __: Exception) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if codigo == status.HTTP_401_UNAUTHORIZED else None
        return JSONResponse(status_code=codigo, content={"detail": mensagem}, headers=headers)

    return tratar


async def _tratar_validacao(_: Request, erro: RequestValidationError) -> JSONResponse:
    return resposta_campos_invalidos(traduzir_erros_validacao(erro.errors()))


async def _tratar_dados_invalidos(_: Request, erro: DadosInvalidos) -> JSONResponse:
    return resposta_campos_invalidos(erro.campos)


async def _tratar_nao_encontrado(_: Request, erro: RecursoNaoEncontrado) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": erro.mensagem})


async def _tratar_conflito(_: Request, erro: ConflitoDados) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": erro.mensagem})


async def _tratar_acao_nao_permitida(_: Request, erro: AcaoNaoPermitida) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": erro.mensagem})
