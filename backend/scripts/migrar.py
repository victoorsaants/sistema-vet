import argparse
import sys
from pathlib import Path

import psycopg

from app.config import settings

PASTA_BACKEND = Path(__file__).resolve().parent.parent
ARQUIVO_COMPATIBILIDADE = PASTA_BACKEND / "banco" / "compatibilidade_local.sql"
PASTA_MIGRATIONS = PASTA_BACKEND.parent / "supabase" / "migrations"
ARQUIVO_SEED = PASTA_BACKEND.parent / "supabase" / "seed.sql"
ARQUIVO_USUARIOS_EXEMPLO = PASTA_BACKEND / "banco" / "usuarios_exemplo_local.sql"

SQL_CONTROLE = """
create table if not exists public.migracoes_aplicadas (
  nome       text primary key,
  aplicada_em timestamptz not null default now()
)
"""


def ler_argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aplica as migrations do AjuVet+ no banco local.")
    parser.add_argument("--seed", action="store_true", help="Também carrega os dados de exemplo.")
    parser.add_argument(
        "--seed-se-vazio",
        action="store_true",
        help="Carrega os dados de exemplo só se ainda não houver veterinários cadastrados.",
    )
    parser.add_argument("--banco", help="URL do banco. Padrão: DATABASE_URL do .env.")
    return parser.parse_args()


def aplicar_migrations(conexao: psycopg.Connection) -> list[str]:
    conexao.execute(ARQUIVO_COMPATIBILIDADE.read_text(encoding="utf-8"))
    conexao.execute(SQL_CONTROLE)
    aplicadas = {linha[0] for linha in conexao.execute("select nome from public.migracoes_aplicadas")}
    novas = []
    for arquivo in sorted(PASTA_MIGRATIONS.glob("*.sql")):
        if arquivo.name in aplicadas:
            continue
        conexao.execute(arquivo.read_text(encoding="utf-8"))
        conexao.execute("insert into public.migracoes_aplicadas (nome) values (%s)", (arquivo.name,))
        novas.append(arquivo.name)
    return novas


def banco_vazio(conexao: psycopg.Connection) -> bool:
    return not conexao.execute("select exists (select 1 from public.veterinarios)").fetchone()[0]


def main() -> None:
    argumentos = ler_argumentos()
    url = argumentos.banco or settings.database_url
    try:
        with psycopg.connect(url) as conexao:
            novas = aplicar_migrations(conexao)
            argumentos.seed = argumentos.seed or (argumentos.seed_se_vazio and banco_vazio(conexao))
            if argumentos.seed:
                conexao.execute(ARQUIVO_SEED.read_text(encoding="utf-8"))
                conexao.execute(ARQUIVO_USUARIOS_EXEMPLO.read_text(encoding="utf-8"))
    except psycopg.errors.UniqueViolation:
        sys.exit("Os dados de exemplo já estão no banco. Para recarregar, recrie a base.")
    except psycopg.OperationalError as erro:
        sys.exit(f"Não foi possível conectar ao banco: {erro}")

    print(f"Migrations aplicadas agora: {', '.join(novas) if novas else 'nenhuma (banco já atualizado)'}.")
    if argumentos.seed:
        print("Dados de exemplo carregados. Usuários: recepcao@ajuvet.local e mariana.costa@ajuvet.local (senha ajuvet123).")


if __name__ == "__main__":
    main()
