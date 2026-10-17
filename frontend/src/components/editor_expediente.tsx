"use client";

import { useState, useTransition } from "react";
import { Clock, Copy, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_expediente_veterinario } from "@/lib/acoes_agenda";
import type { FaixaExpediente } from "@/lib/agenda_api";
import { DIAS_DA_SEMANA } from "@/lib/datas_agenda";

type Faixa = { inicio: string; fim: string };
type Semana = Record<number, Faixa[]>;

const DURACOES = [15, 20, 30, 40, 45, 60];
const FAIXA_PADRAO: Faixa = { inicio: "08:00", fim: "12:00" };
const DIAS_UTEIS = [1, 2, 3, 4, 5];

function montar_semana(faixas: FaixaExpediente[]): Semana {
  const semana: Semana = Object.fromEntries(DIAS_DA_SEMANA.map(({ valor }) => [valor, []]));
  for (const faixa of faixas) {
    semana[faixa.dia_semana].push({ inicio: faixa.hora_inicio.slice(0, 5), fim: faixa.hora_fim.slice(0, 5) });
  }
  return semana;
}

type EditorExpedienteProps = {
  veterinario_id: string;
  faixas_iniciais: FaixaExpediente[];
};

export default function EditorExpediente({ veterinario_id, faixas_iniciais }: EditorExpedienteProps) {
  const [semana, definir_semana] = useState<Semana>(() => montar_semana(faixas_iniciais));
  const [duracao, definir_duracao] = useState(faixas_iniciais[0]?.duracao_minutos ?? 30);
  const [mensagem, definir_mensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [salvando, iniciar_salvamento] = useTransition();

  function alterar_dia(dia: number, faixas: Faixa[]) {
    definir_semana((atual) => ({ ...atual, [dia]: faixas }));
    definir_mensagem(null);
  }

  function copiar_segunda_para_dias_uteis() {
    definir_semana((atual) => ({
      ...atual,
      ...Object.fromEntries(DIAS_UTEIS.map((dia) => [dia, atual[1].map((faixa) => ({ ...faixa }))])),
    }));
    definir_mensagem(null);
  }

  function salvar() {
    const faixas: FaixaExpediente[] = DIAS_DA_SEMANA.flatMap(({ valor }) =>
      semana[valor].map((faixa) => ({
        dia_semana: valor,
        hora_inicio: faixa.inicio,
        hora_fim: faixa.fim,
        duracao_minutos: duracao,
      })),
    );
    iniciar_salvamento(async () => {
      const resultado = await salvar_expediente_veterinario(veterinario_id, faixas);
      definir_mensagem(
        resultado.ok
          ? { tipo: "sucesso", texto: "Expediente salvo. A agenda já usa os novos horários." }
          : { tipo: "erro", texto: Object.values(resultado.campos)[0] ?? resultado.erro },
      );
    });
  }

  return (
    <SecaoCartao
      titulo="Horário semanal"
      descricao="Dias e horários em que o veterinário atende. A agenda é dividida em consultas da duração escolhida."
      icone={Clock}
      cor="bg-modulo-agendamentos"
      acao={
        <label className="flex items-center gap-2 text-sm font-medium text-texto-titulo">
          Duração de cada horário
          <select
            value={duracao}
            onChange={(evento) => definir_duracao(Number(evento.target.value))}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3"
          >
            {DURACOES.map((minutos) => (
              <option key={minutos} value={minutos}>
                {minutos} min
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="flex flex-col divide-y divide-borda">
        {DIAS_DA_SEMANA.map(({ valor, nome }) => {
          const faixas = semana[valor];
          const atende = faixas.length > 0;
          return (
            <div key={valor} className="flex flex-wrap items-start gap-4 py-4">
              <label className="flex w-36 items-center gap-3 pt-2 font-medium text-texto-titulo">
                <input
                  type="checkbox"
                  checked={atende}
                  onChange={(evento) => alterar_dia(valor, evento.target.checked ? [{ ...FAIXA_PADRAO }] : [])}
                  className="size-5 accent-azul-ativo"
                />
                {nome}
              </label>

              {atende ? (
                <div className="flex flex-1 flex-col gap-2">
                  {faixas.map((faixa, indice) => (
                    <div key={indice} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        aria-label={`${nome}: início da faixa ${indice + 1}`}
                        value={faixa.inicio}
                        onChange={(evento) =>
                          alterar_dia(valor, faixas.map((item, i) => (i === indice ? { ...item, inicio: evento.target.value } : item)))
                        }
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo"
                      />
                      <span className="text-texto-suave">até</span>
                      <input
                        type="time"
                        aria-label={`${nome}: fim da faixa ${indice + 1}`}
                        value={faixa.fim}
                        onChange={(evento) =>
                          alterar_dia(valor, faixas.map((item, i) => (i === indice ? { ...item, fim: evento.target.value } : item)))
                        }
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo"
                      />
                      <button
                        type="button"
                        aria-label={`Remover faixa ${indice + 1} de ${nome}`}
                        onClick={() => alterar_dia(valor, faixas.filter((_, i) => i !== indice))}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => alterar_dia(valor, [...faixas, { inicio: "14:00", fim: "18:00" }])}
                    className="flex w-fit items-center gap-1 text-sm font-medium text-texto-subtitulo hover:text-azul-marca"
                  >
                    <Plus className="size-4" />
                    Adicionar faixa
                  </button>
                </div>
              ) : (
                <p className="pt-2 text-texto-suave">Não atende</p>
              )}
            </div>
          );
        })}
      </div>

      {mensagem && (
        <div className="mt-4">
          <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={copiar_segunda_para_dias_uteis}
          disabled={semana[1].length === 0}
          className="flex h-11 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave disabled:opacity-40"
        >
          <Copy className="size-4" />
          Copiar segunda para os dias úteis
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-6 font-medium text-white shadow-sm hover:bg-azul-marca disabled:opacity-70"
        >
          {salvando ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
          {salvando ? "Salvando..." : "Salvar expediente"}
        </button>
      </div>
    </SecaoCartao>
  );
}
