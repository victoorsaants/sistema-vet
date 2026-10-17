import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChartLine,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  FileSpreadsheet,
  HandCoins,
  Heart,
  ListChecks,
  ReceiptText,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import { GraficoCategorias, GraficoFluxo } from "@/components/graficos_financeiro";
import SecaoCartao from "@/components/secao_cartao";
import TabelaLancamentos from "@/components/tabela_lancamentos";
import { hoje_na_clinica } from "@/lib/datas_agenda";
import { obter_resumo_financeiro } from "@/lib/financeiro_api";
import {
  formatar_moeda,
  nome_do_mes,
  primeiro_dia_do_mes,
  somar_meses,
  ultimo_dia_do_mes,
} from "@/lib/opcoes_financeiro";

export const metadata: Metadata = {
  title: "Controle Financeiro | AjuVet+",
};

type CartaoIndicador = {
  rotulo: string;
  valor: string;
  variacao: number | null;
  aumento_e_bom: boolean;
  icone: LucideIcon;
  cor: string;
  cor_valor: string;
};

function Variacao({ variacao, aumento_e_bom }: { variacao: number | null; aumento_e_bom: boolean }) {
  if (variacao === null) {
    return <p className="mt-1 text-sm text-texto-suave">Sem movimento no mês anterior</p>;
  }
  const subiu = variacao >= 0;
  const bom = subiu === aumento_e_bom;
  const Seta = subiu ? ArrowUp : ArrowDown;
  return (
    <p className="mt-1 text-sm text-texto-suave">
      <span className={`inline-flex items-center gap-0.5 font-semibold ${bom ? "text-receita" : "text-despesa"}`}>
        <Seta className="size-4" />
        {Math.abs(variacao).toLocaleString("pt-BR")}%
      </span>{" "}
      em relação ao mês anterior
    </p>
  );
}

