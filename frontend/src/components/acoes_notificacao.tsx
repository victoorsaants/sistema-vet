"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RotateCw, Send, X } from "lucide-react";

import { cancelar, enviar_pendentes, reenviar, type ResultadoNotificacao } from "@/lib/acoes_notificacoes";
import type { StatusNotificacao } from "@/lib/opcoes_notificacao";

type AcoesNotificacaoProps = {
  id: string;
  status: StatusNotificacao;
  rotulo_reenviar?: string;
};

export function AcoesNotificacao({ id, status, rotulo_reenviar = "Reenviar" }: AcoesNotificacaoProps) {
  const [processando, iniciar] = useTransition();

  function executar(acao: () => Promise<ResultadoNotificacao>, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) {
      return;
    }
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) {
        window.alert(resultado.erro);
      }
    });
  }

  if (processando) {
    return <LoaderCircle className="ml-auto size-5 animate-spin text-texto-suave" />;
  }

  return (
    <div className="flex justify-end gap-1">
      {status === "pendente" ? (
        <button
          type="button"
          onClick={() => executar(() => cancelar(id), "Cancelar o envio desta mensagem?")}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50"
        >
          <X className="size-4" /> Cancelar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => executar(() => reenviar(id))}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-azul-marca hover:bg-destaque-suave"
        >
          <RotateCw className="size-4" /> {rotulo_reenviar}
        </button>
      )}
    </div>
  );
}

export function BotaoEnviarPendentes() {
  const [processando, iniciar] = useTransition();
  const [mensagem, definir_mensagem] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={processando}
        onClick={() =>
          iniciar(async () => {
            const resultado = await enviar_pendentes();
            definir_mensagem(resultado.ok ? resultado.mensagem : resultado.erro);
          })
        }
        className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white shadow-sm hover:bg-azul-marca disabled:opacity-70"
      >
        {processando ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
        Enviar pendentes agora
      </button>
      {mensagem && (
        <p role="status" className="text-sm text-texto-corpo">
          {mensagem}
        </p>
      )}
    </div>
  );
}
