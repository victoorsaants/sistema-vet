from app.repositories.animal_repository import AnimalRepository
from app.repositories.tutor_repository import TutorRepository
from app.schemas.animal import AnimalEntrada, AnimalResumo, AnimalSaida
from app.schemas.comum import Pagina
from app.services.excecoes import DadosInvalidos, RecursoNaoEncontrado

ANIMAL_NAO_ENCONTRADO = "Animal não encontrado."
LIMITE_TUTORES_NA_BUSCA = 50


class AnimalService:
    def __init__(
        self,
        animal_repository: AnimalRepository,
        tutor_repository: TutorRepository,
    ) -> None:
        self._animal_repository = animal_repository
        self._tutor_repository = tutor_repository

    def listar(
        self,
        busca: str | None,
        tutor_id: str | None,
        pagina: int,
        tamanho: int,
    ) -> Pagina[AnimalResumo]:
        tutores_encontrados = (
            self._tutor_repository.buscar_ids_por_nome(busca, LIMITE_TUTORES_NA_BUSCA) if busca else []
        )
        inicio = (pagina - 1) * tamanho
        linhas, total = self._animal_repository.listar(
            busca, tutor_id, tutores_encontrados, inicio, inicio + tamanho - 1
        )
        itens = [AnimalResumo(**linha) for linha in linhas]
        return Pagina(itens=itens, total=total, pagina=pagina, tamanho=tamanho)

    def obter(self, animal_id: str) -> AnimalSaida:
        animal = self._animal_repository.buscar_por_id(animal_id)
        if animal is None:
            raise RecursoNaoEncontrado(ANIMAL_NAO_ENCONTRADO)
        return AnimalSaida(**animal)

    def criar(self, entrada: AnimalEntrada) -> AnimalSaida:
        self._garantir_tutor(str(entrada.tutor_id))
        animal_id = self._animal_repository.criar(entrada.model_dump(mode="json"))
        return self.obter(animal_id)

    def atualizar(self, animal_id: str, entrada: AnimalEntrada) -> AnimalSaida:
        self._garantir_tutor(str(entrada.tutor_id))
        if not self._animal_repository.atualizar(animal_id, entrada.model_dump(mode="json")):
            raise RecursoNaoEncontrado(ANIMAL_NAO_ENCONTRADO)
        return self.obter(animal_id)

    def _garantir_tutor(self, tutor_id: str) -> None:
        tutor = self._tutor_repository.buscar_por_id(tutor_id)
        if tutor is None or not tutor["ativo"]:
            raise DadosInvalidos({"tutor_id": "Selecione um tutor cadastrado."})