function link_mes(mes: string): string {
  return `/financeiro?mes=${mes.slice(0, 7)}`;
}

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  const parametros = await searchParams;
  const hoje = hoje_na_clinica();
  const mes_escolhido = ler_texto(parametros.mes);
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes_escolhido) ? `${mes_escolhido}-01` : primeiro_dia_do_mes(hoje);
  const resumo = await obter_resumo_financeiro(mes);
  const periodo = new URLSearchParams({ de: mes, ate: ultimo_dia_do_mes(mes) }).toString();

  const indicadores: CartaoIndicador[] = [
    {
      rotulo: "Receitas",
      valor: formatar_moeda(resumo.receitas),
      variacao: resumo.variacao.receitas,
      aumento_e_bom: true,
      icone: HandCoins,
      cor: "bg-receita",
      cor_valor: "text-receita",
    },
    {
      rotulo: "Despesas",
      valor: formatar_moeda(resumo.despesas),
      variacao: resumo.variacao.despesas,
      aumento_e_bom: false,
      icone: Wallet,
      cor: "bg-despesa",
      cor_valor: "text-despesa",
    },
    {
      rotulo: "Saldo do período",
      valor: formatar_moeda(resumo.saldo),
      variacao: resumo.variacao.saldo,
      aumento_e_bom: true,
      icone: ChartLine,
      cor: "bg-azul-ativo",
      cor_valor: resumo.saldo < 0 ? "text-despesa" : "text-texto-titulo",
    },
    {
      rotulo: "Total de lançamentos",
      valor: String(resumo.total_lancamentos),
      variacao: resumo.variacao.lancamentos,
      aumento_e_bom: true,
      icone: ReceiptText,
      cor: "bg-modulo-atendimentos",
      cor_valor: "text-texto-titulo",
    },
  ];

  const acoes_rapidas = [
    { rotulo: "Registrar receita", href: "/financeiro/lancamentos/novo?tipo=receita", icone: CirclePlus, baixar: false },
    { rotulo: "Registrar despesa", href: "/financeiro/lancamentos/novo?tipo=despesa", icone: CircleMinus, baixar: false },
    { rotulo: "Emitir relatório", href: `/api/financeiro/relatorio?${periodo}`, icone: FileSpreadsheet, baixar: true },
    { rotulo: "Ver extrato", href: `/financeiro/lancamentos?${periodo}`, icone: ListChecks, baixar: false },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Controle Financeiro"
        descricao="Acompanhe receitas, despesas e o fluxo financeiro da clínica."
        acao={
          <nav aria-label="Mês" className="flex items-center gap-2 rounded-xl border border-borda bg-superficie p-1.5 shadow-sm">
            <Link
              href={link_mes(somar_meses(mes, -1))}
              aria-label="Mês anterior"
              className="flex size-9 items-center justify-center rounded-lg text-texto-subtitulo hover:bg-destaque-suave"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <span className="flex min-w-44 items-center justify-center gap-2 font-medium text-texto-titulo">
              <CalendarRange className="size-5 text-azul-ativo" />
              {nome_do_mes(mes)}
            </span>
            <Link
              href={link_mes(somar_meses(mes, 1))}
              aria-label="Próximo mês"
              className="flex size-9 items-center justify-center rounded-lg text-texto-subtitulo hover:bg-destaque-suave"
            >
              <ChevronRight className="size-5" />
            </Link>
          </nav>
        }
      />

      <section aria-label="Indicadores do mês" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map(({ rotulo, valor, variacao, aumento_e_bom, icone: Icone, cor, cor_valor }) => (
          <div key={rotulo} className="flex gap-4 rounded-2xl border border-borda bg-superficie p-5 shadow-sm">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-full text-white ${cor}`}>
              <Icone className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-texto-titulo">{rotulo}</p>
              <p className={`text-2xl font-bold whitespace-nowrap ${cor_valor}`}>{valor}</p>
              <Variacao variacao={variacao} aumento_e_bom={aumento_e_bom} />
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <SecaoCartao
          titulo="Fluxo financeiro"
          descricao="Valores recebidos e pagos nos últimos 6 meses."
          icone={ChartLine}
          cor="bg-azul-ativo"
        >
          <p className="mb-2 flex justify-end gap-4 text-sm text-texto-corpo">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-receita" /> Receitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-despesa" /> Despesas
            </span>
          </p>
          <GraficoFluxo fluxo={resumo.fluxo} />
        </SecaoCartao>

        <SecaoCartao titulo="Despesas por categoria" icone={ChartPie} cor="bg-modulo-financeiro">
          <GraficoCategorias categorias={resumo.despesas_por_categoria} total={resumo.despesas} />
        </SecaoCartao>

        <div className="lg:col-span-2 2xl:col-span-1">
          <SecaoCartao titulo="Ações rápidas" icone={Zap} cor="bg-modulo-agendamentos">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-1">
              {acoes_rapidas.map(({ rotulo, href, icone: Icone, baixar }) => (
                <li key={rotulo}>
                  {baixar ? (
                    <a
                      href={href}
                      download
                      className="flex items-center gap-3 rounded-xl border border-borda px-4 py-3 font-medium text-texto-titulo hover:bg-destaque-suave"
                    >
                      <Icone className="size-5 text-azul-ativo" />
                      <span className="flex-1">{rotulo}</span>
                      <ChevronRight className="size-4 text-texto-subtitulo" />
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-xl border border-borda px-4 py-3 font-medium text-texto-titulo hover:bg-destaque-suave"
                    >
                      <Icone className="size-5 text-azul-ativo" />
                      <span className="flex-1">{rotulo}</span>
                      <ChevronRight className="size-4 text-texto-subtitulo" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </SecaoCartao>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SecaoCartao
          titulo="Últimos lançamentos"
          descricao={nome_do_mes(mes)}
          icone={ReceiptText}
          cor="bg-azul-marca"
          acao={
            <Link
              href={`/financeiro/lancamentos?${periodo}`}
              className="flex items-center gap-1 text-sm font-medium text-azul-marca hover:underline"
            >
              Ver extrato completo <ChevronRight className="size-4" />
            </Link>
          }
        >
          <TabelaLancamentos lancamentos={resumo.ultimos_lancamentos} hoje={hoje} vazio="Nenhum lançamento neste mês." />
        </SecaoCartao>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-texto-titulo">
              <CalendarRange className="size-5 text-azul-ativo" /> Resumo de {nome_do_mes(mes).toLowerCase()}
            </h2>
            <dl className="flex flex-col gap-3">
              {[
                { rotulo: "Receitas", valor: resumo.receitas, estilo: "text-receita" },
                { rotulo: "Despesas", valor: resumo.despesas, estilo: "text-despesa" },
                { rotulo: "Saldo", valor: resumo.saldo, estilo: resumo.saldo < 0 ? "text-despesa" : "text-azul-ativo" },
              ].map(({ rotulo, valor, estilo }) => (
                <div key={rotulo} className="flex items-center justify-between">
                  <dt className="text-texto-titulo">{rotulo}</dt>
                  <dd className={`font-bold whitespace-nowrap ${estilo}`}>{formatar_moeda(valor)}</dd>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-borda pt-3 text-sm">
                <dt className="text-texto-suave">A receber</dt>
                <dd className="font-medium text-texto-titulo">{formatar_moeda(resumo.a_receber)}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-texto-suave">A pagar</dt>
                <dd className="font-medium text-texto-titulo">{formatar_moeda(resumo.a_pagar)}</dd>
              </div>
            </dl>
          </section>
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-destaque-claro/60 p-5 text-center font-manuscrita text-2xl text-azul-marca">
            <Heart className="size-5 shrink-0" fill="currentColor" strokeWidth={0} /> Uma boa gestão também cuida dos nossos
            pets!
          </p>
        </aside>
      </div>
    </div>
  );
}
