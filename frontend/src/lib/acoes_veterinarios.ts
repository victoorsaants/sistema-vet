"use server";

import { redirect } from "next/navigation";

import { estado_de_erro, texto, texto_ou_nulo, type EstadoFormulario } from "@/lib/dados_formulario";
import {
  atualizar_veterinario,
  cadastrar_veterinario,
  definir_acesso_veterinario,
  type DadosVeterinario,
} from "@/lib/veterinarios_api";

const CAMPOS_COM_DUPLICIDADE: [RegExp, string][] = [
  [/CRMV/, "crmv"],
  [/e-mail/i, "email_login"],
];

function ler_veterinario(dados: FormData): DadosVeterinario {
  return {
    nome: texto(dados, "nome"),
    crmv: texto(dados, "crmv"),
    especialidade: texto_ou_nulo(dados, "especialidade"),
    telefone: texto_ou_nulo(dados, "telefone"),
    email: texto_ou_nulo(dados, "email"),
  };
}

function senha(dados: FormData): string | null {
  return String(dados.get("senha_login") ?? "") || null;
}

function sem_senha(estado: EstadoFormulario): EstadoFormulario {
  const valores = Object.fromEntries(Object.entries(estado.valores).filter(([campo]) => campo !== "senha_login"));
  return { ...estado, valores };
}

export async function salvar_veterinario(
  veterinario_id: string | null,
  estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  let id: string;
  try {
    if (veterinario_id) {
      id = (await atualizar_veterinario(veterinario_id, { ...ler_veterinario(dados), ativo: texto(dados, "ativo") !== "nao" })).id;
    } else {
      const criar_acesso = texto(dados, "criar_acesso") === "sim";
      id = (
        await cadastrar_veterinario({
          ...ler_veterinario(dados),
          email_login: criar_acesso ? texto(dados, "email_login") || null : null,
          senha_login: criar_acesso ? senha(dados) : null,
        })
      ).id;
    }
  } catch (erro) {
    return sem_senha(estado_de_erro(estado, dados, erro, CAMPOS_COM_DUPLICIDADE));
  }
  redirect(`/veterinarios/${id}?salvo=${veterinario_id ? "atualizado" : "criado"}`);
}

export async function salvar_acesso(
  veterinario_id: string,
  estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await definir_acesso_veterinario(veterinario_id, {
      email_login: texto(dados, "email_login"),
      senha_login: senha(dados),
    });
  } catch (erro) {
    return sem_senha(estado_de_erro(estado, dados, erro, CAMPOS_COM_DUPLICIDADE));
  }
  redirect(`/veterinarios/${veterinario_id}?salvo=acesso`);
}
