import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  Heart,
  PawPrint,
  Pill,
  Stethoscope,
  Syringe,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { ler_numero_pagina, ler_texto, Paginacao } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FichaResumidaAnimal from "@/components/ficha_resumida_animal";
import { obter_historico, type ReferenciaAtendimento, type TipoEvento } from "@/lib/atendimentos_api";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { formatar_data_curta, formatar_hora, NOMES_TIPO } from "@/lib/datas_agenda";
import { NOMES_EVENTO } from "@/lib/opcoes_atendimento";

export const metadata: Metadata = {
  title: "Histórico Clínico | AjuVet+",
};

const TAMANHO_PAGINA = 10;

const ICONES_EVENTO: Record<TipoEvento, LucideIcon> = {
  atendimento: Stethoscope,
  exame: FlaskConical,
  vacina: Syringe,
  prescricao: Pill,
};

function eh_tipo_evento(valor: string): valor is TipoEvento {
  return valor in NOMES_EVENTO;
}

function CartaoReferencia({
  titulo,
  icone: Icone,
  referencia,
  href,
  vazio,
}: {
  titulo: string;
  icone: LucideIcon;
  referencia: ReferenciaAtendimento | null;
  href: string | null;
  vazio: string;
}) {
  return (
    <div className="rounded-xl border border-borda p-4">
      <p className="mb-2 flex items-center gap-2 font-semibold text-texto-titulo">
        <Icone className="size-5 text-azul-ativo" /> {titulo}
      </p>
      {referencia ? (
        <>
          <p className="flex items-center gap-2 text-sm text-texto-corpo">
            <Clock className="size-4" /> {formatar_data_curta(referencia.data)} às {formatar_hora(referencia.data)}
          </p>
          <p className="flex items-center gap-2 text-sm text-texto-corpo">
            <Stethoscope className="size-4" /> {NOMES_TIPO[referencia.tipo]}
          </p>
          <p className="flex items-center gap-2 text-sm text-texto-corpo">
            <UserRound className="size-4" /> {referencia.veterinario}
          </p>
          {href && (
            <Link
              href={href}
              className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-azul-marca py-1.5 text-sm font-medium text-azul-marca hover:bg-destaque-suave"
            >
              Ver detalhes <ChevronRight className="size-4" />
            </Link>
          )}
        </>
      ) : (
        <p className="text-sm text-texto-suave">{vazio}</p>
      )}
    </div>
  );
}

