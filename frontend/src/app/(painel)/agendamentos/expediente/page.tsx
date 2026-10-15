import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Stethoscope } from "lucide-react";

import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import EditorExpediente from "@/components/editor_expediente";
import GerenciarFolgas from "@/components/gerenciar_folgas";
import { listar_folgas, listar_veterinarios, obter_expediente } from "@/lib/agenda_api";
import { obter_usuario_logado } from "@/lib/dal";
import { hoje_na_clinica } from "@/lib/datas_agenda";

export const metadata: Metadata = {
  title: "Expediente | AjuVet+",
};

export default async function ExpedientePage({ searchParams }: PageProps<"/agendamentos/expediente">) {
  const usuario = await obter_usuario_logado();
  if (usuario.perfil !== "recepcao") {
    redirect("/agendamentos");
  }

  const veterinarios = await listar_veterinarios();
  const escolhido = ler_texto((await searchParams).veterinario);
  const veterinario = veterinarios.find(({ id }) => id === escolhido) ?? veterinarios[0];
  const [expediente, folgas] = veterinario
    ? await Promise.all([obter_expediente(veterinario.id), listar_folgas(veterinario.id)])
    : [null, []];

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Expediente dos veterinários"
        descricao="Defina os dias e horários de atendimento e as folgas de cada veterinário."
        voltar={{ href: "/agendamentos", rotulo: "Agendamentos" }}
        acao={
          <Link
            href="/veterinarios"
            className="flex h-10 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
          >
            <Stethoscope className="size-4" />
            Cadastro de veterinários
          </Link>
        }
      />

      {!veterinario || !expediente ? (
        <p className="rounded-2xl border border-borda bg-superficie p-8 text-center text-texto-suave">
          Nenhum veterinário ativo.{" "}
          <Link href="/veterinarios/novo" className="font-medium text-azul-marca underline">
            Cadastre um veterinário
          </Link>{" "}
          para montar a agenda.
        </p>
      ) : (
        <>
          <nav aria-label="Veterinários" className="flex flex-wrap gap-2">
            {veterinarios.map(({ id, nome, especialidade }) => {
              const ativo = id === veterinario.id;
              return (
                <Link
                  key={id}
                  href={`/agendamentos/expediente?veterinario=${id}`}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
                    ativo
                      ? "border-azul-ativo bg-azul-ativo text-white"
                      : "border-borda bg-superficie text-texto-titulo hover:bg-destaque-suave"
                  }`}
                >
                  <Stethoscope className="size-4" />
                  <span className="font-medium">{nome}</span>
                  {especialidade && <span className={ativo ? "text-white/80" : "text-texto-suave"}>· {especialidade}</span>}
                </Link>
              );
            })}
          </nav>

          <EditorExpediente key={veterinario.id} veterinario_id={veterinario.id} faixas_iniciais={expediente.faixas} />
          <GerenciarFolgas veterinario_id={veterinario.id} folgas={folgas} hoje={hoje_na_clinica()} />
        </>
      )}
    </div>
  );
}
