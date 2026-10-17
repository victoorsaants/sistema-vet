"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { ErroApi } from "@/lib/cliente_api";
import {
  cancelar_notificacao,
  enviar_notificacoes_pendentes,
  reenviar_notificacao,
} from "@/lib/notificacoes_api";

export type ResultadoNotificacao = { ok: true; mensagem: string } | { ok: false; erro: string };

function resultado_de_erro(erro: unknown): ResultadoNotificacao {
  unstable_rethrow(erro);
  if (erro instanceof ErroApi) {
    return { ok: false, erro: Object.values(erro.campos)[0] ?? erro.message };
  }
  return { ok: false, erro: "Não foi possível concluir a operação. Tente novamente." };
}

export async function reenviar(id: string): Promise<ResultadoNotificacao> {
  try {
    await reenviar_notificacao(id);
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true, mensagem: "Mensagem de volta na fila de envio." };
}

export async function cancelar(id: string): Promise<ResultadoNotificacao> {
  try {
    await cancelar_notificacao(id);
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true, mensagem: "Envio cancelado." };
}

export async function enviar_pendentes(): Promise<ResultadoNotificacao> {
  let resultado: { enviadas: number; com_falha: number };
  try {
    resultado = await enviar_notificacoes_pendentes();
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  if (resultado.enviadas === 0 && resultado.com_falha === 0) {
    return { ok: true, mensagem: "Nenhuma mensagem aguardando envio agora." };
  }
  return {
    ok: true,
    mensagem: `${resultado.enviadas} enviada(s)${resultado.com_falha ? `, ${resultado.com_falha} com falha` : ""}.`,
  };
}
