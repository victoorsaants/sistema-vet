import type { Metadata } from "next";
import Link from "next/link";
import { CircleMinus, CirclePlus, FileSpreadsheet, Filter } from "lucide-react";

import { ler_numero_pagina, ler_texto, Paginacao } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import TabelaLancamentos from "@/components/tabela_lancamentos";
import { hoje_na_clinica } from "@/lib/datas_agenda";
import { listar_categorias, listar_lancamentos, type FiltroLancamentos } from "@/lib/financeiro_api";
import {
  formatar_moeda,
  NOMES_TIPO_LANCAMENTO,
  SITUACOES_LANCAMENTO,
  TIPOS_LANCAMENTO,
  type StatusLancamento,
  type TipoLancamento,
} from "@/lib/opcoes_financeiro";

export const metadata: Metadata = {
  title: "Extrato financeiro | AjuVet+",
};

const TAMANHO_PAGINA = 20;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const ESTILO_CONTROLE = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo";

function escolha<T extends string>(valor: string, opcoes: readonly string[]): T | undefined {
  return opcoes.includes(valor) ? (valor as T) : undefined;
}

export default async function ExtratoPage({ searchParams }: PageProps<"/financeiro/lancamentos">) {
  const parametros = await searchParams;
  const categorias = await listar_categorias();
  const de = ler_texto(parametros.de);
  const ate = ler_texto(parametros.ate);
  const filtro: FiltroLancamentos = {
    tipo: escolha<TipoLancamento>(ler_texto(parametros.tipo), ["receita", "despesa"]),
    status: escolha<StatusLancamento>(ler_texto(parametros.status), ["pendente", "pago", "cancelado"]),
    categoria_id: escolha(ler_texto(parametros.categoria_id), categorias.map(({ id }) => id)),
    de: DATA_ISO.test(de) ? de : undefined,
    ate: DATA_ISO.test(ate) ? ate : undefined,
    busca: ler_texto(parametros.busca) || undefined,
  };
  const pagina = ler_numero_pagina(parametros.pagina);
  const extrato = await listar_lancamentos({ ...filtro, pagina, tamanho: TAMANHO_PAGINA });
  const parametros_ativos = Object.fromEntries(
    Object.entries(filtro).filter(([, valor]) => valor !== undefined),
  ) as Record<string, string>;
  const consulta_relatorio = new URLSearchParams(parametros_ativos).toString();

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Extrato financeiro"
        descricao="Consulte, filtre e exporte os lançamentos da clínica."
        voltar={{ href: "/financeiro", rotulo: "Controle Financeiro" }}
        acao={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/financeiro/lancamentos/novo?tipo=receita"
              className="flex h-11 items-center gap-2 rounded-lg bg-receita px-4 font-medium text-white hover:opacity-90"
            >
              <CirclePlus className="size-5" /> Receita
            </Link>
            <Link
              href="/financeiro/lancamentos/novo?tipo=despesa"
              className="flex h-11 items-center gap-2 rounded-lg bg-despesa px-4 font-medium text-white hover:opacity-90"
            >
              <CircleMinus className="size-5" /> Despesa
            </Link>
          </div>
        }
      />

      <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6" aria-label="Filtros do extrato">
          <label className="text-sm font-medium text-texto-titulo lg:col-span-2">
            Buscar
            <input
              type="search"
              name="busca"
              defaultValue={filtro.busca}
              placeholder="Descrição ou tutor"
              className={`mt-1.5 ${ESTILO_CONTROLE}`}
            />
          </label>
          <label className="text-sm font-medium text-texto-titulo">
            Tipo
            <select name="tipo" defaultValue={filtro.tipo ?? ""} className={`mt-1.5 ${ESTILO_CONTROLE}`}>
              <option value="">Todos</option>
              {TIPOS_LANCAMENTO.map(({ valor, rotulo }) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-texto-titulo">
            Situação
            <select name="status" defaultValue={filtro.status ?? ""} className={`mt-1.5 ${ESTILO_CONTROLE}`}>
              <option value="">Todas</option>
              {SITUACOES_LANCAMENTO.map(({ valor, rotulo }) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-texto-titulo lg:col-span-2">
            Categoria
            <select name="categoria_id" defaultValue={filtro.categoria_id ?? ""} className={`mt-1.5 ${ESTILO_CONTROLE}`}>
              <option value="">Todas</option>
              {(["receita", "despesa"] as const).map((tipo) => (
                <optgroup key={tipo} label={`${NOMES_TIPO_LANCAMENTO[tipo]}s`}>
                  {categorias
                    .filter((categoria) => categoria.tipo === tipo)
                    .map(({ id, nome }) => (
                      <option key={id} value={id}>
                        {nome}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-texto-titulo">
            De
            <input type="date" name="de" defaultValue={filtro.de} className={`mt-1.5 ${ESTILO_CONTROLE}`} />
          </label>
          <label className="text-sm font-medium text-texto-titulo">
            Até
            <input type="date" name="ate" defaultValue={filtro.ate} className={`mt-1.5 ${ESTILO_CONTROLE}`} />
          </label>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-4 lg:justify-end">
            <Link
              href="/financeiro/lancamentos"
              className="flex h-11 items-center rounded-lg border border-azul-marca px-5 font-medium text-azul-marca hover:bg-destaque-suave"
            >
              Limpar
            </Link>
            <button
              type="submit"
              className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white hover:bg-azul-marca"
            >
              <Filter className="size-4" /> Filtrar
            </button>
            <a
              href={`/api/financeiro/relatorio${consulta_relatorio ? `?${consulta_relatorio}` : ""}`}
              download
              className="flex h-11 items-center gap-2 rounded-lg border border-receita px-5 font-medium text-receita hover:bg-emerald-50"
            >
              <FileSpreadsheet className="size-4" /> Emitir relatório (CSV)
            </a>
          </div>
        </form>

        <dl className="mt-6 grid gap-3 rounded-xl bg-fundo p-4 sm:grid-cols-3">
          {[
            { rotulo: "Receitas", valor: extrato.total_receitas, estilo: "text-receita" },
            { rotulo: "Despesas", valor: extrato.total_despesas, estilo: "text-despesa" },
            {
              rotulo: "Saldo",
              valor: extrato.total_receitas - extrato.total_despesas,
              estilo: extrato.total_receitas < extrato.total_despesas ? "text-despesa" : "text-azul-ativo",
            },
          ].map(({ rotulo, valor, estilo }) => (
            <div key={rotulo}>
              <dt className="text-sm text-texto-suave">{rotulo} (sem cancelados)</dt>
              <dd className={`text-xl font-bold ${estilo}`}>{formatar_moeda(valor)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <TabelaLancamentos
            lancamentos={extrato.itens}
            hoje={hoje_na_clinica()}
            vazio="Nenhum lançamento encontrado com esses filtros."
          />
        </div>

        <Paginacao
          caminho="/financeiro/lancamentos"
          pagina={extrato.pagina}
          tamanho={extrato.tamanho}
          total={extrato.total}
          busca=""
          rotulo_itens="lançamentos"
          parametros={parametros_ativos}
        />
      </section>
    </div>
  );
}
