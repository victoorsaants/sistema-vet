from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.atendimento import Referencia

TipoNotificacao = Literal[
    "prescricao",
    "lembrete_medicamento",
    "lembrete_retorno",
    "lembrete_vacina",
    "confirmacao_agendamento",
]
StatusNotificacao = Literal["pendente", "enviada", "falhou", "cancelada"]


class TutorDaNotificacao(Referencia):
    email: str | None


class NotificacaoSaida(BaseModel):
    id: str
    tipo: TipoNotificacao
    canal: Literal["email", "whatsapp", "sms"]
    assunto: str
    mensagem: str
    agendada_para: datetime
    status: StatusNotificacao
    enviada_em: datetime | None
    erro: str | None
    destinatario: str | None
    tentativas: int
    atendimento_id: str | None
    agendamento_id: str | None
    tutor: TutorDaNotificacao
    animal: Referencia | None


class ResumoNotificacoes(BaseModel):
    atrasadas: int
    programadas: int
    com_falha: int
    modo_envio: Literal["smtp", "arquivo"] = "arquivo"


class ResultadoEnvio(BaseModel):
    enviadas: int
    com_falha: int
