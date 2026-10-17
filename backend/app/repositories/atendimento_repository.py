from datetime import datetime

from psycopg import Connection

from app.repositories.sql_utils import atualizar_por_id, inserir, traduzir_erros_banco

SELECT_ATENDIMENTO = """
select at.*,
       json_build_object(
         'id', a.id, 'nome', a.nome, 'especie', a.especie, 'raca', a.raca, 'sexo', a.sexo,
         'data_nascimento', a.data_nascimento, 'peso_kg', a.peso_kg, 'altura_cm', a.altura_cm,
         'porte', a.porte, 'microchip', a.microchip, 'observacoes', a.observacoes
       ) as animal,
       json_build_object(
         'id', t.id, 'nome', t.nome, 'telefone_principal', t.telefone_principal, 'email', t.email,
         'endereco', t.endereco, 'bairro', t.bairro, 'cidade', t.cidade, 'estado', t.estado, 'cep', t.cep
       ) as tutor,
       json_build_object('id', v.id, 'nome', v.nome, 'perfil_id', v.perfil_id) as veterinario
from atendimentos at
join animais a on a.id = at.animal_id
join tutores t on t.id = a.tutor_id
join veterinarios v on v.id = at.veterinario_id
"""


class AtendimentoRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def criar(self, dados: dict) -> str:
        return inserir(self._conexao, "atendimentos", dados, retorno="id")["id"]

    def buscar(self, atendimento_id: str) -> dict | None:
        return self._conexao.execute(f"{SELECT_ATENDIMENTO} where at.id = %s", (atendimento_id,)).fetchone()

    def buscar_por_agendamento(self, agendamento_id: str) -> str | None:
        linha = self._conexao.execute(
            "select id from atendimentos where agendamento_id = %s", (agendamento_id,)
        ).fetchone()
        return linha["id"] if linha else None

    def buscar_para_alteracao(self, atendimento_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select id, status, veterinario_id, animal_id, agendamento_id, peso_kg
            from atendimentos where id = %s for update
            """,
            (atendimento_id,),
        ).fetchone()

    def atualizar(self, atendimento_id: str, dados: dict) -> None:
        atualizar_por_id(self._conexao, "atendimentos", atendimento_id, dados)

    def listar(
        self,
        animal_id: str | None,
        veterinario_id: str | None,
        status: str | None,
        limite: int,
    ) -> list[dict]:
        return self._conexao.execute(
            """
            select at.id, at.tipo, at.status, at.realizado_em, at.diagnostico,
                   json_build_object('id', a.id, 'nome', a.nome) as animal,
                   json_build_object('id', t.id, 'nome', t.nome) as tutor,
                   json_build_object('id', v.id, 'nome', v.nome) as veterinario
            from atendimentos at
            join animais a on a.id = at.animal_id
            join tutores t on t.id = a.tutor_id
            join veterinarios v on v.id = at.veterinario_id
            where (%(animal_id)s::uuid is null or at.animal_id = %(animal_id)s::uuid)
              and (%(veterinario_id)s::uuid is null or at.veterinario_id = %(veterinario_id)s::uuid)
              and (%(status)s::text is null or at.status::text = %(status)s)
            order by at.realizado_em desc
            limit %(limite)s
            """,
            {"animal_id": animal_id, "veterinario_id": veterinario_id, "status": status, "limite": limite},
        ).fetchall()

    def listar_exames(self, atendimento_id: str) -> list[dict]:
        return self._conexao.execute(
            "select id, nome, status, resultado from exames where atendimento_id = %s order by criado_em",
            (atendimento_id,),
        ).fetchall()

    def substituir_exames(self, atendimento_id: str, exames: list[dict], agora: datetime) -> None:
        self._conexao.execute("delete from exames where atendimento_id = %s", (atendimento_id,))
        for exame in exames:
            realizado = bool(exame["resultado"])
            self._conexao.execute(
                """
                insert into exames (atendimento_id, nome, status, resultado, realizado_em, criado_em)
                values (%s, %s, %s, %s, %s, clock_timestamp())
                """,
                (
                    atendimento_id,
                    exame["nome"],
                    "realizado" if realizado else "solicitado",
                    exame["resultado"],
                    agora if realizado else None,
                ),
            )

    def listar_vacinas(self, atendimento_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select id, vacina, lote, dose, aplicada_em, proxima_dose_em
            from vacinas_aplicadas where atendimento_id = %s order by criado_em
            """,
            (atendimento_id,),
        ).fetchall()

    def substituir_vacinas(self, atendimento_id: str, animal_id: str, aplicada_em, vacinas: list[dict]) -> None:
        self._conexao.execute("delete from vacinas_aplicadas where atendimento_id = %s", (atendimento_id,))
        with traduzir_erros_banco():
            for vacina in vacinas:
                self._conexao.execute(
                    """
                    insert into vacinas_aplicadas
                      (atendimento_id, animal_id, aplicada_em, vacina, lote, dose, proxima_dose_em, criado_em)
                    values (%(atendimento_id)s, %(animal_id)s, %(aplicada_em)s, %(vacina)s, %(lote)s, %(dose)s,
                            %(proxima_dose_em)s, clock_timestamp())
                    """,
                    {**vacina, "atendimento_id": atendimento_id, "animal_id": animal_id, "aplicada_em": aplicada_em},
                )

    def buscar_prescricao(self, atendimento_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select p.orientacoes,
                   coalesce(
                     json_agg(
                       json_build_object(
                         'medicamento', i.medicamento, 'dose', i.dose, 'frequencia', i.frequencia,
                         'duracao_dias', i.duracao_dias, 'via', i.via, 'observacoes', i.observacoes
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

    def substituir_prescricao(self, atendimento_id: str, prescricao: dict | None) -> None:
        self._conexao.execute("delete from prescricoes where atendimento_id = %s", (atendimento_id,))
        if prescricao is None:
            return
        prescricao_id = inserir(
            self._conexao,
            "prescricoes",
            {"atendimento_id": atendimento_id, "orientacoes": prescricao["orientacoes"]},
            retorno="id",
        )["id"]
        for item in prescricao["itens"]:
            self._conexao.execute(
                """
                insert into itens_prescricao
                  (prescricao_id, medicamento, dose, frequencia, intervalo_horas, duracao_dias, via, observacoes, criado_em)
                values (%(prescricao_id)s, %(medicamento)s, %(dose)s, %(frequencia)s, %(intervalo_horas)s,
                        %(duracao_dias)s, %(via)s, %(observacoes)s, clock_timestamp())
                """,
                {**item, "prescricao_id": prescricao_id},
            )

    def atualizar_peso_animal(self, animal_id: str, peso_kg: float) -> None:
        self._conexao.execute("update animais set peso_kg = %s where id = %s", (peso_kg, animal_id))


class AnexoRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def criar(self, dados: dict) -> dict:
        return inserir(
            self._conexao,
            "anexos",
            dados,
            retorno="id, nome_arquivo, tipo_mime, tamanho_bytes, exame_id, criado_em",
        )

    def listar(self, atendimento_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select id, nome_arquivo, tipo_mime, tamanho_bytes, exame_id, criado_em
            from anexos where atendimento_id = %s order by criado_em
            """,
            (atendimento_id,),
        ).fetchall()

    def buscar(self, anexo_id: str) -> dict | None:
        return self._conexao.execute(
            "select id, atendimento_id, nome_arquivo, tipo_mime, caminho_storage from anexos where id = %s",
            (anexo_id,),
        ).fetchone()

    def remover(self, anexo_id: str) -> None:
        self._conexao.execute("delete from anexos where id = %s", (anexo_id,))


class HistoricoRepository:
    def __init__(self, conexao: Connection) -> None:
        self._conexao = conexao

    def buscar_animal(self, animal_id: str) -> dict | None:
        return self._conexao.execute(
            """
            select json_build_object(
                     'id', a.id, 'nome', a.nome, 'especie', a.especie, 'raca', a.raca, 'sexo', a.sexo,
                     'data_nascimento', a.data_nascimento, 'peso_kg', a.peso_kg, 'altura_cm', a.altura_cm,
                     'porte', a.porte, 'microchip', a.microchip, 'observacoes', a.observacoes
                   ) as animal,
                   json_build_object('id', t.id, 'nome', t.nome) as tutor
            from animais a join tutores t on t.id = a.tutor_id
            where a.id = %s
            """,
            (animal_id,),
        ).fetchone()

    def atendimentos(self, animal_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select at.id, at.tipo, at.status, at.realizado_em, at.diagnostico, at.observacoes,
                   at.condicao_geral, at.retorno_em, v.nome as veterinario
            from atendimentos at join veterinarios v on v.id = at.veterinario_id
            where at.animal_id = %s
            """,
            (animal_id,),
        ).fetchall()

    def exames(self, animal_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select e.nome, e.status, e.resultado, coalesce(e.realizado_em, e.solicitado_em) as data,
                   at.id as atendimento_id, v.nome as veterinario
            from exames e
            join atendimentos at on at.id = e.atendimento_id
            join veterinarios v on v.id = at.veterinario_id
            where at.animal_id = %s and e.status <> 'cancelado'
            """,
            (animal_id,),
        ).fetchall()

    def vacinas(self, animal_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select va.vacina, va.dose, va.lote, va.aplicada_em, va.proxima_dose_em, va.atendimento_id,
                   at.realizado_em, v.nome as veterinario
            from vacinas_aplicadas va
            left join atendimentos at on at.id = va.atendimento_id
            left join veterinarios v on v.id = at.veterinario_id
            where va.animal_id = %s
            """,
            (animal_id,),
        ).fetchall()

    def prescricoes(self, animal_id: str) -> list[dict]:
        return self._conexao.execute(
            """
            select p.orientacoes, at.id as atendimento_id, at.realizado_em, v.nome as veterinario,
                   coalesce(array_agg(i.medicamento order by i.criado_em) filter (where i.id is not null), '{}') as medicamentos
            from prescricoes p
            join atendimentos at on at.id = p.atendimento_id
            join veterinarios v on v.id = at.veterinario_id
            left join itens_prescricao i on i.prescricao_id = p.id
            where at.animal_id = %s
            group by p.id, at.id, v.nome
            """,
            (animal_id,),
        ).fetchall()

    def proximo_agendamento(self, animal_id: str, agora: datetime) -> dict | None:
        return self._conexao.execute(
            """
            select ag.id, ag.inicio as data, ag.tipo, v.nome as veterinario
            from agendamentos ag join veterinarios v on v.id = ag.veterinario_id
            where ag.animal_id = %s and ag.inicio > %s and ag.status in ('agendado', 'confirmado')
            order by ag.inicio limit 1
            """,
            (animal_id, agora),
        ).fetchone()
