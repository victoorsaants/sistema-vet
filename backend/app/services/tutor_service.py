from app.repositories.tutor_repository import TutorRepository
from app.schemas.comum import Pagina
from app.schemas.tutor import TutorEntrada, TutorResumo, TutorSaida
from app.services.excecoes import RecursoNaoEncontrado

TUTOR_NAO_ENCONTRADO = "Tutor não encontrado."


class TutorService:
    def __init__(self, tutor_repository: TutorRepository) -> None:
        self._tutor_repository = tutor_repository

    def listar(self, busca: str | None, pagina: int, tamanho: int) -> Pagina[TutorResumo]:
        inicio = (pagina - 1) * tamanho
        linhas, total = self._tutor_repository.listar(busca, inicio, inicio + tamanho - 1)
        itens = [TutorResumo(**linha) for linha in linhas]
        return Pagina(itens=itens, total=total, pagina=pagina, tamanho=tamanho)

    def obter(self, tutor_id: str) -> TutorSaida:
        tutor = self._tutor_repository.buscar_por_id(tutor_id)
        if tutor is None:
            raise RecursoNaoEncontrado(TUTOR_NAO_ENCONTRADO)
        return TutorSaida(**tutor)

    def criar(self, entrada: TutorEntrada) -> TutorSaida:
        return TutorSaida(**self._tutor_repository.criar(entrada.model_dump(mode="json")))

    def atualizar(self, tutor_id: str, entrada: TutorEntrada) -> TutorSaida:
        tutor = self._tutor_repository.atualizar(tutor_id, entrada.model_dump(mode="json"))
        if tutor is None:
            raise RecursoNaoEncontrado(TUTOR_NAO_ENCONTRADO)
        return TutorSaida(**tutor)
