import type { Metadata } from "next";
import Link from "next/link";
import { Info, Search } from "lucide-react";

import { AcoesNotificacao, BotaoEnviarPendentes } from "@/components/acoes_notificacao";
import { ler_numero_pagina, ler_texto, Paginacao } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import { formatar_data_curta, formatar_hora } from "@/lib/datas_agenda";
import { listar_notificacoes, obter_resumo_notificacoes } from "@/lib/notificacoes_api";
import {
  ESTILOS_STATUS_NOTIFICACAO,
  NOMES_STATUS_NOTIFICACAO,
  NOMES_TIPO_NOTIFICACAO,
  type StatusNotificacao,
  type TipoNotificacao,
} from "@/lib/opcoes_notificacao";

export const metadata: Metadata = {
  title: "Notificações | AjuVet+",
};

const TAMANHO_PAGINA = 20;

const ABAS: { valor: StatusNotificacao | ""; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "pendente", rotulo: "Programadas" },
  { valor: "enviada", rotulo: "Enviadas" },
  { valor: "falhou", rotulo: "Com falha" },
  { valor: "cancelada", rotulo: "Canceladas" },
];

function eh_status(valor: string): valor is StatusNotificacao {
  return valor in NOMES_STATUS_NOTIFICACAO;
}

function eh_tipo(valor: string): valor is TipoNotificacao {
  return valor in NOMES_TIPO_NOTIFICACAO;
}

function href_aba(status: string, busca: string, tipo: string): string {
  const consulta = new URLSearchParams();
  for (const [nome, valor] of Object.entries({ status, busca, tipo })) {
    if (valor) {
      consulta.set(nome, valor);
    }
  }
  const texto = consulta.toString();
  return texto ? `/notificacoes?${texto}` : "/notificacoes";
}

export default async function NotificacoesPage({ searchParams }: PageProps<"/notificacoes">) {
  const parametros = await searchParams;
  const busca = ler_texto(parametros.busca);
  const status_escolhido = ler_texto(parametros.status);
  const tipo_escolhido = ler_texto(parametros.tipo);
  const status = eh_status(status_escolhido) ? status_escolhido : undefined;
  const tipo = eh_tipo(tipo_escolhido) ? tipo_escolhido : undefined;
  const pagina = ler_numero_pagina(parametros.pagina);
  const [resultado, resumo] = await Promise.all([
    listar_notificacoes({ status, tipo, busca, pagina, tamanho: TAMANHO_PAGINA }),
    obter_resumo_notificacoes(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Notificações"
        descricao="Receitas e lembretes enviados aos tutores por e-mail."
        acao={<BotaoEnviarPendentes />}
      />

      {resumo.modo_envio === "arquivo" && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
          <Info className="mt-0.5 size-5 shrink-0" />
          <p>
            Modo de teste: os e-mails não saem para a internet. Cada mensagem é salva como arquivo em{" "}
            <code className="rounded bg-white px-1">backend/.arquivos/emails</code>. Configure o SMTP no{" "}
            <code className="rounded bg-white px-1">backend/.env</code> para enviar de verdade.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { rotulo: "Aguardando envio agora", valor: resumo.atrasadas, estilo: "bg-amber-50 text-amber-900" },
          { rotulo: "Programadas", valor: resumo.programadas, estilo: "bg-sky-50 text-sky-900" },
          { rotulo: "Com falha", valor: resumo.com_falha, estilo: "bg-rose-50 text-rose-800" },
        ].map(({ rotulo, valor, estilo }) => (
          <div key={rotulo} className={`rounded-2xl p-5 ${estilo}`}>
            <p className="text-3xl font-bold">{valor}</p>
            <p>{rotulo}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
        <nav aria-label="Situação das mensagens" className="flex gap-1 overflow-x-auto border-b border-borda">
          {ABAS.map(({ valor, rotulo }) => {
            const ativa = valor === (status ?? "");
            return (
              <Link
                key={rotulo}
                href={href_aba(valor, busca, tipo ?? "")}
                aria-current={ativa ? "page" : undefined}
                className={`shrink-0 border-b-2 px-4 py-3 font-medium ${
                  ativa ? "border-azul-ativo text-azul-ativo" : "border-transparent text-texto-subtitulo hover:text-azul-marca"
                }`}
              >
                {rotulo}
              </Link>
            );
          })}
        </nav>

        <form role="search" className="mt-5 flex flex-wrap gap-3">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex min-w-60 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-azul-marca focus-within:ring-2 focus-within:ring-azul-marca/20">
            <Search className="size-5 shrink-0 text-slate-400" />
            <span className="sr-only">Buscar por tutor ou animal</span>
            <input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por tutor ou animal"
              className="h-11 w-full bg-transparent text-texto-titulo outline-none placeholder:text-slate-400"
            />
          </label>
          <label className="sr-only" htmlFor="tipo">
            Tipo de mensagem
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={tipo ?? ""}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(NOMES_TIPO_NOTIFICACAO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white hover:bg-azul-marca"
          >
            <Search className="size-4" /> Buscar
          </button>
        </form>

        {resultado.itens.length === 0 ? (
          <p className="py-16 text-center text-texto-suave">Nenhuma mensagem encontrada.</p>
        ) : (
          <div className="relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-destaque-suave text-sm text-texto-titulo">
                <tr>
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Quando</th>
                  <th className="px-4 py-3 font-semibold">Tutor / animal</th>
                  <th className="px-4 py-3 font-semibold">Mensagem</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                  <th className="rounded-r-lg px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda align-top">
                {resultado.itens.map((notificacao) => {
                  const instante = notificacao.enviada_em ?? notificacao.agendada_para;
                  return (
                    <tr key={notificacao.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-texto-corpo">
                        {formatar_data_curta(instante)}
                        <span className="block text-sm">{formatar_hora(instante)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-texto-titulo">{notificacao.tutor.nome}</p>
                        <p className="text-sm text-texto-suave">
                          {[notificacao.animal?.nome, notificacao.destinatario ?? notificacao.tutor.email ?? "sem e-mail"]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="text-sm font-medium text-texto-subtitulo">{NOMES_TIPO_NOTIFICACAO[notificacao.tipo]}</p>
                        <details>
                          <summary className="cursor-pointer text-texto-titulo">{notificacao.assunto}</summary>
                          <p className="mt-2 rounded-lg bg-fundo p-3 text-sm whitespace-pre-line text-texto-corpo">
                            {notificacao.mensagem}
                          </p>
                        </details>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${ESTILOS_STATUS_NOTIFICACAO[notificacao.status]}`}
                        >
                          {NOMES_STATUS_NOTIFICACAO[notificacao.status]}
                        </span>
                        {notificacao.erro && <p className="mt-2 max-w-56 text-sm text-rose-700">{notificacao.erro}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <AcoesNotificacao id={notificacao.id} status={notificacao.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Paginacao
          caminho="/notificacoes"
          pagina={resultado.pagina}
          tamanho={resultado.tamanho}
          total={resultado.total}
          busca={busca}
          rotulo_itens="mensagens"
          parametros={Object.fromEntries(Object.entries({ status, tipo }).filter(([, valor]) => valor)) as Record<string, string>}
        />
      </section>
    </div>
  );
}
