import smtplib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import make_msgid
from pathlib import Path
from typing import Protocol

SEGUNDOS_LIMITE_SMTP = 20


@dataclass(frozen=True)
class Email:
    destinatario: str
    assunto: str
    texto: str
    html: str


class EnviadorEmail(Protocol):
    def enviar(self, email: Email) -> None: ...


def montar_mensagem(email: Email, remetente: str) -> EmailMessage:
    mensagem = EmailMessage()
    mensagem["From"] = remetente
    mensagem["To"] = email.destinatario
    mensagem["Subject"] = email.assunto
    mensagem["Message-ID"] = make_msgid(domain="ajuvet.local")
    mensagem.set_content(email.texto)
    mensagem.add_alternative(email.html, subtype="html")
    return mensagem


class EnviadorSmtp:
    def __init__(self, host: str, porta: int, usuario: str, senha: str, usar_tls: bool, remetente: str) -> None:
        self._host = host
        self._porta = porta
        self._usuario = usuario
        self._senha = senha
        self._usar_tls = usar_tls
        self._remetente = remetente

    def enviar(self, email: Email) -> None:
        with smtplib.SMTP(self._host, self._porta, timeout=SEGUNDOS_LIMITE_SMTP) as servidor:
            if self._usar_tls:
                servidor.starttls()
            if self._usuario:
                servidor.login(self._usuario, self._senha)
            servidor.send_message(montar_mensagem(email, self._remetente))


class EnviadorArquivo:
    def __init__(self, pasta: Path, remetente: str) -> None:
        self._pasta = pasta
        self._remetente = remetente

    def enviar(self, email: Email) -> None:
        self._pasta.mkdir(parents=True, exist_ok=True)
        carimbo = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        destino = self._pasta / f"{carimbo}-{uuid.uuid4().hex[:8]}.eml"
        destino.write_bytes(bytes(montar_mensagem(email, self._remetente)))
