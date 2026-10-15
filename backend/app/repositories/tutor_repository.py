import re

from psycopg import Connection

from app.repositories.sql_utils import atualizar_por_id, inserir, padrao_contem

FILTRO_BUSCA = """
  t.ativo
  and (
    %(padrao)s::text is null
    or t.nome ilike %(padrao)s
    or t.email ilike %(padrao)s
    or (%(padrao_digitos)s::text is not null and (t.cpf like %(padrao_digitos)s or t.telefone_principal like %(padrao_digitos)s))
  )
"""


def parametros_busca(busca: str | None) -> dict:
    termo = (busca or "").strip()
    digitos = re.sub(r"\D", "", termo)
    return {
        "padrao": padrao_contem(termo) if termo else None,
        "padrao_digitos": padrao_contem(digitos) if digitos else None,
    }


class TutorRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def listar(self, busca: str | None, inicio: int, fim: int) -> tuple[list[dict], int]:
        parametros = {**parametros_busca(busca), "limite": fim - inicio + 1, "inicio": inicio}
        total = self._conexao.execute(
            f"select count(*) as total from tutores t where {FILTRO_BUSCA}", parametros
        ).fetchone()["total"]
        linhas = self._conexao.execute(
            f"""
            select t.id, t.nome, t.cpf, t.telefone_principal, t.email, t.cidade,
                   (select count(*) from animais a where a.tutor_id = t.id and a.ativo) as total_animais
            from tutores t
            where {FILTRO_BUSCA}
            order by t.nome
            limit %(limite)s offset %(inicio)s
            """,
            parametros,
        ).fetchall()
        return linhas, total

    def buscar_ids_por_nome(self, nome: str, limite: int) -> list[str]:
        termo = nome.strip()
        if not termo:
            return []
        linhas = self._conexao.execute(
            "select id from tutores where ativo and nome ilike %s limit %s",
            (padrao_contem(termo), limite),
        ).fetchall()
        return [linha["id"] for linha in linhas]

    def buscar_por_id(self, tutor_id: str) -> dict | None:
        return self._conexao.execute("select * from tutores where id = %s", (tutor_id,)).fetchone()

    def criar(self, dados: dict) -> dict:
        return inserir(self._conexao, "tutores", dados)

    def atualizar(self, tutor_id: str, dados: dict) -> dict | None:
        return atualizar_por_id(self._conexao, "tutores", tutor_id, dados)
