from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.dependencias import obter_animal_service, obter_tutor_service, obter_usuario_atual
from app.main import app
from app.schemas.auth import PerfilUsuario, UsuarioLogado
from app.schemas.comum import Pagina
from app.schemas.tutor import TutorSaida
from app.services.excecoes import ConflitoDados, DadosInvalidos, RecursoNaoEncontrado
from tests.test_cadastros_services import TUTOR_BANCO, TUTOR_ID

RECEPCIONISTA = UsuarioLogado(id="u1", email=None, nome="Mariana", perfil=PerfilUsuario.RECEPCAO)
VETERINARIA = UsuarioLogado(id="u2", email=None, nome="Mayara", perfil=PerfilUsuario.VETERINARIO)
NOVO_TUTOR = {
    "nome": "Juliana Ferreira",
    "telefone_principal": "79976543210",
    "cpf": "111.444.777-35",
    "endereco": "Av. Beira Mar, 500",
    "cidade": "Aracaju",
    "estado": "SE",
    "cep": "49020-000",
}
NOVO_ANIMAL = {"tutor_id": TUTOR_ID, "nome": "Mel", "especie": "Gato", "peso_kg": 4.2}


@pytest.fixture
def servicos() -> tuple[MagicMock, MagicMock]:
    tutor_service, animal_service = MagicMock(), MagicMock()
    app.dependency_overrides[obter_tutor_service] = lambda: tutor_service
    app.dependency_overrides[obter_animal_service] = lambda: animal_service
    yield tutor_service, animal_service
    app.dependency_overrides.clear()


def entrar_como(usuario: UsuarioLogado) -> TestClient:
    app.dependency_overrides[obter_usuario_atual] = lambda: usuario
    return TestClient(app)


def test_recepcao_cria_tutor(servicos: tuple[MagicMock, MagicMock]) -> None:
    tutor_service, _ = servicos
    tutor_service.criar.return_value = TutorSaida(**TUTOR_BANCO)

    resposta = entrar_como(RECEPCIONISTA).post("/api/v1/tutores", json=NOVO_TUTOR)

    assert resposta.status_code == 201
    assert resposta.json()["id"] == TUTOR_ID


def test_veterinario_nao_acessa_tutores(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(VETERINARIA).get("/api/v1/tutores")

    assert resposta.status_code == 403


def test_tutor_com_campos_invalidos_responde_em_portugues(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(RECEPCIONISTA).post(
        "/api/v1/tutores", json={**NOVO_TUTOR, "nome": None, "cpf": "111.111.111-11"}
    )

    assert resposta.status_code == 422
    assert resposta.json() == {
        "detail": "Verifique os campos destacados.",
        "campos": {"nome": "Campo obrigatório.", "cpf": "CPF inválido."},
    }


def test_cpf_repetido_responde_409(servicos: tuple[MagicMock, MagicMock]) -> None:
    tutor_service, _ = servicos
    tutor_service.criar.side_effect = ConflitoDados("Já existe um tutor cadastrado com este CPF.")

    resposta = entrar_como(RECEPCIONISTA).post("/api/v1/tutores", json=NOVO_TUTOR)

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Já existe um tutor cadastrado com este CPF."


def test_tutor_inexistente_responde_404(servicos: tuple[MagicMock, MagicMock]) -> None:
    tutor_service, _ = servicos
    tutor_service.obter.side_effect = RecursoNaoEncontrado("Tutor não encontrado.")

    resposta = entrar_como(RECEPCIONISTA).get(f"/api/v1/tutores/{TUTOR_ID}")

    assert resposta.status_code == 404


def test_id_mal_formado_responde_422(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(RECEPCIONISTA).get("/api/v1/tutores/abc")

    assert resposta.status_code == 422


def test_listagem_repassa_busca_e_paginacao(servicos: tuple[MagicMock, MagicMock]) -> None:
    tutor_service, _ = servicos
    tutor_service.listar.return_value = Pagina(itens=[], total=0, pagina=2, tamanho=10)

    resposta = entrar_como(RECEPCIONISTA).get("/api/v1/tutores?busca=carlos&pagina=2&tamanho=10")

    assert resposta.status_code == 200
    tutor_service.listar.assert_called_once_with("carlos", 2, 10)


def test_veterinario_consulta_animais(servicos: tuple[MagicMock, MagicMock]) -> None:
    _, animal_service = servicos
    animal_service.listar.return_value = Pagina(itens=[], total=0, pagina=1, tamanho=20)

    resposta = entrar_como(VETERINARIA).get(f"/api/v1/animais?tutor_id={TUTOR_ID}")

    assert resposta.status_code == 200
    animal_service.listar.assert_called_once_with(None, TUTOR_ID, 1, 20)


def test_veterinario_nao_cadastra_animal(servicos: tuple[MagicMock, MagicMock]) -> None:
    resposta = entrar_como(VETERINARIA).post("/api/v1/animais", json=NOVO_ANIMAL)

    assert resposta.status_code == 403


def test_animal_sem_tutor_valido_aponta_o_campo(servicos: tuple[MagicMock, MagicMock]) -> None:
    _, animal_service = servicos
    animal_service.criar.side_effect = DadosInvalidos({"tutor_id": "Selecione um tutor cadastrado."})

    resposta = entrar_como(RECEPCIONISTA).post("/api/v1/animais", json=NOVO_ANIMAL)

    assert resposta.status_code == 422
    assert resposta.json()["campos"] == {"tutor_id": "Selecione um tutor cadastrado."}


def test_sem_login_nao_acessa_animais() -> None:
    app.dependency_overrides.clear()

    resposta = TestClient(app).get("/api/v1/animais")

    assert resposta.status_code == 401
