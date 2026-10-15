"use client";

import { useTransition } from "react";
import { Check, LoaderCircle, UserX, X } from "lucide-react";

import { mudar_status_agendamento } from "@/lib/acoes_agenda";
import type { StatusAgendamento } from "@/lib/agenda_api";

type AcaoStatus = {
  status: StatusAgendamento;
  rotulo: string;
  icone: typeof Check;
  estilo: string;
  confirmacao?: string;
};

const ACOES_POR_STATUS: Partial<Record<StatusAgendamento, AcaoStatus[]>> = {
  agendado: [
    { status: "confirmado", rotulo: "Confirmar", icone: Check, estilo: "text-emerald-700 hover:bg-emerald-50" },
    { status: "faltou", rotulo: "Faltou", icone: UserX, estilo: "text-amber-700 hover:bg-amber-50", confirmacao: "Registrar falta deste agendamento?" },
    { status: "cancelado", rotulo: "Cancelar", icone: X, estilo: "text-rose-700 hover:bg-rose-50", confirmacao: "Cancelar este agendamento? O horário volta a ficar livre." },
  ],
  confirmado: [
    { status: "faltou", rotulo: "Faltou", icone: UserX, estilo: "text-amber-700 hover:bg-amber-50", confirmacao: "Registrar falta deste agendamento?" },
    { status: "cancelado", rotulo: "Cancelar", icone: X, estilo: "text-rose-700 hover:bg-rose-50", confirmacao: "Cancelar este agendamento? O horário volta a ficar livre." },
  ],
};

type AcoesStatusAgendamentoProps = {
  agendamento_id: string;
  status: StatusAgendamento;
  descricao: string;
};

export default function AcoesStatusAgendamento({ agendamento_id, status, descricao }: AcoesStatusAgendamentoProps) {
  const [processando, iniciar] = useTransition();
  const acoes = ACOES_POR_STATUS[status] ?? [];

  if (processando) {
    return <LoaderCircle className="ml-auto size-5 animate-spin text-texto-suave" />;
  }

  return (
    <div className="flex justify-end gap-1">
      {acoes.map(({ status: novo_status, rotulo, icone: Icone, estilo, confirmacao }) => (
        <button
          key={novo_status}
          type="button"
          title={`${rotulo}: ${descricao}`}
          onClick={() => {
            if (confirmacao && !window.confirm(confirmacao)) {
              return;
            }
            iniciar(async () => {
              const resultado = await mudar_status_agendamento(agendamento_id, novo_status);
              if (!resultado.ok) {
                window.alert(resultado.erro);
              }
            });
          }}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium ${estilo}`}
        >
          <Icone className="size-4" />
          {rotulo}
        </button>
      ))}
    </div>
  );
}
