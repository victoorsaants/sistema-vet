from datetime import datetime

from psycopg import Connection


class SessaoRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def criar(self, usuario_id: str, refresh_token_hash: str, expira_em: datetime) -> str:
        return self._conexao.execute(
            "insert into auth.sessoes (usuario_id, refresh_token_hash, expira_em) values (%s, %s, %s) returning id",
            (usuario_id, refresh_token_hash, expira_em),
        ).fetchone()["id"]

    def buscar_ativa_por_refresh(self, refresh_token_hash: str) -> dict | None:
        return self._conexao.execute(
            """
            select id, usuario_id from auth.sessoes
            where refresh_token_hash = %s and encerrada_em is null and expira_em > now()
            for update
            """,
            (refresh_token_hash,),
        ).fetchone()

    def renovar(self, sessao_id: str, refresh_token_hash: str, expira_em: datetime) -> None:
        self._conexao.execute(
            "update auth.sessoes set refresh_token_hash = %s, expira_em = %s where id = %s",
            (refresh_token_hash, expira_em, sessao_id),
        )

    def esta_ativa(self, sessao_id: str) -> bool:
        linha = self._conexao.execute(
            "select 1 from auth.sessoes where id = %s and encerrada_em is null and expira_em > now()",
            (sessao_id,),
        ).fetchone()
        return linha is not None

    def encerrar(self, sessao_id: str) -> None:
        self._conexao.execute(
            "update auth.sessoes set encerrada_em = now() where id = %s and encerrada_em is null",
            (sessao_id,),
        )

    def encerrar_do_usuario(self, usuario_id: str) -> None:
        self._conexao.execute(
            "update auth.sessoes set encerrada_em = now() where usuario_id = %s and encerrada_em is null",
            (usuario_id,),
        )
