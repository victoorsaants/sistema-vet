import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, ReceiptText } from "lucide-react";

import AcoesLancamento from "@/components/acoes_lancamento";
import { Aviso } from "@/components/botoes_formulario";
import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioLancamento from "@/components/formulario_lancamento";
import SecaoCartao from "@/components/secao_cartao";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { formatar_data_curta, formatar_hora, hoje_na_clinica, NOMES_TIPO } from "@/lib/datas_agenda";
import { listar_categorias, obter_lancamento, type Lancamento } from "@/lib/financeiro_api";
import { formatar_data } from "@/lib/formatadores";
import {
  formatar_moeda,
  NOMES_FORMA_PAGAMENTO,
  NOMES_TIPO_LANCAMENTO,
  situacao_lancamento,
  valor_para_campo,
} from "@/lib/opcoes_financeiro";

export const metadata: Metadata = {
  title: "Lançamento | AjuVet+",
};

const MENSAGENS_SALVO: Record<string, string> = {
  criado: "Lançamento registrado.",
  atualizado: "Alterações salvas.",
};

function valores_do_lancamento(lancamento: Lancamento): Record<string, string> {
  return {
    descricao: lancamento.descricao,
    categoria_id: lancamento.categoria.id,
    valor: valor_para_campo(lancamento.valor),
    data_competencia: lancamento.data_competencia,
    vencimento: lancamento.vencimento ?? "",
    tutor_id: lancamento.tutor?.id ?? "",
    tutor_id_nome: lancamento.tutor?.nome ?? "",
    tutor_id_detalhe: "",
  };
}

function Detalhes({ lancamento }: { lancamento: Lancamento }) {
  const itens: [string, string][] = [
    ["Valor", formatar_moeda(lancamento.valor)],
    ["Categoria", lancamento.categoria.nome],
    ["Data", formatar_data(lancamento.data_competencia)],
    ["Vencimento", formatar_data(lancamento.vencimento)],
    ["Forma de pagamento", lancamento.forma_pagamento ? NOMES_FORMA_PAGAMENTO[lancamento.forma_pagamento] : "—"],
    [
      lancamento.tipo === "receita" ? "Recebido em" : "Pago em",
      lancamento.pago_em ? `${formatar_data_curta(lancamento.pago_em)} às ${formatar_hora(lancamento.pago_em)}` : "—",
    ],
    ["Tutor", lancamento.tutor?.nome ?? "—"],
    ["Registrado por", lancamento.registrado_por ?? "—"],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt className="text-sm text-texto-suave">{rotulo}</dt>
          <dd className="font-medium text-texto-titulo">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function LancamentoPage({ params, searchParams }: PageProps<"/financeiro/lancamentos/[id]">) {
  const { id } = await params;
  const salvo = ler_texto((await searchParams).salvo);
  const lancamento = await carregar_ou_404(obter_lancamento(id));
  const hoje = hoje_na_clinica();
  const situacao = situacao_lancamento(lancamento.tipo, lancamento.status, lancamento.vencimento, hoje);
  const pendente = lancamento.status === "pendente";
  const categorias = pendente ? await listar_categorias(lancamento.tipo) : [];

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={lancamento.descricao}
        descricao={`${NOMES_TIPO_LANCAMENTO[lancamento.tipo]} de ${formatar_moeda(lancamento.valor)} · ${lancamento.categoria.nome}`}
        voltar={{ href: "/financeiro/lancamentos", rotulo: "Extrato" }}
        acao={<span className={`rounded-full px-4 py-1.5 font-medium ${situacao.estilo}`}>{situacao.rotulo}</span>}
      />

      {MENSAGENS_SALVO[salvo] && <Aviso tipo="sucesso">{MENSAGENS_SALVO[salvo]}</Aviso>}

      {lancamento.atendimento && (
        <p className="rounded-xl border border-borda bg-destaque-suave px-4 py-3 text-texto-titulo">
          Referente ao atendimento de {lancamento.atendimento.animal} ({NOMES_TIPO[lancamento.atendimento.tipo].toLowerCase()} em{" "}
          {formatar_data_curta(lancamento.atendimento.realizado_em)}).{" "}
          <Link href={`/atendimentos/${lancamento.atendimento.id}`} className="font-medium text-azul-marca underline">
            Ver atendimento
          </Link>
        </p>
      )}

      <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
        <h2 className="mb-4 text-lg font-semibold text-texto-titulo">
          {pendente ? (lancamento.tipo === "receita" ? "Receber pagamento" : "Pagar despesa") : "Situação"}
        </h2>
        {lancamento.status === "cancelado" ? (
          <p className="text-texto-suave">Este lançamento foi cancelado e não entra nos totais.</p>
        ) : (
          <AcoesLancamento
            id={lancamento.id}
            tipo={lancamento.tipo}
            status={lancamento.status}
            forma_sugerida={lancamento.forma_pagamento}
          />
        )}
      </section>

      {pendente ? (
        <FormularioLancamento
          key={lancamento.atualizado_em}
          lancamento_id={lancamento.id}
          tipo={lancamento.tipo}
          categorias={categorias.map(({ id: valor, nome: rotulo }) => ({ valor, rotulo }))}
          valores_iniciais={valores_do_lancamento(lancamento)}
          href_cancelar="/financeiro/lancamentos"
          atendimento={lancamento.atendimento ? { id: lancamento.atendimento.id, descricao: lancamento.atendimento.animal } : null}
        />
      ) : (
        <SecaoCartao
          titulo="Dados do lançamento"
          icone={lancamento.tipo === "receita" ? HandCoins : ReceiptText}
          cor={lancamento.tipo === "receita" ? "bg-receita" : "bg-despesa"}
        >
          <Detalhes lancamento={lancamento} />
        </SecaoCartao>
      )}
    </div>
  );
}
