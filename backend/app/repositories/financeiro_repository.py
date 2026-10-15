from datetime import date

from psycopg import Connection

from app.repositories.sql_utils import atualizar_por_id, inserir, padrao_contem

SELECT_LANCAMENTO = """
select l.id, l.tipo, l.descricao, l.valor::float8 as valor, l.forma_pagamento, l.status,
       l.data_competencia, l.vencimento, l.pago_em, l.criado_em, l.atualizado_em,
       json_build_object('id', c.id, 'nome', c.nome) as categoria,
       case when t.id is null then null else json_build_object('id', t.id, 'nome', t.nome) end as tutor,
       case when at.id is null then null else json_build_object(
         'id', at.id, 'tipo', at.tipo, 'realizado_em', at.realizado_em, 'animal', a.nome
       ) end as atendimento,
       p.nome as registrado_por
from lancamentos l
join categorias_financeiras c on c.id = l.categoria_id
left join tutores t on t.id = l.tutor_id
left join atendimentos at on at.id = l.atendimento_id
left join animais a on a.id = at.animal_id
left join perfis p on p.id = l.registrado_por
"""

FILTRO_LANCAMENTOS = """
(%(tipo)s::text is null or l.tipo::text = %(tipo)s)
and (%(status)s::text is null or l.status::text = %(status)s)
and (%(categoria_id)s::uuid is null or l.categoria_id = %(categoria_id)s::uuid)
and (%(atendimento_id)s::uuid is null or l.atendimento_id = %(atendimento_id)s::uuid)
and (%(de)s::date is null or l.data_competencia >= %(de)s)
and (%(ate)s::date is null or l.data_competencia <= %(ate)s)
and (
  %(padrao)s::text is null
  or l.descricao ilike %(padrao)s
  or exists (select 1 from tutores tb where tb.id = l.tutor_id and tb.nome ilike %(padrao)s)
)
"""


def parametros_filtro(filtros: dict) -> dict:
    return {
        "tipo": filtros.get("tipo"),
        "status": filtros.get("status"),
        "categoria_id": filtros.get("categoria_id"),
        "atendimento_id": filtros.get("atendimento_id"),
        "de": filtros.get("de"),
        "ate": filtros.get("ate"),
        "padrao": padrao_contem(filtros["busca"]) if filtros.get("busca") else None,
    }


class FinanceiroRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def listar_categorias(self, tipo: str | None) -> list[dict]:
        return self._conexao.execute(
            """
            select id, nome, tipo from categorias_financeiras
            where ativo and (%(tipo)s::text is null or tipo::text = %(tipo)s)
            order by tipo, nome like 'Outr%%', nome
            """,
            {"tipo": tipo},
        ).fetchall()

    def buscar_categoria(self, categoria_id: str) -> dict | None:
        return self._conexao.execute(
            "select id, nome, tipo, ativo from categorias_financeiras where id = %s", (categoria_id,)
        ).fetchone()

    def tutor_existe(self, tutor_id: str) -> bool:
        return self._conexao.execute("select 1 from tutores where id = %s", (tutor_id,)).fetchone() is not None

    def tutor_do_atendimento(self, atendimento_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select a.tutor_id from atendimentos at join animais a on a.id = at.animal_id
            where at.id = %s
            """,
            (atendimento_id,),
        ).fetchone()

    def criar(self, dados: dict) -> str:
        return inserir(self._conexao, "lancamentos", dados, retorno="id")["id"]

    def buscar(self, lancamento_id: str) -> dict | None:
        return self._conexao.execute(f"{SELECT_LANCAMENTO} where l.id = %s", (lancamento_id,)).fetchone()

    def buscar_para_alteracao(self, lancamento_id: str) -> dict | None:
        return self._conexao.execute(
            "select id, tipo, status from lancamentos where id = %s for update", (lancamento_id,)
        ).fetchone()

    def atualizar(self, lancamento_id: str, dados: dict) -> None:
        atualizar_por_id(self._conexao, "lancamentos", lancamento_id, dados)

    def listar(self, filtros: dict, inicio: int, limite: int) -> tuple[list[dict], dict]:
        parametros = {**parametros_filtro(filtros), "inicio": inicio, "limite": limite}
        totais = self._conexao.execute(
            f"""
            select count(*) as total,
                   coalesce(sum(l.valor) filter (where l.tipo = 'receita' and l.status <> 'cancelado'), 0)::float8
                     as total_receitas,
                   coalesce(sum(l.valor) filter (where l.tipo = 'despesa' and l.status <> 'cancelado'), 0)::float8
                     as total_despesas
            from lancamentos l
            where {FILTRO_LANCAMENTOS}
            """,
            parametros,
        ).fetchone()
        linhas = self._conexao.execute(
            f"""
            {SELECT_LANCAMENTO}
            where {FILTRO_LANCAMENTOS}
            order by l.data_competencia desc, l.criado_em desc
            limit %(limite)s offset %(inicio)s
            """,
            parametros,
        ).fetchall()
        return linhas, totais

    def listar_para_relatorio(self, filtros: dict, limite: int) -> list[dict]:
        return self._conexao.execute(
            f"""
            {SELECT_LANCAMENTO}
            where {FILTRO_LANCAMENTOS}
            order by l.data_competencia, l.criado_em
            limit %(limite)s
            """,
            {**parametros_filtro(filtros), "limite": limite},
        ).fetchall()

    def totais_do_periodo(self, inicio: date, fim: date) -> dict:
        return self._conexao.execute(
            """
            select
              coalesce(sum(valor) filter (where tipo = 'receita' and status = 'pago'), 0)::float8 as receitas,
              coalesce(sum(valor) filter (where tipo = 'despesa' and status = 'pago'), 0)::float8 as despesas,
              coalesce(sum(valor) filter (where tipo = 'receita' and status = 'pendente'), 0)::float8 as a_receber,
              coalesce(sum(valor) filter (where tipo = 'despesa' and status = 'pendente'), 0)::float8 as a_pagar,
              count(*) filter (where status <> 'cancelado') as lancamentos
            from lancamentos
            where data_competencia >= %s and data_competencia < %s
            """,
            (inicio, fim),
        ).fetchone()

    def fluxo_mensal(self, inicio: date, fim: date) -> list[dict]:
        return self._conexao.execute(
            """
            select date_trunc('month', data_competencia)::date as mes,
                   coalesce(sum(valor) filter (where tipo = 'receita'), 0)::float8 as receitas,
                   coalesce(sum(valor) filter (where tipo = 'despesa'), 0)::float8 as despesas
            from lancamentos
            where status = 'pago' and data_competencia >= %s and data_competencia < %s
            group by 1
            """,
            (inicio, fim),
        ).fetchall()

    def despesas_por_categoria(self, inicio: date, fim: date) -> list[dict]:
        return self._conexao.execute(
            """
            select c.nome as categoria, sum(l.valor)::float8 as valor
            from lancamentos l join categorias_financeiras c on c.id = l.categoria_id
            where l.tipo = 'despesa' and l.status = 'pago'
              and l.data_competencia >= %s and l.data_competencia < %s
            group by c.nome
            order by valor desc
            """,
            (inicio, fim),
        ).fetchall()

    def ultimos_do_periodo(self, inicio: date, fim: date, limite: int) -> list[dict]:
        return self._conexao.execute(
            f"""
            {SELECT_LANCAMENTO}
            where l.data_competencia >= %s and l.data_competencia < %s
            order by l.data_competencia desc, l.criado_em desc
            limit %s
            """,
            (inicio, fim, limite),
        ).fetchall()
