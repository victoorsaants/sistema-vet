from datetime import datetime

from psycopg import Connection

from app.repositories.sql_utils import inserir, traduzir_erros_banco

STATUS_QUE_OCUPAM = ("agendado", "confirmado", "em_atendimento", "concluido")

SELECT_AGENDAMENTO = """
select ag.id, ag.inicio, ag.fim, ag.tipo, ag.especialidade, ag.status, ag.observacoes,
       json_build_object('id', a.id, 'nome', a.nome, 'especie', a.especie, 'raca', a.raca) as animal,
       json_build_object('id', t.id, 'nome', t.nome, 'telefone_principal', t.telefone_principal) as tutor,
       json_build_object('id', v.id, 'nome', v.nome) as veterinario
from agendamentos ag
join animais a on a.id = ag.animal_id
join tutores t on t.id = a.tutor_id
join veterinarios v on v.id = ag.veterinario_id
"""


class VeterinarioRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def listar_ativos(self) -> list[dict]:
        return self._conexao.execute(
            "select id, nome, crmv, especialidade from veterinarios where ativo order by nome"
        ).fetchall()

    def buscar_ativo(self, veterinario_id: str) -> dict | None:
        return self._conexao.execute(
            "select id, nome, crmv, especialidade from veterinarios where id = %s and ativo",
            (veterinario_id,),
        ).fetchone()

    def buscar_id_por_perfil(self, perfil_id: str) -> str | None:
        linha = self._conexao.execute(
            "select id from veterinarios where perfil_id = %s and ativo", (perfil_id,)
        ).fetchone()
        return linha["id"] if linha else None


class ExpedienteRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def listar_faixas(self, veterinario_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select dia_semana, hora_inicio, hora_fim, duracao_minutos
            from disponibilidades_veterinario
            where veterinario_id = %s
            order by dia_semana, hora_inicio
            """,
            (veterinario_id,),
        ).fetchall()

    def substituir_faixas(self, veterinario_id: str, faixas: list[dict]) -> None:
        with traduzir_erros_banco():
            self._conexao.execute(
                "delete from disponibilidades_veterinario where veterinario_id = %s", (veterinario_id,)
            )
            for faixa in faixas:
                self._conexao.execute(
                    """
                    insert into disponibilidades_veterinario
                      (veterinario_id, dia_semana, hora_inicio, hora_fim, duracao_minutos)
                    values (%(veterinario_id)s, %(dia_semana)s, %(hora_inicio)s, %(hora_fim)s, %(duracao_minutos)s)
                    """,
                    {**faixa, "veterinario_id": veterinario_id},
                )

    def listar_bloqueios(self, veterinario_id: str, a_partir_de: datetime) -> list[dict]:
        return self._conexao.execute(
            """
            select id, inicio, fim, motivo from bloqueios_agenda
            where veterinario_id = %s and fim > %s
            order by inicio
            """,
            (veterinario_id, a_partir_de),
        ).fetchall()

    def bloqueios_no_periodo(self, veterinario_id: str, inicio: datetime, fim: datetime) -> list[dict]:
        return self._conexao.execute(
            "select inicio, fim from bloqueios_agenda where veterinario_id = %s and inicio < %s and fim > %s",
            (veterinario_id, fim, inicio),
        ).fetchall()

    def criar_bloqueio(self, veterinario_id: str, inicio: datetime, fim: datetime, motivo: str | None) -> dict:
        return inserir(
            self._conexao,
            "bloqueios_agenda",
            {"veterinario_id": veterinario_id, "inicio": inicio, "fim": fim, "motivo": motivo},
            retorno="id, inicio, fim, motivo",
        )

    def remover_bloqueio(self, veterinario_id: str, bloqueio_id: str) -> bool:
        resultado = self._conexao.execute(
            "delete from bloqueios_agenda where id = %s and veterinario_id = %s", (bloqueio_id, veterinario_id)
        )
        return resultado.rowcount > 0


class AgendamentoRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def ocupados_no_periodo(self, veterinario_id: str, inicio: datetime, fim: datetime) -> list[dict]:
        return self._conexao.execute(
            """
            select inicio, fim from agendamentos
            where veterinario_id = %s and inicio < %s and fim > %s and status::text = any(%s)
            """,
            (veterinario_id, fim, inicio, list(STATUS_QUE_OCUPAM)),
        ).fetchall()

    def criar(self, dados: dict) -> str:
        return inserir(self._conexao, "agendamentos", dados, retorno="id")["id"]

    def buscar_por_id(self, agendamento_id: str) -> dict | None:
        return self._conexao.execute(f"{SELECT_AGENDAMENTO} where ag.id = %s", (agendamento_id,)).fetchone()

    def listar(
        self,
        de: datetime,
        ate: datetime | None,
        veterinario_id: str | None,
        status: list[str] | None,
        limite: int,
    ) -> list[dict]:
        return self._conexao.execute(
            f"""
            {SELECT_AGENDAMENTO}
            where ag.fim > %(de)s
              and (%(ate)s::timestamptz is null or ag.inicio < %(ate)s)
              and (%(veterinario_id)s::uuid is null or ag.veterinario_id = %(veterinario_id)s::uuid)
              and (%(status)s::text[] is null or ag.status::text = any(%(status)s))
            order by ag.inicio
            limit %(limite)s
            """,
            {"de": de, "ate": ate, "veterinario_id": veterinario_id, "status": status, "limite": limite},
        ).fetchall()

    def buscar_para_atendimento(self, agendamento_id: str) -> dict | None:
        return self._conexao.execute(
            "select status, veterinario_id, animal_id, tipo from agendamentos where id = %s for update",
            (agendamento_id,),
        ).fetchone()

    def buscar_status(self, agendamento_id: str) -> str | None:
        linha = self._conexao.execute(
            "select status from agendamentos where id = %s for update", (agendamento_id,)
        ).fetchone()
        return linha["status"] if linha else None

    def alterar_status(self, agendamento_id: str, status: str) -> None:
        self._conexao.execute("update agendamentos set status = %s where id = %s", (status, agendamento_id))
