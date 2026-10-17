"use client";

import { useState, useTransition } from "react";
import { CalendarOff, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { adicionar_folga, excluir_folga } from "@/lib/acoes_agenda";
import type { Folga } from "@/lib/agenda_api";
import { formatar_data_iso } from "@/lib/datas_agenda";

type GerenciarFolgasProps = {
  veterinario_id: string;
  folgas: Folga[];
  hoje: string;
};

const ESTILO_CAMPO = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo";

export default function GerenciarFolgas({ veterinario_id, folgas, hoje }: GerenciarFolgasProps) {
  const [data_inicio, definir_data_inicio] = useState("");
  const [data_fim, definir_data_fim] = useState("");
  const [motivo, definir_motivo] = useState("");
  const [erro, definir_erro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function adicionar() {
    if (!data_inicio) {
      definir_erro("Informe a data inicial.");
      return;
    }
    iniciar(async () => {
      const resultado = await adicionar_folga(veterinario_id, {
        data_inicio,
        data_fim: data_fim || data_inicio,
        motivo: motivo || null,
      });
      if (resultado.ok) {
        definir_data_inicio("");
        definir_data_fim("");
        definir_motivo("");
        definir_erro(null);
      } else {
        definir_erro(Object.values(resultado.campos)[0] ?? resultado.erro);
      }
    });
  }

  function remover(folga: Folga) {
    if (!window.confirm(`Remover a folga de ${formatar_data_iso(folga.data_inicio)}?`)) {
      return;
    }
    iniciar(async () => {
      const resultado = await excluir_folga(veterinario_id, folga.id);
      definir_erro(resultado.ok ? null : resultado.erro);
    });
  }

  return (
    <SecaoCartao
      titulo="Folgas e férias"
      descricao="Dias em que o veterinário não atende. Os horários desses dias somem da agenda."
      icone={CalendarOff}
      cor="bg-modulo-financeiro"
    >
      {folgas.length === 0 ? (
        <p className="text-texto-suave">Nenhuma folga programada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folgas.map((folga) => (
            <li key={folga.id} className="flex items-center gap-3 rounded-xl border border-borda px-4 py-3">
              <div className="flex-1">
                <p className="font-medium text-texto-titulo">
                  {folga.data_inicio === folga.data_fim
                    ? formatar_data_iso(folga.data_inicio)
                    : `${formatar_data_iso(folga.data_inicio)} a ${formatar_data_iso(folga.data_fim)}`}
                </p>
                {folga.motivo && <p className="text-sm text-texto-suave">{folga.motivo}</p>}
              </div>
              <button
                type="button"
                onClick={() => remover(folga)}
                disabled={processando}
                aria-label="Remover folga"
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <label className="text-sm font-medium text-texto-titulo">
          De
          <input type="date" min={hoje} value={data_inicio} onChange={(e) => definir_data_inicio(e.target.value)} className={`mt-1.5 ${ESTILO_CAMPO}`} />
        </label>
        <label className="text-sm font-medium text-texto-titulo">
          Até
          <input type="date" min={data_inicio || hoje} value={data_fim} onChange={(e) => definir_data_fim(e.target.value)} className={`mt-1.5 ${ESTILO_CAMPO}`} />
        </label>
        <label className="text-sm font-medium text-texto-titulo">
          Motivo
          <input value={motivo} onChange={(e) => definir_motivo(e.target.value)} placeholder="Ex.: férias, congresso" maxLength={200} className={`mt-1.5 ${ESTILO_CAMPO}`} />
        </label>
        <button
          type="button"
          onClick={adicionar}
          disabled={processando}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-azul-ativo px-4 font-medium text-white hover:bg-azul-marca disabled:opacity-70"
        >
          {processando ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Adicionar
        </button>
      </div>
      {erro && (
        <div className="mt-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}
    </SecaoCartao>
  );
}
