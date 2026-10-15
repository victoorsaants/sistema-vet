"use client";

import { useTransition } from "react";
import { LoaderCircle, Stethoscope } from "lucide-react";

import { atender_agendamento } from "@/lib/acoes_atendimento";

type BotaoAtenderProps = {
  agendamento_id: string;
  em_andamento: boolean;
};

export default function BotaoAtender({ agendamento_id, em_andamento }: BotaoAtenderProps) {
  const [abrindo, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={abrindo}
      onClick={() =>
        iniciar(async () => {
          const resultado = await atender_agendamento(agendamento_id);
          if (resultado && !resultado.ok) {
            window.alert(resultado.erro);
          }
        })
      }
      className="ml-auto flex items-center gap-2 rounded-lg bg-azul-ativo px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-marca disabled:opacity-70"
    >
      {abrindo ? <LoaderCircle className="size-4 animate-spin" /> : <Stethoscope className="size-4" />}
      {em_andamento ? "Continuar" : "Atender"}
    </button>
  );
}
