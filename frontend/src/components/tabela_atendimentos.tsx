import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import SecaoCartao from "@/components/secao_cartao";
import type { AtendimentoResumo } from "@/lib/atendimentos_api";
import { formatar_data_curta, formatar_hora, NOMES_TIPO } from "@/lib/datas_agenda";

type TabelaAtendimentosProps = {
  titulo: string;
  icone: LucideIcon;
  cor: string;
  atendimentos: AtendimentoResumo[];
  vazio: string;
  mostrar_veterinario: boolean;
};

export default function TabelaAtendimentos({
  titulo,
  icone,
  cor,
  atendimentos,
  vazio,
  mostrar_veterinario,
}: TabelaAtendimentosProps) {
  return (
    <SecaoCartao titulo={titulo} icone={icone} cor={cor}>
      {atendimentos.length === 0 ? (
        <p className="text-texto-suave">{vazio}</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-destaque-suave text-sm text-texto-titulo">
              <tr>
                <th className="rounded-l-lg px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Animal</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                {mostrar_veterinario && <th className="px-4 py-3 font-semibold">Veterinário(a)</th>}
                <th className="px-4 py-3 font-semibold">Diagnóstico</th>
                <th className="rounded-r-lg px-4 py-3">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {atendimentos.map((atendimento) => (
                <tr key={atendimento.id} className="relative hover:bg-fundo">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/atendimentos/${atendimento.id}`} className="font-medium text-texto-titulo after:absolute after:inset-0">
                      {formatar_data_curta(atendimento.realizado_em)}
                    </Link>
                    <p className="text-sm text-texto-suave">{formatar_hora(atendimento.realizado_em)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-texto-titulo">{atendimento.animal.nome}</p>
                    <p className="text-sm text-texto-suave">Tutor: {atendimento.tutor.nome}</p>
                  </td>
                  <td className="px-4 py-3 text-texto-corpo">{NOMES_TIPO[atendimento.tipo]}</td>
                  {mostrar_veterinario && <td className="px-4 py-3 text-texto-corpo">{atendimento.veterinario.nome}</td>}
                  <td className="max-w-xs truncate px-4 py-3 text-texto-corpo">{atendimento.diagnostico ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto size-5 text-texto-subtitulo" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SecaoCartao>
  );
}
