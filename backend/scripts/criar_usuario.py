import argparse
import getpass
import sys

import psycopg
from psycopg.rows import dict_row

from app.config import settings
from app.schemas.auth import PerfilUsuario
from app.services.auth_service import gerar_hash_senha

TAMANHO_MINIMO_SENHA = 8


def ler_argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cria um usuário do AjuVet+ com perfil de Recepção ou Veterinário.",
    )
    parser.add_argument("--email", required=True)
    parser.add_argument("--nome", required=True)
    parser.add_argument("--perfil", required=True, choices=[perfil.value for perfil in PerfilUsuario])
    parser.add_argument("--crmv", help="CRMV do veterinário. Se ainda não existir, o veterinário é cadastrado.")
    parser.add_argument("--especialidade", help="Especialidade, usada ao cadastrar um veterinário novo.")
    return parser.parse_args()


def ler_senha() -> str:
    senha = getpass.getpass("Senha: ")
    if len(senha) < TAMANHO_MINIMO_SENHA:
        sys.exit(f"A senha precisa ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres.")
    if getpass.getpass("Confirme a senha: ") != senha:
        sys.exit("As senhas não conferem.")
    return senha


def vincular_veterinario(conexao: psycopg.Connection, usuario_id: str, argumentos: argparse.Namespace) -> str:
    atualizado = conexao.execute(
        "update veterinarios set perfil_id = %s where crmv = %s returning nome",
        (usuario_id, argumentos.crmv),
    ).fetchone()
    if atualizado:
        return f"ligado ao veterinário {atualizado['nome']}"
    conexao.execute(
        "insert into veterinarios (perfil_id, nome, crmv, especialidade, email) values (%s, %s, %s, %s, %s)",
        (usuario_id, argumentos.nome, argumentos.crmv, argumentos.especialidade, argumentos.email),
    )
    return "veterinário cadastrado"


def main() -> None:
    argumentos = ler_argumentos()
    if argumentos.perfil == PerfilUsuario.VETERINARIO.value and not argumentos.crmv:
        sys.exit("Para --perfil veterinario, informe também --crmv.")
    if argumentos.crmv and argumentos.perfil != PerfilUsuario.VETERINARIO.value:
        sys.exit("--crmv só pode ser usado com --perfil veterinario.")

    senha = ler_senha()
    try:
        with psycopg.connect(settings.database_url, row_factory=dict_row) as conexao:
            usuario_id = conexao.execute(
                "insert into auth.users (email, encrypted_password) values (lower(%s), %s) returning id::text",
                (argumentos.email, gerar_hash_senha(senha)),
            ).fetchone()["id"]
            conexao.execute(
                "insert into perfis (id, nome, perfil) values (%s, %s, %s)",
                (usuario_id, argumentos.nome, argumentos.perfil),
            )
            detalhe = vincular_veterinario(conexao, usuario_id, argumentos) if argumentos.crmv else ""
    except psycopg.errors.UniqueViolation:
        sys.exit("Já existe um usuário com este e-mail.")
    except psycopg.OperationalError as erro:
        sys.exit(f"Não foi possível conectar ao banco: {erro}")

    print(f"Usuário {argumentos.email} criado com perfil {argumentos.perfil}" + (f" ({detalhe})." if detalhe else "."))


if __name__ == "__main__":
    main()
