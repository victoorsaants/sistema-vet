"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import {
  alterar_status_agendamento,
  criar_agendamento,
  criar_folga,
  remover_folga,
  salvar_expediente,
  type FaixaExpediente,
  type Folga,
  type NovoAgendamento,
  type StatusAgendamento,
} from "@/lib/agenda_api";
import { ErroApi, type CamposComErro } from "@/lib/cliente_api";

export type ResultadoAcao = { ok: true } | { ok: false; erro: string; campos: CamposComErro };

async function executar(operacao: () => Promise<unknown>): Promise<ResultadoAcao> {
  try {
    await operacao();
  } catch (erro) {
    unstable_rethrow(erro);
    if (erro instanceof ErroApi) {
      return { ok: false, erro: erro.message, campos: erro.campos };
    }
    return { ok: false, erro: "Não foi possível concluir a operação. Tente novamente.", campos: {} };
  }
  refresh();
  return { ok: true };
}

export async function agendar_horario(dados: NovoAgendamento): Promise<ResultadoAcao> {
  return executar(() => criar_agendamento(dados));
}

export async function mudar_status_agendamento(id: string, status: StatusAgendamento): Promise<ResultadoAcao> {
  return executar(() => alterar_status_agendamento(id, status));
}

export async function salvar_expediente_veterinario(
  veterinario_id: string,
  faixas: FaixaExpediente[],
): Promise<ResultadoAcao> {
  return executar(() => salvar_expediente(veterinario_id, faixas));
}

export async function adicionar_folga(veterinario_id: string, folga: Omit<Folga, "id">): Promise<ResultadoAcao> {
  return executar(() => criar_folga(veterinario_id, folga));
}

export async function excluir_folga(veterinario_id: string, folga_id: string): Promise<ResultadoAcao> {
  return executar(() => remover_folga(veterinario_id, folga_id));
}
