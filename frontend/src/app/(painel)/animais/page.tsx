import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { BarraBusca, ler_numero_pagina, ler_texto, Paginacao } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import { listar_animais } from "@/lib/cadastros_api";
import { obter_usuario_logado } from "@/lib/dal";
import { calcular_idade } from "@/lib/formatadores";
import { NOMES_SEXO } from "@/lib/opcoes_cadastro";

export const metadata: Metadata = {
  title: "Animais | AjuVet+",
};

const TAMANHO_PAGINA = 20;

export default async function AnimaisPage({ searchParams }: PageProps<"/animais">) {
  const parametros = await searchParams;
  const busca = ler_texto(parametros.busca);
  const pagina = ler_numero_pagina(parametros.pagina);
  const [usuario, resultado] = await Promise.all([
    obter_usuario_logado(),
    listar_animais({ busca, pagina, tamanho: TAMANHO_PAGINA }),
  ]);
  const pode_cadastrar = usuario.perfil === "recepcao";

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Animais"
        descricao={
          pode_cadastrar
            ? "Cadastre e consulte os animais atendidos na clínica."
            : "Consulte a ficha dos animais atendidos na clínica."
        }
        acao={
          pode_cadastrar && (
            <Link
              href="/animais/novo"
              className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white shadow-sm hover:bg-azul-marca"
            >
              <Plus className="size-5" />
              Novo animal
            </Link>
          )
        }
      />

      <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
        <BarraBusca busca={busca} placeholder="Buscar por nome do animal, microchip ou tutor" />

        {resultado.itens.length === 0 ? (
          <p className="py-16 text-center text-texto-suave">
            {busca ? `Nenhum animal encontrado para "${busca}".` : "Nenhum animal cadastrado ainda."}
          </p>
        ) : (
          <div className="relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-destaque-suave text-sm text-texto-titulo">
                <tr>
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Animal</th>
                  <th className="px-4 py-3 font-semibold">Sexo</th>
                  <th className="px-4 py-3 font-semibold">Idade</th>
                  <th className="px-4 py-3 font-semibold">Tutor</th>
                  <th className="px-4 py-3 font-semibold">Microchip</th>
                  <th className="rounded-r-lg px-4 py-3">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {resultado.itens.map((animal) => (
                  <tr key={animal.id} className="relative hover:bg-fundo">
                    <td className="px-4 py-3">
                      <Link href={`/animais/${animal.id}`} className="font-medium text-texto-titulo after:absolute after:inset-0">
                        {animal.nome}
                      </Link>
                      <p className="text-sm text-texto-suave">
                        {[animal.especie, animal.raca].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-texto-corpo">{animal.sexo ? NOMES_SEXO[animal.sexo] : "—"}</td>
                    <td className="px-4 py-3 text-texto-corpo">{calcular_idade(animal.data_nascimento)}</td>
                    <td className="px-4 py-3 text-texto-corpo">{animal.tutor.nome}</td>
                    <td className="px-4 py-3 text-texto-corpo">{animal.microchip ?? "—"}</td>
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
          caminho="/animais"
          pagina={resultado.pagina}
          tamanho={resultado.tamanho}
          total={resultado.total}
          busca={busca}
          rotulo_itens="animais"
        />
      </section>
    </div>
  );
}
