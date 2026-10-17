import logging
import threading
from datetime import datetime, timezone

from app.api.dependencias import criar_enviador, criar_notificacao_service
from app.db.conexao import obter_pool
from app.schemas.notificacao import ResultadoEnvio

LIMITE_POR_RODADA = 100

registro = logging.getLogger("ajuvet.notificacoes")


def enviar_rodada() -> ResultadoEnvio:
    enviador = criar_enviador()
    enviadas = com_falha = 0
    for _ in range(LIMITE_POR_RODADA):
        with obter_pool().connection() as conexao:
            resultado = criar_notificacao_service(conexao).enviar_proxima(enviador, datetime.now(timezone.utc))
        if resultado is None:
            break
        if resultado:
            enviadas += 1
        else:
            com_falha += 1
    return ResultadoEnvio(enviadas=enviadas, com_falha=com_falha)


class DespachoNotificacoes:
    def __init__(self, intervalo_segundos: int) -> None:
        self._intervalo_segundos = intervalo_segundos
        self._parar = threading.Event()
        self._linha: threading.Thread | None = None

    def iniciar(self) -> None:
        self._linha = threading.Thread(target=self._executar, name="despacho-notificacoes", daemon=True)
        self._linha.start()

    def parar(self) -> None:
        self._parar.set()
        if self._linha:
            self._linha.join(timeout=10)

    def _executar(self) -> None:
        while not self._parar.is_set():
            try:
                resultado = enviar_rodada()
                if resultado.enviadas or resultado.com_falha:
                    registro.info("Notificações: %s enviadas, %s com falha.", resultado.enviadas, resultado.com_falha)
            except Exception:
                registro.exception("Não foi possível enviar as notificações pendentes.")
            self._parar.wait(self._intervalo_segundos)
