import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { formatar_data } from "@/lib/formatadores";
import type { Lancamento } from "@/lib/financeiro_api";
import {
  formatar_moeda,
  NOMES_FORMA_PAGAMENTO,
  NOMES_TIPO_LANCAMENTO,
  situacao_lancamento,
} from "@/lib/opcoes_financeiro";

type TabelaLancamentosProps = {
  lancamentos: Lancamento[];
  hoje: string;
  vazio: string;
};

export default function TabelaLancamentos({ lancamentos, hoje, vazio }: TabelaLancamentosProps) {
  if (lancamentos.length === 0) {
    return <p className="py-12 text-center text-texto-suave">{vazio}</p>;
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-destaque-suave text-sm text-texto-titulo">
          <tr>
            <th className="rounded-l-lg px-4 py-3 font-semibold">Data</th>
            <th className="px-4 py-3 font-semibold">Descrição</th>
            <th className="px-4 py-3 font-semibold">Categoria</th>
            <th className="px-4 py-3 font-semibold">Tipo</th>
            <th className="px-4 py-3 text-right font-semibold">Valor</th>
            <th className="px-4 py-3 font-semibold">Pagamento</th>
            <th className="px-4 py-3 font-semibold">Situação</th>
            <th className="rounded-r-lg px-4 py-3">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda text-sm">
          {lancamentos.map((lancamento) => {
            const situacao = situacao_lancamento(lancamento.tipo, lancamento.status, lancamento.vencimento, hoje);
            const despesa = lancamento.tipo === "despesa";
            return (
              <tr key={lancamento.id} className="relative hover:bg-fundo">
                <td className="px-4 py-3 whitespace-nowrap text-texto-corpo">{formatar_data(lancamento.data_competencia)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/financeiro/lancamentos/${lancamento.id}`}
                    className="font-medium text-texto-titulo after:absolute after:inset-0"
                  >
                    {lancamento.descricao}
                  </Link>
                  {lancamento.tutor && <p className="text-texto-suave">{lancamento.tutor.nome}</p>}
                </td>
                <td className="px-4 py-3 text-texto-corpo">{lancamento.categoria.nome}</td>
                <td className={`px-4 py-3 ${despesa ? "text-despesa" : "text-texto-corpo"}`}>
                  {NOMES_TIPO_LANCAMENTO[lancamento.tipo]}
                </td>
                <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${despesa ? "text-despesa" : "text-texto-titulo"}`}>
                  {despesa ? "− " : ""}
                  {formatar_moeda(lancamento.valor)}
                </td>
                <td className="px-4 py-3 text-texto-corpo">
                  {lancamento.forma_pagamento ? NOMES_FORMA_PAGAMENTO[lancamento.forma_pagamento] : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 font-medium whitespace-nowrap ${situacao.estilo}`}>
                    {situacao.rotulo}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight className="ml-auto size-5 text-texto-subtitulo" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
