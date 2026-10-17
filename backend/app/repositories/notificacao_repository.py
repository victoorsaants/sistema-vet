from datetime import datetime

from psycopg import Connection

from app.repositories.sql_utils import atualizar_por_id, padrao_contem

COLUNAS_NOVA = (
    "tutor_id",
    "animal_id",
    "atendimento_id",
    "prescricao_id",
    "agendamento_id",
    "tipo",
    "canal",
    "assunto",
    "mensagem",
    "agendada_para",
)

SELECT_NOTIFICACAO = """
select n.id, n.tipo, n.canal, n.assunto, n.mensagem, n.agendada_para, n.status, n.enviada_em, n.erro,
       n.destinatario, n.tentativas, n.atendimento_id, n.agendamento_id,
       json_build_object('id', t.id, 'nome', t.nome, 'email', t.email) as tutor,
       case when a.id is null then null else json_build_object('id', a.id, 'nome', a.nome) end as animal
from notificacoes n
join tutores t on t.id = n.tutor_id
left join animais a on a.id = n.animal_id
"""

FILTRO_LISTAGEM = """
(%(status)s::text is null or n.status::text = %(status)s)
and (%(tipo)s::text is null or n.tipo::text = %(tipo)s)
and (%(atendimento_id)s::uuid is null or n.atendimento_id = %(atendimento_id)s::uuid)
and (%(padrao)s::text is null or t.nome ilike %(padrao)s or a.nome ilike %(padrao)s)
"""


class NotificacaoRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def dados_do_atendimento(self, atendimento_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select at.id as atendimento_id, at.realizado_em, at.retorno_em,
                   a.id as animal_id, a.nome as animal_nome, a.sexo as animal_sexo,
                   t.id as tutor_id, t.nome as tutor_nome,
                   v.nome as veterinario_nome, v.crmv as veterinario_crmv
            from atendimentos at
            join animais a on a.id = at.animal_id
            join tutores t on t.id = a.tutor_id
            join veterinarios v on v.id = at.veterinario_id
            where at.id = %s
            """,
            (atendimento_id,),
        ).fetchone()

    def prescricao_do_atendimento(self, atendimento_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select p.id, p.orientacoes,
                   coalesce(
                     json_agg(
                       json_build_object(
                         'medicamento', i.medicamento, 'dose', i.dose, 'frequencia', i.frequencia,
                         'intervalo_horas', i.intervalo_horas, 'duracao_dias', i.duracao_dias,
                         'via', i.via, 'observacoes', i.observacoes
                       ) order by i.criado_em
                     ) filter (where i.id is not null),
                     '[]'
                   ) as itens
            from prescricoes p
            left join itens_prescricao i on i.prescricao_id = p.id
            where p.atendimento_id = %s
            group by p.id
            """,
            (atendimento_id,),
        ).fetchone()

    def vacinas_com_proxima_dose(self, atendimento_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select vacina, proxima_dose_em from vacinas_aplicadas
            where atendimento_id = %s and proxima_dose_em is not null
            order by criado_em
            """,
            (atendimento_id,),
        ).fetchall()

    def dados_do_agendamento(self, agendamento_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select ag.id as agendamento_id, ag.inicio, ag.tipo,
                   a.id as animal_id, a.nome as animal_nome, a.sexo as animal_sexo,
                   t.id as tutor_id, t.nome as tutor_nome, v.nome as veterinario_nome
            from agendamentos ag
            join animais a on a.id = ag.animal_id
            join tutores t on t.id = a.tutor_id
            join veterinarios v on v.id = ag.veterinario_id
            where ag.id = %s
            """,
            (agendamento_id,),
        ).fetchone()

    def criar(self, notificacoes: list[dict]) -> None:
        if not notificacoes:
            return
        colunas = ", ".join(COLUNAS_NOVA)
        valores = ", ".join(f"%({coluna})s" for coluna in COLUNAS_NOVA)
        with self._conexao.cursor() as cursor:
            cursor.executemany(
                f"insert into notificacoes ({colunas}) values ({valores})",
                [{coluna: notificacao.get(coluna) for coluna in COLUNAS_NOVA} for notificacao in notificacoes],
            )

    def cancelar_pendentes_do_agendamento(self, agendamento_id: str) -> None:
        self._conexao.execute(
            "update notificacoes set status = 'cancelada' where agendamento_id = %s and status = 'pendente'",
            (agendamento_id,),
        )

    def listar(self, filtros: dict, inicio: int, limite: int) -> tuple[list[dict], int]:
        parametros = {
            "status": filtros.get("status"),
            "tipo": filtros.get("tipo"),
            "atendimento_id": filtros.get("atendimento_id"),
            "padrao": padrao_contem(filtros["busca"]) if filtros.get("busca") else None,
            "inicio": inicio,
            "limite": limite,
        }
        total = self._conexao.execute(
            f"""
            select count(*) as total from notificacoes n
            join tutores t on t.id = n.tutor_id
            left join animais a on a.id = n.animal_id
            where {FILTRO_LISTAGEM}
            """,
            parametros,
        ).fetchone()["total"]
        ordem = "asc" if filtros.get("status") == "pendente" else "desc"
        linhas = self._conexao.execute(
            f"""
            {SELECT_NOTIFICACAO}
            where {FILTRO_LISTAGEM}
            order by n.agendada_para {ordem}, n.criado_em
            limit %(limite)s offset %(inicio)s
            """,
            parametros,
        ).fetchall()
        return linhas, total

    def buscar(self, notificacao_id: str) -> dict | None:
        return self._conexao.execute(f"{SELECT_NOTIFICACAO} where n.id = %s", (notificacao_id,)).fetchone()

    def buscar_status(self, notificacao_id: str) -> str | None:
        linha = self._conexao.execute(
            "select status from notificacoes where id = %s for update", (notificacao_id,)
        ).fetchone()
        return linha["status"] if linha else None

    def atualizar(self, notificacao_id: str, dados: dict) -> None:
        atualizar_por_id(self._conexao, "notificacoes", notificacao_id, dados)

    def proxima_para_envio(self, agora: datetime) -> dict | None:
        return self._conexao.execute(
            """
            select n.id, n.assunto, n.mensagem, n.tentativas, t.email
            from notificacoes n join tutores t on t.id = n.tutor_id
            where n.status = 'pendente' and n.agendada_para <= %s
            order by n.agendada_para
            limit 1
            for update of n skip locked
            """,
            (agora,),
        ).fetchone()

    def contar_por_status(self, agora: datetime) -> dict:
        return self._conexao.execute(
            """
            select count(*) filter (where status = 'pendente' and agendada_para <= %(agora)s) as atrasadas,
                   count(*) filter (where status = 'pendente') as programadas,
                   count(*) filter (where status = 'falhou') as com_falha
            from notificacoes
            """,
            {"agora": agora},
        ).fetchone()
