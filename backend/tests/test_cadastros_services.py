from unittest.mock import MagicMock

import pytest

from app.schemas.animal import AnimalEntrada
from app.schemas.tutor import TutorEntrada
from app.services.animal_service import AnimalService
from app.services.excecoes import DadosInvalidos, RecursoNaoEncontrado
from app.services.tutor_service import TutorService

TUTOR_ID = "20000000-0000-4000-8000-000000000001"
DATAS = {"criado_em": "2026-10-15T12:00:00+00:00", "atualizado_em": "2026-10-15T12:00:00+00:00"}
TUTOR_BANCO = {
    "id": TUTOR_ID,
    "nome": "Carlos Eduardo Silva",
    "cpf": "52998224725",
    "data_nascimento": None,
    "telefone_principal": "79988881234",
    "telefone_secundario": None,
    "email": None,
    "cep": None,
    "endereco": None,
    "bairro": None,
    "cidade": "Aracaju",
    "estado": "SE",
    "como_conheceu": None,
    "ativo": True,
    **DATAS,
}
ANIMAL_BANCO = {
    "id": "30000000-0000-4000-8000-000000000001",
    "nome": "Thor",
    "especie": "Cão",
    "raca": "Golden Retriever",
    "sexo": "macho",
    "data_nascimento": "2023-08-12",
    "cor_pelagem": None,
    "peso_kg": 32.5,
    "altura_cm": None,
    "largura_cm": None,
    "porte": "grande",
    "microchip": "985321654987",
    "castrado": True,
    "observacoes": None,
    "ativo": True,
    "tutor": {"id": TUTOR_ID, "nome": "Carlos Eduardo Silva", "telefone_principal": "79988881234"},
    **DATAS,
}


def test_listar_tutores_calcula_pagina_e_total_de_animais() -> None:
    repositorio = MagicMock()
    repositorio.listar.return_value = (
        [
            {**TUTOR_BANCO, "total_animais": 2},
            {**TUTOR_BANCO, "id": "outro", "total_animais": 0},
        ],
        42,
    )

    pagina = TutorService(repositorio).listar("carlos", pagina=3, tamanho=10)

    repositorio.listar.assert_called_once_with("carlos", 20, 29)
    assert pagina.total == 42
    assert [tutor.total_animais for tutor in pagina.itens] == [2, 0]


def test_obter_tutor_inexistente_gera_nao_encontrado() -> None:
    repositorio = MagicMock()
    repositorio.buscar_por_id.return_value = None

    with pytest.raises(RecursoNaoEncontrado):
        TutorService(repositorio).obter(TUTOR_ID)


def test_criar_tutor_grava_dados_normalizados() -> None:
    repositorio = MagicMock()
    repositorio.criar.return_value = TUTOR_BANCO
    entrada = TutorEntrada(
        nome="Carlos Eduardo Silva",
        cpf="529.982.247-25",
        telefone_principal="(79) 98888-1234",
        endereco="Rua das Palmeiras, 123",
        cidade="Aracaju",
        estado="SE",
        cep="49037-000",
    )

    tutor = TutorService(repositorio).criar(entrada)

    gravado = repositorio.criar.call_args.args[0]
    assert gravado["cpf"] == "52998224725"
    assert gravado["telefone_principal"] == "79988881234"
    assert tutor.id == TUTOR_ID


def test_criar_animal_para_tutor_inexistente_gera_dados_invalidos() -> None:
    animais, tutores = MagicMock(), MagicMock()
    tutores.buscar_por_id.return_value = None
    entrada = AnimalEntrada(tutor_id=TUTOR_ID, nome="Thor", especie="Cão", peso_kg=32.5)

    with pytest.raises(DadosInvalidos) as erro:
        AnimalService(animais, tutores).criar(entrada)

    assert erro.value.campos == {"tutor_id": "Selecione um tutor cadastrado."}
    animais.criar.assert_not_called()


def test_criar_animal_devolve_animal_com_tutor() -> None:
    animais, tutores = MagicMock(), MagicMock()
    tutores.buscar_por_id.return_value = TUTOR_BANCO
    animais.criar.return_value = ANIMAL_BANCO["id"]
    animais.buscar_por_id.return_value = ANIMAL_BANCO
    entrada = AnimalEntrada(tutor_id=TUTOR_ID, nome="Thor", especie="Cão", peso_kg=32.5)

    animal = AnimalService(animais, tutores).criar(entrada)

    assert animais.criar.call_args.args[0]["tutor_id"] == TUTOR_ID
    assert animal.tutor.nome == "Carlos Eduardo Silva"


def test_listar_animais_inclui_tutores_encontrados_pelo_nome() -> None:
    animais, tutores = MagicMock(), MagicMock()
    tutores.buscar_ids_por_nome.return_value = [TUTOR_ID]
    animais.listar.return_value = ([ANIMAL_BANCO], 1)

    pagina = AnimalService(animais, tutores).listar("carlos", None, pagina=1, tamanho=20)

    animais.listar.assert_called_once_with("carlos", None, [TUTOR_ID], 0, 19)
    assert pagina.itens[0].nome == "Thor"


def test_atualizar_animal_inexistente_gera_nao_encontrado() -> None:
    animais, tutores = MagicMock(), MagicMock()
    tutores.buscar_por_id.return_value = TUTOR_BANCO
    animais.atualizar.return_value = False
    entrada = AnimalEntrada(tutor_id=TUTOR_ID, nome="Thor", especie="Cão", peso_kg=32.5)

    with pytest.raises(RecursoNaoEncontrado):
        AnimalService(animais, tutores).atualizar("nao-existe", entrada)
