import Link from "next/link";
import { CirclePlus, Wallet } from "lucide-react";

import SecaoCartao from "@/components/secao_cartao";
import { hoje_na_clinica } from "@/lib/datas_agenda";
import { listar_lancamentos } from "@/lib/financeiro_api";
import { formatar_data } from "@/lib/formatadores";
import { formatar_moeda, NOMES_FORMA_PAGAMENTO, situacao_lancamento } from "@/lib/opcoes_financeiro";

export default async function FinanceiroAtendimento({ atendimento_id }: { atendimento_id: string }) {
  const { itens } = await listar_lancamentos({ atendimento_id, tamanho: 50 });
  const hoje = hoje_na_clinica();

  return (
    <SecaoCartao
      titulo="Pagamento"
      descricao="Valores lançados no financeiro para este atendimento."
      icone={Wallet}
      cor="bg-modulo-financeiro"
      acao={
        <Link
          href={`/financeiro/lancamentos/novo?tipo=receita&atendimento_id=${atendimento_id}`}
          className="flex h-10 items-center gap-2 rounded-lg bg-azul-ativo px-4 font-medium text-white hover:bg-azul-marca"
        >
          <CirclePlus className="size-4" /> Registrar pagamento
        </Link>
      }
    >
      {itens.length === 0 ? (
        <p className="text-texto-suave">Nenhum pagamento registrado ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda">
          {itens.map((lancamento) => {
            const situacao = situacao_lancamento(lancamento.tipo, lancamento.status, lancamento.vencimento, hoje);
            return (
              <li key={lancamento.id}>
                <Link
                  href={`/financeiro/lancamentos/${lancamento.id}`}
                  className="flex flex-wrap items-center gap-3 py-3 hover:bg-fundo"
                >
                  <span className="min-w-48 flex-1">
                    <span className="block font-medium text-texto-titulo">{lancamento.descricao}</span>
                    <span className="block text-sm text-texto-suave">
                      {formatar_data(lancamento.data_competencia)}
                      {lancamento.forma_pagamento && ` · ${NOMES_FORMA_PAGAMENTO[lancamento.forma_pagamento]}`}
                    </span>
                  </span>
                  <span className="font-semibold text-texto-titulo">{formatar_moeda(lancamento.valor)}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${situacao.estilo}`}>{situacao.rotulo}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SecaoCartao>
  );
}
