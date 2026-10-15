from collections.abc import Iterator
from contextlib import contextmanager

from psycopg import Connection, errors, sql

from app.services.excecoes import ConflitoDados, DadosInvalidos

MENSAGENS_RESTRICAO = {
    "tutores_cpf_key": "Já existe um tutor cadastrado com este CPF.",
    "animais_microchip_key": "Já existe um animal cadastrado com este microchip.",
    "veterinarios_crmv_key": "Já existe um veterinário com este CRMV.",
    "users_email_key": "Já existe um usuário com este e-mail de acesso.",
    "agendamentos_sem_conflito_veterinario": "Este horário acabou de ser ocupado. Escolha outro horário.",
}

CAMPOS_RESTRICAO = {
    "disponibilidades_veterinario_veterinario_id_dia_semana_tsr_excl": (
        "expediente",
        "Há faixas de horário que se sobrepõem no mesmo dia.",
    ),
    "disponibilidades_veterinario_check": ("expediente", "O horário final deve ser depois do inicial."),
    "bloqueios_agenda_check": ("fim", "O fim deve ser depois do início."),
    "vacinas_aplicadas_check": ("vacinas", "A próxima dose deve ser depois da data de aplicação."),
    "lancamentos_valor_check": ("valor", "Informe um valor maior que zero."),
    "lancamentos_pago_com_forma_pagamento": ("forma_pagamento", "Informe a forma de pagamento."),
}


def padrao_contem(termo: str) -> str:
    escapado = termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escapado}%"


@contextmanager
def traduzir_erros_banco() -> Iterator[None]:
    try:
        yield
    except (errors.UniqueViolation, errors.ExclusionViolation, errors.CheckViolation) as erro:
        restricao = erro.diag.constraint_name or ""
        if restricao in CAMPOS_RESTRICAO:
            campo, mensagem = CAMPOS_RESTRICAO[restricao]
            raise DadosInvalidos({campo: mensagem}) from erro
        if isinstance(erro, errors.CheckViolation):
            raise DadosInvalidos({"geral": "Dados inválidos."}) from erro
        raise ConflitoDados(MENSAGENS_RESTRICAO.get(restricao, "Já existe um cadastro com esses dados.")) from erro


def inserir(conexao: Connection, tabela: str, dados: dict, retorno: str = "*") -> dict:
    colunas = list(dados)
    comando = sql.SQL("insert into {tabela} ({colunas}) values ({valores}) returning {retorno}").format(
        tabela=sql.Identifier(tabela),
        colunas=sql.SQL(", ").join(map(sql.Identifier, colunas)),
        valores=sql.SQL(", ").join(sql.Placeholder(coluna) for coluna in colunas),
        retorno=sql.SQL(retorno),
    )
    with traduzir_erros_banco():
        return conexao.execute(comando, dados).fetchone()


def atualizar_por_id(conexao: Connection, tabela: str, registro_id: str, dados: dict) -> dict | None:
    comando = sql.SQL("update {tabela} set {atribuicoes} where id = {id} returning *").format(
        tabela=sql.Identifier(tabela),
        atribuicoes=sql.SQL(", ").join(
            sql.SQL("{} = {}").format(sql.Identifier(coluna), sql.Placeholder(coluna)) for coluna in dados
        ),
        id=sql.Placeholder("_id"),
    )
    with traduzir_erros_banco():
        return conexao.execute(comando, {**dados, "_id": registro_id}).fetchone()
