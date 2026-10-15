"use server";

import { redirect } from "next/navigation";

import {
  atualizar_animal,
  atualizar_tutor,
  criar_animal,
  criar_tutor,
  type DadosAnimal,
  type DadosTutor,
  type Porte,
  type Sexo,
} from "@/lib/cadastros_api";
import {
  estado_de_erro,
  numero_ou_nulo,
  texto,
  texto_ou_nulo,
  type EstadoFormulario,
} from "@/lib/dados_formulario";

const CAMPOS_COM_DUPLICIDADE: [RegExp, string][] = [
  [/CPF/, "cpf"],
  [/microchip/i, "microchip"],
];

function ler_tutor(dados: FormData): DadosTutor {
  return {
    nome: texto(dados, "nome"),
    cpf: texto(dados, "cpf"),
    data_nascimento: texto_ou_nulo(dados, "data_nascimento"),
    telefone_principal: texto(dados, "telefone_principal"),
    telefone_secundario: texto_ou_nulo(dados, "telefone_secundario"),
    email: texto_ou_nulo(dados, "email"),
    cep: texto(dados, "cep"),
    endereco: texto(dados, "endereco"),
    bairro: texto_ou_nulo(dados, "bairro"),
    cidade: texto(dados, "cidade"),
    estado: texto(dados, "estado"),
    como_conheceu: texto_ou_nulo(dados, "como_conheceu"),
  };
}

function ler_animal(dados: FormData): DadosAnimal {
  const castrado = texto(dados, "castrado");
  return {
    tutor_id: texto(dados, "tutor_id"),
    nome: texto(dados, "nome"),
    especie: texto(dados, "especie"),
    raca: texto_ou_nulo(dados, "raca"),
    sexo: texto_ou_nulo(dados, "sexo") as Sexo | null,
    data_nascimento: texto_ou_nulo(dados, "data_nascimento"),
    cor_pelagem: texto_ou_nulo(dados, "cor_pelagem"),
    peso_kg: numero_ou_nulo(dados, "peso_kg"),
    altura_cm: numero_ou_nulo(dados, "altura_cm"),
    largura_cm: numero_ou_nulo(dados, "largura_cm"),
    porte: texto_ou_nulo(dados, "porte") as Porte | null,
    microchip: texto_ou_nulo(dados, "microchip"),
    castrado: castrado === "" ? null : castrado === "sim",
    observacoes: texto_ou_nulo(dados, "observacoes"),
  };
}

export async function salvar_tutor(
  tutor_id: string | null,
  estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  let id: string;
  try {
    const tutor = tutor_id
      ? await atualizar_tutor(tutor_id, ler_tutor(dados))
      : await criar_tutor(ler_tutor(dados));
    id = tutor.id;
  } catch (erro) {
    return estado_de_erro(estado, dados, erro, CAMPOS_COM_DUPLICIDADE);
  }
  redirect(`/tutores/${id}?salvo=${tutor_id ? "atualizado" : "criado"}`);
}

export async function salvar_animal(
  animal_id: string | null,
  estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  let id: string;
  try {
    const animal = animal_id
      ? await atualizar_animal(animal_id, ler_animal(dados))
      : await criar_animal(ler_animal(dados));
    id = animal.id;
  } catch (erro) {
    return estado_de_erro(estado, dados, erro, CAMPOS_COM_DUPLICIDADE);
  }
  redirect(`/animais/${id}?salvo=${animal_id ? "atualizado" : "criado"}`);
}
