import pytest
from pydantic import ValidationError

from app.schemas.animal import AnimalEntrada
from app.schemas.tutor import TutorEntrada
from app.schemas.validadores import cpf_tem_digitos_validos

TUTOR_VALIDO = {
    "nome": "Carlos Eduardo Silva",
    "cpf": "529.982.247-25",
    "telefone_principal": "(79) 98888-1234",
    "email": "Carlos@Example.com",
    "cep": "49037-000",
    "estado": "se",
    "endereco": "Rua das Palmeiras, 123",
    "cidade": "Aracaju",
}


def erros_por_campo(erro: ValidationError) -> dict[str, str]:
    return {str(item["loc"][-1]): item["msg"] for item in erro.errors()}


@pytest.mark.parametrize("cpf", ["52998224725", "11144477735", "39053344705"])
def test_cpf_com_digitos_validos(cpf: str) -> None:
    assert cpf_tem_digitos_validos(cpf)


@pytest.mark.parametrize("cpf", ["52998224724", "11111111111", "123", "00000000001"])
def test_cpf_com_digitos_invalidos(cpf: str) -> None:
    assert not cpf_tem_digitos_validos(cpf)


def test_tutor_normaliza_documentos_e_contatos() -> None:
    tutor = TutorEntrada(**TUTOR_VALIDO)

    assert tutor.cpf == "52998224725"
    assert tutor.telefone_principal == "79988881234"
    assert tutor.cep == "49037000"
    assert tutor.estado == "SE"
    assert tutor.email == "carlos@example.com"


def test_tutor_trata_texto_vazio_como_nao_informado() -> None:
    tutor = TutorEntrada(**{**TUTOR_VALIDO, "telefone_secundario": "", "bairro": " "})

    assert tutor.telefone_secundario is None
    assert tutor.bairro is None


def test_tutor_com_dados_invalidos_explica_cada_campo() -> None:
    with pytest.raises(ValidationError) as erro:
        TutorEntrada(
            **{
                **TUTOR_VALIDO,
                "cpf": "123.456.789-00",
                "telefone_principal": "9999",
                "cep": "123",
                "estado": "XX",
                "email": "sem-arroba",
                "data_nascimento": "2999-01-01",
            }
        )

    assert erros_por_campo(erro.value) == {
        "cpf": "CPF inválido.",
        "telefone_principal": "Informe o telefone com DDD.",
        "cep": "CEP deve ter 8 dígitos.",
        "estado": "Estado inválido.",
        "email": "E-mail inválido.",
        "data_nascimento": "A data não pode estar no futuro.",
    }


def test_animal_normaliza_microchip() -> None:
    animal = AnimalEntrada(
        tutor_id="20000000-0000-4000-8000-000000000001",
        nome="Thor",
        especie="Cão",
        peso_kg=32.5,
        microchip="985.321.654.987",
    )

    assert animal.microchip == "985321654987"


def test_animal_recusa_peso_negativo_e_microchip_curto() -> None:
    with pytest.raises(ValidationError) as erro:
        AnimalEntrada(
            tutor_id="20000000-0000-4000-8000-000000000001",
            nome="Thor",
            especie="Cão",
            peso_kg=-1,
            microchip="123",
        )

    campos = erros_por_campo(erro.value)
    assert set(campos) == {"peso_kg", "microchip"}
    assert campos["microchip"] == "Microchip inválido."


def test_tutor_exige_campos_obrigatorios_do_cadastro() -> None:
    with pytest.raises(ValidationError) as erro:
        TutorEntrada(nome="Carlos", telefone_principal="79988881234", cpf=" ")

    assert set(erros_por_campo(erro.value)) == {"cpf", "endereco", "cidade", "estado", "cep"}
