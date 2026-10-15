from datetime import datetime

from psycopg import Connection

from app.repositories.sql_utils import atualizar_por_id, inserir

SELECT_CADASTRO = """
select v.id, v.nome, v.crmv, v.especialidade, v.telefone, v.email, v.ativo, v.atualizado_em,
       case when u.id is null then null else json_build_object('email', u.email, 'ativo', p.ativo) end as acesso,
       (
         select count(*) from agendamentos ag
         where ag.veterinario_id = v.id and ag.inicio > %(agora)s and ag.status in ('agendado', 'confirmado')
       ) as agendamentos_futuros
from veterinarios v
left join perfis p on p.id = v.perfil_id
left join auth.users u on u.id = v.perfil_id
"""


class CadastroVeterinarioRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def listar(self, agora: datetime) -> list[dict]:
        return self._conexao.execute(
            f"{SELECT_CADASTRO} order by v.ativo desc, v.nome", {"agora": agora}
        ).fetchall()

    def buscar(self, veterinario_id: str, agora: datetime) -> dict | None:
        return self._conexao.execute(
            f"{SELECT_CADASTRO} where v.id = %(id)s", {"agora": agora, "id": veterinario_id}
        ).fetchone()

    def buscar_para_alteracao(self, veterinario_id: str) -> dict | None:
        return self._conexao.execute(
            "select id, perfil_id, ativo from veterinarios where id = %s for update", (veterinario_id,)
        ).fetchone()

    def criar(self, dados: dict) -> str:
        return inserir(self._conexao, "veterinarios", dados, retorno="id")["id"]

    def atualizar(self, veterinario_id: str, dados: dict) -> None:
        atualizar_por_id(self._conexao, "veterinarios", veterinario_id, dados)
