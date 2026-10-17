from dataclasses import dataclass
from datetime import date, datetime
from html import escape
from zoneinfo import ZoneInfo

DIAS_DA_SEMANA = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]

NOMES_TIPO_CONSULTA = {
    "consulta": ("consulta", "marcada"),
    "retorno": ("retorno", "marcado"),
    "vacinacao": ("vacinação", "marcada"),
    "exame": ("exame", "marcado"),
    "procedimento": ("procedimento", "marcado"),
}


@dataclass(frozen=True)
class Mensagem:
    assunto: str
    texto: str


@dataclass(frozen=True)
class DoseLembrete:
    medicamento: str
    dose: str
    numero: int
    total: int


def primeiro_nome(nome: str) -> str:
    partes = nome.split()
    return partes[0] if partes else nome


def formatar_data(data: date) -> str:
    return data.strftime("%d/%m/%Y")


def do_animal(dados: dict) -> str:
    artigo = {"macho": "do", "femea": "da"}.get(dados.get("animal_sexo"), "do(a)")
    return f"{artigo} {dados['animal_nome']}"


def o_animal(dados: dict) -> str:
    artigo = {"macho": "o", "femea": "a"}.get(dados.get("animal_sexo"), "o(a)")
    return f"{artigo} {dados['animal_nome']}"


def identificar_crmv(crmv: str) -> str:
    return crmv if crmv.upper().startswith("CRMV") else f"CRMV {crmv}"


def descrever_item(item: dict) -> str:
    partes = [item["dose"], item["frequencia"]]
    if item.get("duracao_dias"):
        partes.append(f"por {item['duracao_dias']} {'dia' if item['duracao_dias'] == 1 else 'dias'}")
    texto = f"- {item['medicamento']}: {', '.join(partes)}"
    if item.get("via"):
        texto += f" (via {item['via']})"
    if item.get("observacoes"):
        texto += f". Obs.: {item['observacoes']}"
    return texto


class RedatorMensagens:
    def __init__(self, nome_clinica: str, contato_clinica: str, fuso: ZoneInfo) -> None:
        self._nome_clinica = nome_clinica
        self._contato_clinica = contato_clinica
        self._fuso = fuso

    def receita(
        self,
        dados: dict,
        itens: list[dict],
        orientacoes: str | None,
        primeiro_lembrete: datetime | None,
    ) -> Mensagem:
        blocos = [
            f"Olá, {primeiro_nome(dados['tutor_nome'])}!",
            f"Segue a receita {do_animal(dados)}, prescrita por {dados['veterinario_nome']} "
            f"({identificar_crmv(dados['veterinario_crmv'])}) no atendimento de {self._data(dados['realizado_em'])}.",
        ]
        if itens:
            blocos.append("Medicamentos:\n" + "\n".join(descrever_item(item) for item in itens))
        if orientacoes:
            blocos.append(f"Orientações:\n{orientacoes}")
        if primeiro_lembrete:
            blocos.append(
                "Vamos enviar lembretes nos horários das doses, a partir de "
                f"{self._data(primeiro_lembrete)} às {self._hora(primeiro_lembrete)}."
            )
        if dados.get("retorno_em"):
            blocos.append(f"Retorno recomendado: {formatar_data(dados['retorno_em'])}.")
        return Mensagem(f"Receita {do_animal(dados)}", self._fechar(blocos))

    def lembrete_medicamento(self, dados: dict, doses: list[DoseLembrete]) -> Mensagem:
        linhas = "\n".join(f"- {dose.medicamento}: {dose.dose} (dose {dose.numero} de {dose.total})" for dose in doses)
        blocos = [
            f"Olá, {primeiro_nome(dados['tutor_nome'])}!",
            f"Está na hora do remédio {do_animal(dados)}:\n{linhas}",
            f"Siga as orientações da receita enviada por {dados['veterinario_nome']}.",
        ]
        return Mensagem(f"Hora do remédio {do_animal(dados)}", self._fechar(blocos))

    def lembrete_retorno(self, dados: dict) -> Mensagem:
        blocos = [
            f"Olá, {primeiro_nome(dados['tutor_nome'])}!",
            f"O retorno {do_animal(dados)} com {dados['veterinario_nome']} está recomendado para "
            f"{formatar_data(dados['retorno_em'])}.",
            "Se ainda não marcou o horário, entre em contato com a clínica para agendar.",
        ]
        return Mensagem(f"Lembrete de retorno {do_animal(dados)}", self._fechar(blocos))

    def lembrete_vacina(self, dados: dict, vacina: str, proxima_dose_em: date) -> Mensagem:
        blocos = [
            f"Olá, {primeiro_nome(dados['tutor_nome'])}!",
            f"A próxima dose da vacina {vacina} {do_animal(dados)} está prevista para {formatar_data(proxima_dose_em)}.",
            "Entre em contato com a clínica para agendar a aplicação.",
        ]
        return Mensagem(f"Vacina {do_animal(dados)}: próxima dose em {formatar_data(proxima_dose_em)}", self._fechar(blocos))

    def lembrete_agendamento(self, dados: dict) -> Mensagem:
        inicio = dados["inicio"]
        tipo, marcado = NOMES_TIPO_CONSULTA[dados["tipo"]]
        local = inicio.astimezone(self._fuso)
        blocos = [
            f"Olá, {primeiro_nome(dados['tutor_nome'])}!",
            f"Lembramos que {o_animal(dados)} tem {tipo} {marcado} para {DIAS_DA_SEMANA[local.weekday()]}, "
            f"{self._data(inicio)}, às {self._hora(inicio)}, com {dados['veterinario_nome']}.",
            "Se não puder comparecer, avise a clínica para remarcar o horário.",
        ]
        return Mensagem(f"Lembrete: {tipo} {do_animal(dados)} em {self._data(inicio)} às {self._hora(inicio)}", self._fechar(blocos))

    def html(self, assunto: str, texto: str) -> str:
        paragrafos = "".join(
            f'<p style="margin:0 0 14px">{escape(bloco).replace(chr(10), "<br>")}</p>' for bloco in texto.split("\n\n")
        )
        return (
            '<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3fbfe;'
            'font-family:Arial,Helvetica,sans-serif;color:#0b3d78">'
            '<div style="max-width:560px;margin:0 auto;padding:24px">'
            '<div style="background:#073256;color:#ffffff;border-radius:12px 12px 0 0;padding:16px 24px;'
            f'font-size:20px;font-weight:bold">{escape(self._nome_clinica)}</div>'
            '<div style="background:#ffffff;border:1px solid #e3eef7;border-top:0;border-radius:0 0 12px 12px;'
            'padding:24px;font-size:15px;line-height:1.5">'
            f'<h1 style="font-size:18px;margin:0 0 16px">{escape(assunto)}</h1>{paragrafos}</div>'
            "</div></body></html>"
        )

    def _fechar(self, blocos: list[str]) -> str:
        contato = f": {self._contato_clinica}" if self._contato_clinica else ""
        return "\n\n".join([*blocos, f"Em caso de dúvidas, fale com a clínica{contato}.\n{self._nome_clinica}"])

    def _data(self, instante: datetime) -> str:
        return formatar_data(instante.astimezone(self._fuso).date())

    def _hora(self, instante: datetime) -> str:
        return instante.astimezone(self._fuso).strftime("%H:%M")
