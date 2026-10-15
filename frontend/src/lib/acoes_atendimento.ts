"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import type { TipoAtendimento } from "@/lib/agenda_api";
import {
  enviar_anexo,
  finalizar_atendimento,
  iniciar_atendimento,
  registrar_atendimento,
  remover_anexo,
  type RegistroAtendimento,
} from "@/lib/atendimentos_api";
import { ErroApi, type CamposComErro } from "@/lib/cliente_api";

export type ResultadoAtendimento = { ok: true } | { ok: false; erro: string; campos: CamposComErro };

function resultado_de_erro(erro: unknown): ResultadoAtendimento {
  unstable_rethrow(erro);
  if (erro instanceof ErroApi) {
    return { ok: false, erro: erro.message, campos: erro.campos };
  }
  return { ok: false, erro: "Não foi possível concluir a operação. Tente novamente.", campos: {} };
}

export async function atender_agendamento(agendamento_id: string): Promise<ResultadoAtendimento> {
  let id: string;
  try {
    id = (await iniciar_atendimento({ agendamento_id })).id;
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  redirect(`/atendimentos/${id}`);
}

export async function atender_sem_agendamento(
  animal_id: string,
  tipo: TipoAtendimento,
): Promise<ResultadoAtendimento> {
  let id: string;
  try {
    id = (await iniciar_atendimento({ animal_id, tipo })).id;
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  redirect(`/atendimentos/${id}`);
}

export async function salvar_atendimento(
  id: string,
  registro: RegistroAtendimento,
  finalizar: boolean,
): Promise<ResultadoAtendimento> {
  try {
    await registrar_atendimento(id, registro);
    if (finalizar) {
      await finalizar_atendimento(id);
    }
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true };
}

export async function anexar_arquivo(id: string, dados: FormData): Promise<ResultadoAtendimento> {
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Escolha um arquivo.", campos: {} };
  }
  try {
    await enviar_anexo(id, arquivo);
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true };
}

export async function excluir_anexo(id: string, anexo_id: string): Promise<ResultadoAtendimento> {
  try {
    await remover_anexo(id, anexo_id);
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true };
}
