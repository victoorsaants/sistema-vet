from psycopg import Connection

from app.repositories.sql_utils import traduzir_erros_banco

COLUNAS_USUARIO = "u.id, u.email, p.nome, p.perfil, p.ativo"


class UsuarioRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def buscar_credenciais(self, email: str) -> dict | None:
        return self._conexao.execute(
            f"""
            select {COLUNAS_USUARIO}, u.encrypted_password
            from auth.users u
            left join perfis p on p.id = u.id
            where lower(u.email) = lower(%s)
            """,
            (email,),
        ).fetchone()

    def buscar_por_id(self, usuario_id: str) -> dict | None:
        return self._conexao.execute(
            f"select {COLUNAS_USUARIO} from auth.users u left join perfis p on p.id = u.id where u.id = %s",
            (usuario_id,),
        ).fetchone()

    def criar(self, email: str, hash_senha: str) -> str:
        with traduzir_erros_banco():
            return self._conexao.execute(
                "insert into auth.users (email, encrypted_password) values (lower(%s), %s) returning id",
                (email, hash_senha),
            ).fetchone()["id"]

    def atualizar_email(self, usuario_id: str, email: str) -> None:
        with traduzir_erros_banco():
            self._conexao.execute(
                "update auth.users set email = lower(%s), updated_at = now() where id = %s", (email, usuario_id)
            )

    def atualizar_senha(self, usuario_id: str, hash_senha: str) -> None:
        self._conexao.execute(
            "update auth.users set encrypted_password = %s, updated_at = now() where id = %s",
            (hash_senha, usuario_id),
        )

    def criar_perfil(self, usuario_id: str, nome: str, perfil: str, ativo: bool) -> None:
        self._conexao.execute(
            "insert into perfis (id, nome, perfil, ativo) values (%s, %s, %s, %s)",
            (usuario_id, nome, perfil, ativo),
        )

    def atualizar_perfil(self, usuario_id: str, nome: str, ativo: bool) -> None:
        self._conexao.execute("update perfis set nome = %s, ativo = %s where id = %s", (nome, ativo, usuario_id))
