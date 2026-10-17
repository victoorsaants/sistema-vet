import sys

import psycopg_pool

from app.db.conexao import fechar_pool
from app.despacho_notificacoes import enviar_rodada


def main() -> None:
    try:
        resultado = enviar_rodada()
    except psycopg_pool.PoolTimeout:
        sys.exit("Não foi possível conectar ao banco. Confira se ele está rodando.")
    finally:
        fechar_pool()
    print(f"Notificações enviadas: {resultado.enviadas}. Com falha: {resultado.com_falha}.")


if __name__ == "__main__":
    main()