export default async function HistoricoAnimalPage({ params, searchParams }: PageProps<"/historico/[id]">) {
  const { id } = await params;
  const parametros = await searchParams;
  const tipo_escolhido = ler_texto(parametros.tipo);
  const tipo = eh_tipo_evento(tipo_escolhido) ? tipo_escolhido : undefined;
  const pagina = ler_numero_pagina(parametros.pagina);
  const historico = await carregar_ou_404(obter_historico(id, { tipo, pagina, tamanho: TAMANHO_PAGINA }));
  const { resumo } = historico;

  const abas: { valor: TipoEvento | undefined; rotulo: string; icone: LucideIcon }[] = [
    { valor: undefined, rotulo: "Resumo", icone: FileText },
    ...(Object.keys(NOMES_EVENTO) as TipoEvento[]).map((valor) => ({
      valor,
      rotulo: NOMES_EVENTO[valor],
      icone: ICONES_EVENTO[valor],
    })),
  ];
  const quadros: { rotulo: string; valor: number; icone: LucideIcon; estilo: string }[] = [
    { rotulo: "Consultas", valor: resumo.consultas, icone: Stethoscope, estilo: "bg-sky-50 text-sky-800" },
    { rotulo: "Exames", valor: resumo.exames, icone: FlaskConical, estilo: "bg-emerald-50 text-emerald-800" },
    { rotulo: "Vacinas", valor: resumo.vacinas, icone: Syringe, estilo: "bg-violet-50 text-violet-800" },
    { rotulo: "Tratamentos", valor: resumo.tratamentos, icone: Pill, estilo: "bg-amber-50 text-amber-800" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Histórico Clínico"
        descricao={`Tutor(a): ${historico.tutor.nome}`}
        voltar={{ href: "/historico", rotulo: "Histórico" }}
      />

      <FichaResumidaAnimal
        animal={historico.animal}
        acao={
          <Link
            href={`/animais/${historico.animal.id}`}
            className="flex h-11 items-center gap-2 rounded-lg border border-azul-marca bg-destaque-suave px-4 font-medium text-azul-marca hover:bg-white"
          >
            <PawPrint className="size-5" /> Ver dados do animal
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
          <nav aria-label="Tipos de registro" className="flex gap-1 overflow-x-auto border-b border-borda">
            {abas.map(({ valor, rotulo, icone: Icone }) => {
              const ativa = valor === tipo;
              return (
                <Link
                  key={rotulo}
                  href={valor ? `/historico/${id}?tipo=${valor}` : `/historico/${id}`}
                  aria-current={ativa ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-medium ${
                    ativa ? "border-azul-ativo text-azul-ativo" : "border-transparent text-texto-subtitulo hover:text-azul-marca"
                  }`}
                >
                  <Icone className="size-4" /> {rotulo}
                </Link>
              );
            })}
          </nav>

          <h2 className="mt-6 mb-4 flex items-center gap-2 text-xl font-semibold text-texto-titulo">
            <Clock className="size-5" /> Linha do tempo
          </h2>

          {historico.eventos.length === 0 ? (
            <p className="py-10 text-center text-texto-suave">Nenhum registro encontrado.</p>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l-2 border-destaque-claro pl-6">
              {historico.eventos.map((evento, indice) => {
                const Icone = ICONES_EVENTO[evento.tipo];
                const conteudo = (
                  <>
                    <span className="w-24 shrink-0 text-sm text-texto-corpo">
                      {formatar_data_curta(evento.data)}
                      <span className="block">{formatar_hora(evento.data)}</span>
                    </span>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destaque-suave text-azul-ativo">
                      <Icone className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-texto-titulo">{evento.titulo}</span>
                      {evento.descricao && <span className="block text-sm text-texto-corpo">{evento.descricao}</span>}
                    </span>
                    {evento.veterinario && (
                      <span className="hidden w-44 shrink-0 text-sm text-texto-corpo md:block">
                        <span className="block text-texto-suave">Veterinário(a)</span>
                        {evento.veterinario}
                      </span>
                    )}
                    {evento.atendimento_id && <ChevronRight className="size-5 shrink-0 text-texto-subtitulo" />}
                  </>
                );
                return (
                  <li key={`${evento.tipo}-${evento.data}-${indice}`} className="relative">
                    <span className="absolute top-6 -left-[31px] size-3 rounded-full border-2 border-azul-ativo bg-white" />
                    {evento.atendimento_id ? (
                      <Link
                        href={`/atendimentos/${evento.atendimento_id}`}
                        className="flex items-center gap-4 rounded-xl border border-borda p-4 hover:bg-fundo"
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 rounded-xl border border-borda p-4">{conteudo}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <Paginacao
            caminho={`/historico/${id}`}
            pagina={historico.pagina}
            tamanho={historico.tamanho}
            total={historico.total_eventos}
            busca=""
            rotulo_itens="registros"
            parametros={tipo ? { tipo } : {}}
          />
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-texto-titulo">
              <FileText className="size-5 text-azul-ativo" /> Resumo do histórico
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quadros.map(({ rotulo, valor, icone: Icone, estilo }) => (
                <div key={rotulo} className={`flex items-center gap-3 rounded-xl p-3 ${estilo}`}>
                  <Icone className="size-6" />
                  <span>
                    <span className="block text-xl font-bold">{valor}</span>
                    <span className="block text-sm">{rotulo}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <CartaoReferencia
            titulo="Último atendimento"
            icone={CalendarDays}
            referencia={historico.ultimo_atendimento}
            href={historico.ultimo_atendimento ? `/atendimentos/${historico.ultimo_atendimento.id}` : null}
            vazio="Nenhum atendimento finalizado."
          />
          <CartaoReferencia
            titulo="Próximo agendamento"
            icone={CalendarClock}
            referencia={historico.proximo_agendamento}
            href={null}
            vazio="Nenhum agendamento marcado."
          />
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-destaque-claro/60 p-5 font-manuscrita text-2xl text-azul-marca">
            <Heart className="size-5" fill="currentColor" strokeWidth={0} /> Animais saudáveis, vidas mais felizes!
          </p>
        </aside>
      </div>
    </div>
  );
}
