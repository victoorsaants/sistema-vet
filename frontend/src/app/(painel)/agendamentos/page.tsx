import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";

import CabecalhoPagina from "@/components/cabecalho_pagina";
import ListaAgendamentos from "@/components/lista_agendamentos";
import NovoAgendamento from "@/components/novo_agendamento";
import { listar_agendamentos, listar_veterinarios } from "@/lib/agenda_api";
import { obter_usuario_logado } from "@/lib/dal";
import { hoje_na_clinica } from "@/lib/datas_agenda";

export const metadata: Metadata = {
  title: "Agendamentos | AjuVet+",
};

export default async function AgendamentosPage() {
  const usuario = await obter_usuario_logado();
  const eh_recepcao = usuario.perfil === "recepcao";
  const [agendamentos, veterinarios] = await Promise.all([
    listar_agendamentos({ status: ["agendado", "confirmado", "em_atendimento"] }),
    eh_recepcao ? listar_veterinarios() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={eh_recepcao ? "Agendamentos" : "Minha agenda"}
        descricao={
          eh_recepcao
            ? "Agende consultas e exames nos dias e horários disponíveis."
            : "Seus próximos atendimentos agendados."
        }
        acao={
          eh_recepcao && (
            <Link
              href="/agendamentos/expediente"
              className="flex h-11 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
            >
              <Clock className="size-5" />
              Expediente dos veterinários
            </Link>
          )
        }
      />

      {eh_recepcao && <NovoAgendamento veterinarios={veterinarios} hoje={hoje_na_clinica()} />}

      <ListaAgendamentos
        titulo="Próximos agendamentos"
        agendamentos={agendamentos}
        pode_alterar={eh_recepcao}
        pode_atender={!eh_recepcao}
        mostrar_veterinario={eh_recepcao}
        vazio={
          eh_recepcao
            ? "Nenhum agendamento futuro."
            : "Nenhum atendimento agendado para você. Se isso parecer errado, peça para a recepção conferir se seu login está ligado ao seu cadastro de veterinário."
        }
      />
    </div>
  );
}
