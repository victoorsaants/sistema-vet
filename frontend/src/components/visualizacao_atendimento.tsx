import type { ReactNode } from "react";
import { ClipboardCheck, FlaskConical, HeartPulse, Pill, Stethoscope, Syringe } from "lucide-react";

import SecaoCartao from "@/components/secao_cartao";
import type { Atendimento } from "@/lib/atendimentos_api";
import { formatar_data, formatar_numero } from "@/lib/formatadores";

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-texto-suave">{rotulo}</dt>
      <dd className="font-medium whitespace-pre-line text-texto-titulo">{children || "—"}</dd>
    </div>
  );
}

function com_unidade(valor: number | null, unidade: string): string {
  return valor === null ? "" : `${formatar_numero(valor)} ${unidade}`;
}

export default function VisualizacaoAtendimento({ atendimento }: { atendimento: Atendimento }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <SecaoCartao titulo="Estado do animal" icone={HeartPulse} cor="bg-azul-ativo">
          <dl className="grid grid-cols-2 gap-4">
            <Dado rotulo="Peso">{com_unidade(atendimento.peso_kg, "kg")}</Dado>
            <Dado rotulo="Temperatura">{com_unidade(atendimento.temperatura_c, "°C")}</Dado>
            <Dado rotulo="Freq. cardíaca">{com_unidade(atendimento.frequencia_cardiaca, "bpm")}</Dado>
            <Dado rotulo="Freq. respiratória">{com_unidade(atendimento.frequencia_respiratoria, "rpm")}</Dado>
            <div className="col-span-2">
              <Dado rotulo="Condição geral">{atendimento.condicao_geral}</Dado>
            </div>
            <div className="col-span-2">
              <Dado rotulo="Queixa principal">{atendimento.queixa_principal}</Dado>
            </div>
          </dl>
        </SecaoCartao>

        <SecaoCartao titulo="Procedimentos realizados" icone={Stethoscope} cor="bg-modulo-atendimentos">
          {atendimento.procedimentos.length === 0 ? (
            <p className="text-texto-suave">Nenhum procedimento registrado.</p>
          ) : (
            <ul className="list-inside list-disc text-texto-titulo">
              {atendimento.procedimentos.map((procedimento) => (
                <li key={procedimento}>{procedimento}</li>
              ))}
            </ul>
          )}
          <dl className="mt-4">
            <Dado rotulo="Observações">{atendimento.observacoes}</Dado>
          </dl>
        </SecaoCartao>

        <SecaoCartao titulo="Exames" icone={FlaskConical} cor="bg-modulo-historico">
          {atendimento.exames.length === 0 ? (
            <p className="text-texto-suave">Nenhum exame solicitado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {atendimento.exames.map((exame) => (
                <li key={exame.id}>
                  <p className="font-medium text-texto-titulo">{exame.nome}</p>
                  <p className="text-sm text-texto-corpo">{exame.resultado ?? "Aguardando resultado."}</p>
                </li>
              ))}
            </ul>
          )}
        </SecaoCartao>
      </div>

      <SecaoCartao titulo="Prescrição de medicamentos" icone={Pill} cor="bg-modulo-financeiro">
        {!atendimento.prescricao ? (
          <p className="text-texto-suave">Nenhuma prescrição.</p>
        ) : (
          <>
            {atendimento.prescricao.itens.length > 0 && (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="bg-destaque-suave text-sm text-texto-titulo">
                    <tr>
                      <th className="rounded-l-lg px-4 py-2 font-semibold">Medicamento</th>
                      <th className="px-4 py-2 font-semibold">Dose</th>
                      <th className="px-4 py-2 font-semibold">Frequência</th>
                      <th className="rounded-r-lg px-4 py-2 font-semibold">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda text-texto-titulo">
                    {atendimento.prescricao.itens.map((item, indice) => (
                      <tr key={indice}>
                        <td className="px-4 py-2">{item.medicamento}</td>
                        <td className="px-4 py-2">{item.dose}</td>
                        <td className="px-4 py-2">{item.frequencia}</td>
                        <td className="px-4 py-2">{item.duracao_dias ? `${item.duracao_dias} dias` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {atendimento.prescricao.orientacoes && (
              <dl className="mt-4">
                <Dado rotulo="Orientações gerais">{atendimento.prescricao.orientacoes}</Dado>
              </dl>
            )}
          </>
        )}
      </SecaoCartao>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecaoCartao titulo="Vacinas aplicadas" icone={Syringe} cor="bg-modulo-agendamentos">
          {atendimento.vacinas.length === 0 ? (
            <p className="text-texto-suave">Nenhuma vacina aplicada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {atendimento.vacinas.map((vacina) => (
                <li key={vacina.id} className="text-texto-titulo">
                  <span className="font-medium">{vacina.vacina}</span>
                  <span className="text-sm text-texto-corpo">
                    {[vacina.dose, vacina.lote && `Lote ${vacina.lote}`, vacina.proxima_dose_em && `Próxima dose em ${formatar_data(vacina.proxima_dose_em)}`]
                      .filter(Boolean)
                      .map((parte) => ` · ${parte}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SecaoCartao>

        <SecaoCartao titulo="Diagnóstico e retorno" icone={ClipboardCheck} cor="bg-modulo-animais">
          <dl className="flex flex-col gap-4">
            <Dado rotulo="Diagnóstico">{atendimento.diagnostico}</Dado>
            <Dado rotulo="Retorno em">{atendimento.retorno_em ? formatar_data(atendimento.retorno_em) : ""}</Dado>
          </dl>
        </SecaoCartao>
      </div>
    </div>
  );
}
