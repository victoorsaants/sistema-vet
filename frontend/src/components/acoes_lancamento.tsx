"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Ban, LoaderCircle } from "lucide-react";

import { cancelar, registrar_pagamento } from "@/lib/acoes_financeiro";
import { FORMAS_PAGAMENTO, type FormaPagamento, type StatusLancamento, type TipoLancamento } from "@/lib/opcoes_financeiro";

type AcoesLancamentoProps = {
  id: string;
  tipo: TipoLancamento;
  status: StatusLancamento;
  forma_sugerida: FormaPagamento | null;
};

export default function AcoesLancamento({ id, tipo, status, forma_sugerida }: AcoesLancamentoProps) {
  const [processando, iniciar] = useTransition();
  const [forma, definir_forma] = useState<FormaPagamento | "">(forma_sugerida ?? "");
  const [erro, definir_erro] = useState<string | null>(null);
  const receita = tipo === "receita";

  function executar(acao: () => ReturnType<typeof cancelar>) {
    definir_erro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) {
        definir_erro(resultado.erro);
      }
    });
  }

  if (status === "cancelado") {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {status === "pendente" && (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-texto-titulo">
              Forma de pagamento
              <select
                value={forma}
                onChange={(evento) => definir_forma(evento.target.value as FormaPagamento | "")}
                className="h-11 min-w-48 rounded-lg border border-slate-200 bg-white px-3 font-normal"
              >
                <option value="">Selecione</option>
                {FORMAS_PAGAMENTO.map(({ valor, rotulo }) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={processando}
              onClick={() => {
                if (!forma) {
                  definir_erro("Escolha a forma de pagamento.");
                  return;
                }
                executar(() => registrar_pagamento(id, forma));
              }}
              className="flex h-11 items-center gap-2 rounded-lg bg-receita px-5 font-medium text-white hover:opacity-90 disabled:opacity-70"
            >
              {processando ? <LoaderCircle className="size-5 animate-spin" /> : <BadgeCheck className="size-5" />}
              {receita ? "Registrar recebimento" : "Registrar pagamento"}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={processando}
          onClick={() => {
            const pergunta =
              status === "pago"
                ? `Cancelar este lançamento? O valor deixa de contar como ${receita ? "recebido" : "pago"}.`
                : "Cancelar este lançamento?";
            if (window.confirm(pergunta)) {
              executar(() => cancelar(id));
            }
          }}
          className="flex h-11 items-center gap-2 rounded-lg border border-rose-300 px-5 font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-70"
        >
          <Ban className="size-5" />
          Cancelar lançamento
        </button>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-rose-700">
          {erro}
        </p>
      )}
    </div>
  );
}
