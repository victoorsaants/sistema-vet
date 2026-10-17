import type { Metadata } from "next";
import Link from "next/link";
import { FileClock } from "lucide-react";

import AnexosAtendimento from "@/components/anexos_atendimento";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FichaResumidaAnimal from "@/components/ficha_resumida_animal";
import FinanceiroAtendimento from "@/components/financeiro_atendimento";
import FormularioAtendimento from "@/components/formulario_atendimento";
import NotificacoesAtendimento from "@/components/notificacoes_atendimento";
import VisualizacaoAtendimento from "@/components/visualizacao_atendimento";
import { obter_atendimento } from "@/lib/atendimentos_api";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { obter_usuario_logado } from "@/lib/dal";
import { formatar_data_curta, formatar_hora, NOMES_TIPO } from "@/lib/datas_agenda";

export const metadata: Metadata = {
  title: "Atendimento | AjuVet+",
};

export default async function AtendimentoPage({ params }: PageProps<"/atendimentos/[id]">) {
  const { id } = await params;
  const [usuario, atendimento] = await Promise.all([obter_usuario_logado(), carregar_ou_404(obter_atendimento(id))]);
  const pode_editar = atendimento.status === "em_andamento" && atendimento.veterinario.perfil_id === usuario.id;
  const anexos = (
    <AnexosAtendimento atendimento_id={atendimento.id} anexos={atendimento.anexos} pode_editar={pode_editar} />
  );
  const finalizado = atendimento.status === "finalizado";
  const notificacoes = (
    <NotificacoesAtendimento
      atendimento_id={atendimento.id}
      finalizado={finalizado}
      email_tutor={atendimento.tutor.email}
      pode_ver_fila={usuario.perfil === "recepcao"}
    />
  );
  const quando = `${formatar_data_curta(atendimento.realizado_em)} às ${formatar_hora(atendimento.realizado_em)}`;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={`${NOMES_TIPO[atendimento.tipo]}${finalizado ? "" : " em andamento"}`}
        descricao={`${quando} · ${atendimento.veterinario.nome}${finalizado ? " · Finalizado" : ""}`}
        voltar={{ href: "/atendimentos", rotulo: "Atendimentos" }}
      />

      <FichaResumidaAnimal
        animal={atendimento.animal}
        tutor={atendimento.tutor}
        acao={
          <Link
            href={`/historico/${atendimento.animal.id}`}
            className="flex h-11 items-center gap-2 rounded-lg border border-azul-marca bg-destaque-suave px-4 font-medium text-azul-marca hover:bg-white"
          >
            <FileClock className="size-5" /> Ver histórico
          </Link>
        }
      />

      {pode_editar ? (
        <>
          <FormularioAtendimento key={atendimento.id} atendimento={atendimento} anexos={anexos} />
          {notificacoes}
        </>
      ) : (
        <>
          <VisualizacaoAtendimento atendimento={atendimento} />
          {anexos}
          <div className={`grid gap-6 ${usuario.perfil === "recepcao" ? "xl:grid-cols-2" : ""}`}>
            {notificacoes}
            {usuario.perfil === "recepcao" && <FinanceiroAtendimento atendimento_id={atendimento.id} />}
          </div>
        </>
      )}
    </div>
  );
}
