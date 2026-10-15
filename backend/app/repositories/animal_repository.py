import re

from psycopg import Connection

from app.repositories.sql_utils import atualizar_por_id, inserir, padrao_contem

COLUNA_TUTOR = "json_build_object('id', t.id, 'nome', t.nome, 'telefone_principal', t.telefone_principal) as tutor"

FILTRO_LISTAGEM = """
  a.ativo
  and (%(tutor_id)s::uuid is null or a.tutor_id = %(tutor_id)s::uuid)
  and (
    %(padrao)s::text is null
    or a.nome ilike %(padrao)s
    or (%(padrao_microchip)s::text is not null and a.microchip ilike %(padrao_microchip)s)
    or a.tutor_id = any(%(tutores)s::uuid[])
  )
"""


class AnimalRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def listar(
        self,
        busca: str | None,
        tutor_id: str | None,
        tutores_encontrados: list[str],
        inicio: int,
        fim: int,
    ) -> tuple[list[dict], int]:
        termo = (busca or "").strip()
        microchip = re.sub(r"[\s.\-]", "", termo)
        parametros = {
            "tutor_id": tutor_id,
            "padrao": padrao_contem(termo) if termo else None,
            "padrao_microchip": padrao_contem(microchip) if microchip else None,
            "tutores": tutores_encontrados,
            "limite": fim - inicio + 1,
            "inicio": inicio,
        }
        total = self._conexao.execute(
            f"select count(*) as total from animais a where {FILTRO_LISTAGEM}", parametros
        ).fetchone()["total"]
        linhas = self._conexao.execute(
            f"""
            select a.id, a.nome, a.especie, a.raca, a.sexo, a.data_nascimento, a.microchip, {COLUNA_TUTOR}
            from animais a
            join tutores t on t.id = a.tutor_id
            where {FILTRO_LISTAGEM}
            order by a.nome
            limit %(limite)s offset %(inicio)s
            """,
            parametros,
        ).fetchall()
        return linhas, total

    def buscar_por_id(self, animal_id: str) -> dict | None:
        return self._conexao.execute(
            f"select a.*, {COLUNA_TUTOR} from animais a join tutores t on t.id = a.tutor_id where a.id = %s",
            (animal_id,),
        ).fetchone()

    def criar(self, dados: dict) -> str:
        return inserir(self._conexao, "animais", dados, retorno="id")["id"]

    def atualizar(self, animal_id: str, dados: dict) -> bool:
        return atualizar_por_id(self._conexao, "animais", animal_id, dados) is not None
