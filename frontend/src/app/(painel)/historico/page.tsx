import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardList, Search } from "lucide-react";

import BuscaHistorico from "@/components/busca_historico";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import SecaoCartao from "@/components/secao_cartao";
import { listar_atendimentos } from "@/lib/atendimentos_api";
import { formatar_data_curta, NOMES_TIPO } from "@/lib/datas_agenda";

export const metadata: Metadata = {
  title: "Histórico Clínico | AjuVet+",
};

const LIMITE_RECENTES = 12;

export default async function HistoricoPage() {
  const atendimentos = await listar_atendimentos({ status: "finalizado" });
  const vistos = new Set<string>();
  const recentes = atendimentos.filter(({ animal }) => !vistos.has(animal.id) && vistos.add(animal.id)).slice(0, LIMITE_RECENTES);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Histórico Clínico"
        descricao="Acompanhe todo o histórico de atendimentos, exames, vacinas e tratamentos dos pacientes."
      />

      <SecaoCartao titulo="Buscar paciente" icone={Search} cor="bg-azul-ativo">
        <BuscaHistorico />
      </SecaoCartao>

      <SecaoCartao titulo="Atendidos recentemente" icone={ClipboardList} cor="bg-modulo-historico">
        {recentes.length === 0 ? (
          <p className="text-texto-suave">Nenhum atendimento finalizado ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recentes.map((atendimento) => (
              <li key={atendimento.animal.id}>
                <Link
                  href={`/historico/${atendimento.animal.id}`}
                  className="flex items-center gap-3 rounded-xl border border-borda p-4 hover:bg-fundo"
                >
                  <span className="flex-1">
                    <span className="block font-semibold text-texto-titulo">{atendimento.animal.nome}</span>
                    <span className="block text-sm text-texto-suave">
                      Tutor: {atendimento.tutor.nome} · {NOMES_TIPO[atendimento.tipo]} em {formatar_data_curta(atendimento.realizado_em)}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-texto-subtitulo" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SecaoCartao>
    </div>
  );
}
