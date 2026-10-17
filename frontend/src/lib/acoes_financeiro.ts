"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { ErroApi } from "@/lib/cliente_api";
import { estado_de_erro, texto, texto_ou_nulo, type EstadoFormulario } from "@/lib/dados_formulario";
import {
  atualizar_lancamento,
  cancelar_lancamento,
  criar_lancamento,
  pagar_lancamento,
  type DadosLancamento,
} from "@/lib/financeiro_api";
import { ler_valor_monetario, type FormaPagamento, type TipoLancamento } from "@/lib/opcoes_financeiro";

export type ResultadoLancamento = { ok: true } | { ok: false; erro: string };

function ler_lancamento(dados: FormData, pago: boolean): DadosLancamento {
  return {
    categoria_id: texto(dados, "categoria_id"),
    descricao: texto(dados, "descricao"),
    valor: ler_valor_monetario(texto(dados, "valor")),
    data_competencia: texto(dados, "data_competencia"),
    vencimento: pago ? null : texto_ou_nulo(dados, "vencimento"),
    forma_pagamento: texto_ou_nulo(dados, "forma_pagamento") as FormaPagamento | null,
    tutor_id: texto_ou_nulo(dados, "tutor_id"),
    atendimento_id: texto_ou_nulo(dados, "atendimento_id"),
  };
}

export async function salvar_lancamento(
  lancamento_id: string | null,
  estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  let id: string;
  try {
    if (lancamento_id) {
      id = (await atualizar_lancamento(lancamento_id, ler_lancamento(dados, false))).id;
    } else {
      const pago = texto(dados, "status") === "pago";
      id = (
        await criar_lancamento({
          ...ler_lancamento(dados, pago),
          tipo: texto(dados, "tipo") as TipoLancamento,
          status: pago ? "pago" : "pendente",
        })
      ).id;
    }
  } catch (erro) {
    return estado_de_erro(estado, dados, erro);
  }
  redirect(`/financeiro/lancamentos/${id}?salvo=${lancamento_id ? "atualizado" : "criado"}`);
}

function resultado_de_erro(erro: unknown): ResultadoLancamento {
  unstable_rethrow(erro);
  if (erro instanceof ErroApi) {
    return { ok: false, erro: Object.values(erro.campos)[0] ?? erro.message };
  }
  return { ok: false, erro: "Não foi possível concluir a operação. Tente novamente." };
}

export async function registrar_pagamento(id: string, forma_pagamento: FormaPagamento): Promise<ResultadoLancamento> {
  try {
    await pagar_lancamento(id, forma_pagamento);
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true };
}

export async function cancelar(id: string): Promise<ResultadoLancamento> {
  try {
    await cancelar_lancamento(id);
  } catch (erro) {
    return resultado_de_erro(erro);
  }
  refresh();
  return { ok: true };
}
