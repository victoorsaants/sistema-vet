import re

from pydantic_core import PydanticCustomError

UFS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
}

PADRAO_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def somente_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor)


def cpf_tem_digitos_validos(cpf: str) -> bool:
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for tamanho in (9, 10):
        soma = sum(int(digito) * peso for digito, peso in zip(cpf[:tamanho], range(tamanho + 1, 1, -1)))
        verificador = (soma * 10) % 11 % 10
        if verificador != int(cpf[tamanho]):
            return False
    return True


def validar_cpf(valor: str | None) -> str | None:
    if valor is None:
        return None
    cpf = somente_digitos(valor)
    if not cpf_tem_digitos_validos(cpf):
        raise PydanticCustomError("cpf_invalido", "CPF inválido.")
    return cpf


def validar_telefone(valor: str | None) -> str | None:
    if valor is None:
        return None
    telefone = somente_digitos(valor)
    if len(telefone) not in (10, 11):
        raise PydanticCustomError("telefone_invalido", "Informe o telefone com DDD.")
    return telefone


def validar_cep(valor: str | None) -> str | None:
    if valor is None:
        return None
    cep = somente_digitos(valor)
    if len(cep) != 8:
        raise PydanticCustomError("cep_invalido", "CEP deve ter 8 dígitos.")
    return cep


def validar_uf(valor: str | None) -> str | None:
    if valor is None:
        return None
    uf = valor.upper()
    if uf not in UFS:
        raise PydanticCustomError("uf_invalida", "Estado inválido.")
    return uf


def validar_email(valor: str | None) -> str | None:
    if valor is None:
        return None
    if not PADRAO_EMAIL.match(valor):
        raise PydanticCustomError("email_invalido", "E-mail inválido.")
    return valor.lower()
