import { ListChecks } from "lucide-react";

import AcoesStatusAgendamento from "@/components/acoes_status_agendamento";
import BotaoAtender from "@/components/botao_atender";
import SecaoCartao from "@/components/secao_cartao";
import type { Agendamento, StatusAgendamento } from "@/lib/agenda_api";
import { formatar_data_curta, formatar_hora, NOMES_STATUS, NOMES_TIPO } from "@/lib/datas_agenda";

const ESTILO_STATUS: Record<StatusAgendamento, string> = {
  agendado: "bg-sky-50 text-sky-800",
  confirmado: "bg-emerald-50 text-emerald-800",
  em_atendimento: "bg-violet-50 text-violet-800",
  concluido: "bg-slate-100 text-slate-700",
  cancelado: "bg-rose-50 text-rose-700",
  faltou: "bg-amber-50 text-amber-800",
};

const STATUS_ATENDIVEIS: StatusAgendamento[] = ["agendado", "confirmado", "em_atendimento"];

type ListaAgendamentosProps = {
  titulo: string;
  agendamentos: Agendamento[];
  pode_alterar: boolean;
  pode_atender?: boolean;
  mostrar_veterinario: boolean;
  vazio: string;
};

export default function ListaAgendamentos({
  titulo,
  agendamentos,
  pode_alterar,
  pode_atender = false,
  mostrar_veterinario,
  vazio,
}: ListaAgendamentosProps) {
  return (
    <SecaoCartao titulo={titulo} icone={ListChecks} cor="bg-modulo-tutores">
      {agendamentos.length === 0 ? (
        <p className="text-texto-suave">{vazio}</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-destaque-suave text-sm text-texto-titulo">
              <tr>
                <th className="rounded-l-lg px-4 py-3 font-semibold">Data e hora</th>
                <th className="px-4 py-3 font-semibold">Animal</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                {mostrar_veterinario && <th className="px-4 py-3 font-semibold">Veterinário(a)</th>}
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="rounded-r-lg px-4 py-3">{(pode_alterar || pode_atender) && <span className="sr-only">Ações</span>}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {agendamentos.map((agendamento) => (
                <tr key={agendamento.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-texto-titulo">{formatar_data_curta(agendamento.inicio)}</p>
                    <p className="text-sm text-texto-suave">
                      {formatar_hora(agendamento.inicio)} – {formatar_hora(agendamento.fim)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-texto-titulo">{agendamento.animal.nome}</p>
                    <p className="text-sm text-texto-suave">Tutor: {agendamento.tutor.nome}</p>
                  </td>
                  <td className="px-4 py-3 text-texto-corpo">
                    {NOMES_TIPO[agendamento.tipo]}
                    {agendamento.especialidade && (
                      <span className="block text-sm text-texto-suave">{agendamento.especialidade}</span>
                    )}
                  </td>
                  {mostrar_veterinario && <td className="px-4 py-3 text-texto-corpo">{agendamento.veterinario.nome}</td>}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${ESTILO_STATUS[agendamento.status]}`}>
                      {NOMES_STATUS[agendamento.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {pode_atender && STATUS_ATENDIVEIS.includes(agendamento.status) && (
                      <BotaoAtender agendamento_id={agendamento.id} em_andamento={agendamento.status === "em_atendimento"} />
                    )}
                    {pode_alterar && (
                      <AcoesStatusAgendamento
                        agendamento_id={agendamento.id}
                        status={agendamento.status}
                        descricao={`${agendamento.animal.nome} em ${formatar_data_curta(agendamento.inicio)} às ${formatar_hora(agendamento.inicio)}`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SecaoCartao>
  );
}
