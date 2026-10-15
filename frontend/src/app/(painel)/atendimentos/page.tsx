import type { Metadata } from "next";
import { ClipboardList, Timer } from "lucide-react";

import CabecalhoPagina from "@/components/cabecalho_pagina";
import ListaAgendamentos from "@/components/lista_agendamentos";
import NovoAtendimentoAvulso from "@/components/novo_atendimento_avulso";
import TabelaAtendimentos from "@/components/tabela_atendimentos";
import { listar_agendamentos } from "@/lib/agenda_api";
import { listar_atendimentos } from "@/lib/atendimentos_api";
import { obter_usuario_logado } from "@/lib/dal";
import { hoje_na_clinica, limites_do_dia } from "@/lib/datas_agenda";

export const metadata: Metadata = {
  title: "Atendimentos | AjuVet+",
};

const LIMITE_RECENTES = 30;

export default async function AtendimentosPage() {
  const usuario = await obter_usuario_logado();
  const eh_veterinario = usuario.perfil === "veterinario";
  const [agendamentos_de_hoje, em_andamento, finalizados] = await Promise.all([
    eh_veterinario
      ? listar_agendamentos({ status: ["agendado", "confirmado", "em_atendimento"], ...limites_do_dia(hoje_na_clinica()) })
      : Promise.resolve([]),
    listar_atendimentos({ meus: eh_veterinario, status: "em_andamento" }),
    listar_atendimentos({ meus: eh_veterinario, status: "finalizado" }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Atendimentos"
        descricao={
          eh_veterinario
            ? "Atenda os agendamentos do dia e registre o quadro clínico dos pacientes."
            : "Acompanhe os atendimentos em andamento e os já realizados."
        }
      />

      {eh_veterinario && (
        <>
          <ListaAgendamentos
            titulo="Agendados para hoje"
            agendamentos={agendamentos_de_hoje}
            pode_alterar={false}
            pode_atender
            mostrar_veterinario={false}
            vazio="Nenhum agendamento para hoje."
          />
          <NovoAtendimentoAvulso />
        </>
      )}

      <TabelaAtendimentos
        titulo="Em andamento"
        icone={Timer}
        cor="bg-modulo-agendamentos"
        atendimentos={em_andamento}
        vazio="Nenhum atendimento em andamento."
        mostrar_veterinario={!eh_veterinario}
      />
      <TabelaAtendimentos
        titulo="Realizados recentemente"
        icone={ClipboardList}
        cor="bg-modulo-atendimentos"
        atendimentos={finalizados.slice(0, LIMITE_RECENTES)}
        vazio="Nenhum atendimento finalizado ainda."
        mostrar_veterinario={!eh_veterinario}
      />
    </div>
  );
}
