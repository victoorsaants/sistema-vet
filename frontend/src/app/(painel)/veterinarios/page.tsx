import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import CabecalhoPagina from "@/components/cabecalho_pagina";
import { formatar_telefone } from "@/lib/formatadores";
import { listar_cadastros_veterinarios } from "@/lib/veterinarios_api";

export const metadata: Metadata = {
  title: "Veterinários | AjuVet+",
};

export default async function VeterinariosPage() {
  const veterinarios = await listar_cadastros_veterinarios();

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Veterinários"
        descricao="Cadastre os veterinários da clínica e o acesso de cada um ao sistema."
        acao={
          <Link
            href="/veterinarios/novo"
            className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white shadow-sm hover:bg-azul-marca"
          >
            <Plus className="size-5" />
            Novo veterinário
          </Link>
        }
      />

      <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
        {veterinarios.length === 0 ? (
          <p className="py-16 text-center text-texto-suave">Nenhum veterinário cadastrado ainda.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-destaque-suave text-sm text-texto-titulo">
                <tr>
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">CRMV</th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Acesso ao sistema</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                  <th className="rounded-r-lg px-4 py-3">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {veterinarios.map((veterinario) => (
                  <tr key={veterinario.id} className="relative hover:bg-fundo">
                    <td className="px-4 py-3">
                      <Link
                        href={`/veterinarios/${veterinario.id}`}
                        className="font-medium text-texto-titulo after:absolute after:inset-0"
                      >
                        {veterinario.nome}
                      </Link>
                      {veterinario.especialidade && <p className="text-sm text-texto-suave">{veterinario.especialidade}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-texto-corpo">{veterinario.crmv}</td>
                    <td className="px-4 py-3 text-sm text-texto-corpo">
                      {[veterinario.telefone && formatar_telefone(veterinario.telefone), veterinario.email]
                        .filter(Boolean)
                        .map((contato) => (
                          <p key={contato}>{contato}</p>
                        ))}
                      {!veterinario.telefone && !veterinario.email && "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {veterinario.acesso ? (
                        <span className="text-texto-corpo">{veterinario.acesso.email}</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">Sem acesso</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          veterinario.ativo ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {veterinario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto size-5 text-texto-subtitulo" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
