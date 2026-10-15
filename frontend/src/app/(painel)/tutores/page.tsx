import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { BarraBusca, ler_numero_pagina, ler_texto, Paginacao } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import { listar_tutores } from "@/lib/cadastros_api";
import { formatar_cpf, formatar_telefone } from "@/lib/formatadores";

export const metadata: Metadata = {
  title: "Tutores | AjuVet+",
};

const TAMANHO_PAGINA = 20;

export default async function TutoresPage({ searchParams }: PageProps<"/tutores">) {
  const parametros = await searchParams;
  const busca = ler_texto(parametros.busca);
  const pagina = ler_numero_pagina(parametros.pagina);
  const resultado = await listar_tutores({ busca, pagina, tamanho: TAMANHO_PAGINA });

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Tutores / Clientes"
        descricao="Cadastre e consulte os tutores e clientes da clínica."
        acao={
          <Link
            href="/tutores/novo"
            className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white shadow-sm hover:bg-azul-marca"
          >
            <Plus className="size-5" />
            Novo tutor
          </Link>
        }
      />

      <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
        <BarraBusca busca={busca} placeholder="Buscar por nome, CPF, telefone ou e-mail" />

        {resultado.itens.length === 0 ? (
          <p className="py-16 text-center text-texto-suave">
            {busca ? `Nenhum tutor encontrado para "${busca}".` : "Nenhum tutor cadastrado ainda."}
          </p>
        ) : (
          <div className="relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-destaque-suave text-sm text-texto-titulo">
                <tr>
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">CPF</th>
                  <th className="px-4 py-3 font-semibold">Telefone</th>
                  <th className="px-4 py-3 font-semibold">Cidade</th>
                  <th className="px-4 py-3 text-center font-semibold">Animais</th>
                  <th className="rounded-r-lg px-4 py-3">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {resultado.itens.map((tutor) => (
                  <tr key={tutor.id} className="group relative hover:bg-fundo">
                    <td className="px-4 py-3">
                      <Link href={`/tutores/${tutor.id}`} className="font-medium text-texto-titulo after:absolute after:inset-0">
                        {tutor.nome}
                      </Link>
                      {tutor.email && <p className="text-sm text-texto-suave">{tutor.email}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-texto-corpo">{tutor.cpf ? formatar_cpf(tutor.cpf) : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-texto-corpo">{formatar_telefone(tutor.telefone_principal)}</td>
                    <td className="px-4 py-3 text-texto-corpo">{tutor.cidade ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-texto-corpo">{tutor.total_animais}</td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto size-5 text-texto-subtitulo" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Paginacao
          caminho="/tutores"
          pagina={resultado.pagina}
          tamanho={resultado.tamanho}
          total={resultado.total}
          busca={busca}
          rotulo_itens="tutores"
        />
      </section>
    </div>
  );
}
