"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  LoaderCircle,
  PawPrint,
  Stethoscope,
  Trash2,
} from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import SeletorBusca, { type ItemBusca } from "@/components/seletor_busca";
import SecaoCartao from "@/components/secao_cartao";
import { agendar_horario } from "@/lib/acoes_agenda";
import type { DiaAgenda, HorarioAgenda, TipoAtendimento, Veterinario } from "@/lib/agenda_api";
import type { CamposComErro } from "@/lib/cliente_api";
import { formatar_dia_extenso, formatar_hora, NOMES_TIPO, partes_do_dia, somar_dias } from "@/lib/datas_agenda";

const TIPOS = Object.entries(NOMES_TIPO) as [TipoAtendimento, string][];
const DIAS_POR_SEMANA = 7;

function sem_campo(campos: CamposComErro, campo: string): CamposComErro {
  return Object.fromEntries(Object.entries(campos).filter(([nome]) => nome !== campo));
}

type NovoAgendamentoProps = {
  veterinarios: Veterinario[];
  hoje: string;
};

type EstadoAgenda = {
  chave: string;
  dias: DiaAgenda[];
  erro: string | null;
};

export default function NovoAgendamento({ veterinarios, hoje }: NovoAgendamentoProps) {
  const [tipo, definir_tipo] = useState<TipoAtendimento>("consulta");
  const [animal, definir_animal] = useState<ItemBusca | null>(null);
  const [chave_animal, definir_chave_animal] = useState(0);
  const [veterinario_id, definir_veterinario_id] = useState(veterinarios[0]?.id ?? "");
  const [especialidade, definir_especialidade] = useState("");
  const [observacoes, definir_observacoes] = useState("");
  const [inicio_semana, definir_inicio_semana] = useState(hoje);
  const [dia_escolhido, definir_dia_escolhido] = useState<string | null>(null);
  const [horario, definir_horario] = useState<HorarioAgenda | null>(null);
  const [agenda, definir_agenda] = useState<EstadoAgenda>({ chave: "", dias: [], erro: null });
  const [versao_agenda, definir_versao_agenda] = useState(0);
  const [campos, definir_campos] = useState<CamposComErro>({});
  const [mensagem, definir_mensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [enviando, iniciar_envio] = useTransition();

  const chave_agenda = `${veterinario_id}|${inicio_semana}|${versao_agenda}`;
  const carregando_agenda = Boolean(veterinario_id) && agenda.chave !== chave_agenda;

  useEffect(() => {
    if (!veterinario_id) {
      return;
    }
    const controle = new AbortController();
    fetch(`/api/agenda?veterinario_id=${veterinario_id}&inicio=${inicio_semana}`, { signal: controle.signal })
      .then(async (resposta) => {
        const corpo = await resposta.json();
        if (!resposta.ok) {
          throw new Error(corpo?.detail ?? "Não foi possível carregar a agenda.");
        }
        definir_agenda({ chave: chave_agenda, dias: corpo, erro: null });
      })
      .catch((erro: Error) => {
        if (!controle.signal.aborted) {
          definir_agenda({ chave: chave_agenda, dias: [], erro: erro.message });
        }
      });
    return () => controle.abort();
  }, [chave_agenda, veterinario_id, inicio_semana]);

  const dias = agenda.chave === chave_agenda ? agenda.dias : [];
  const dia_atual = dias.find(({ data }) => data === dia_escolhido) ?? null;
  const veterinario = veterinarios.find(({ id }) => id === veterinario_id);

  function trocar_semana(deslocamento: number) {
    definir_inicio_semana(somar_dias(inicio_semana, deslocamento * DIAS_POR_SEMANA));
    definir_dia_escolhido(null);
    definir_horario(null);
  }

  function trocar_veterinario(id: string) {
    definir_veterinario_id(id);
    definir_dia_escolhido(null);
    definir_horario(null);
  }

  function limpar() {
    definir_animal(null);
    definir_chave_animal((valor) => valor + 1);
    definir_especialidade("");
    definir_observacoes("");
    definir_horario(null);
    definir_campos({});
    definir_mensagem(null);
  }

  function confirmar() {
    const faltando: CamposComErro = {};
    if (!animal) {
      faltando.animal_id = "Selecione o animal.";
    }
    if (!horario) {
      faltando.inicio = "Escolha um horário.";
    }
    if (!animal || !horario || !dia_escolhido) {
      definir_campos(faltando);
      return;
    }
    const animal_escolhido = animal;
    const horario_escolhido = horario;
    const dia = dia_escolhido;
    iniciar_envio(async () => {
      const resultado = await agendar_horario({
        animal_id: animal_escolhido.id,
        veterinario_id,
        tipo,
        especialidade: especialidade.trim() || null,
        inicio: horario_escolhido.inicio,
        observacoes: observacoes.trim() || null,
      });
      if (resultado.ok) {
        definir_mensagem({
          tipo: "sucesso",
          texto: `${NOMES_TIPO[tipo]} de ${animal_escolhido.nome} marcada para ${formatar_dia_extenso(dia)} às ${formatar_hora(horario_escolhido.inicio)}.`,
        });
        definir_animal(null);
        definir_chave_animal((valor) => valor + 1);
        definir_especialidade("");
        definir_observacoes("");
        definir_horario(null);
        definir_campos({});
      } else {
        definir_campos(resultado.campos);
        definir_mensagem({ tipo: "erro", texto: resultado.erro });
        definir_horario(null);
      }
      definir_versao_agenda((valor) => valor + 1);
    });
  }

  if (veterinarios.length === 0) {
    return (
      <p className="rounded-2xl border border-borda bg-superficie p-8 text-center text-texto-suave">
        Nenhum veterinário cadastrado. Cadastre um veterinário e o expediente dele para começar a agendar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SecaoCartao titulo="Novo Agendamento" icone={CalendarDays} cor="bg-modulo-agendamentos">
        <fieldset className="mb-5">
          <legend className="mb-2 text-sm font-medium text-texto-titulo">Tipo</legend>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={tipo === valor}
                onClick={() => definir_tipo(valor)}
                className={`rounded-lg border px-4 py-2 font-medium transition ${
                  tipo === valor
                    ? "border-azul-ativo bg-azul-ativo text-white"
                    : "border-borda bg-white text-texto-subtitulo hover:bg-destaque-suave"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 lg:grid-cols-3">
          <SeletorBusca
            key={chave_animal}
            rotulo="Animal"
            nome="animal_id"
            endpoint="/api/animais"
            placeholder="Nome do animal, microchip ou tutor"
            icone={PawPrint}
            inicial={animal}
            erro={campos.animal_id}
            ao_selecionar={(item) => {
              definir_animal(item);
              definir_campos((atual) => sem_campo(atual, "animal_id"));
            }}
          />
          <div>
            <label htmlFor="especialidade" className="mb-1.5 block text-sm font-medium text-texto-titulo">
              Especialidade / tipo de consulta
            </label>
            <input
              id="especialidade"
              value={especialidade}
              onChange={(evento) => definir_especialidade(evento.target.value)}
              placeholder="Ex.: Clínica geral"
              maxLength={100}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo outline-none focus:border-azul-marca focus:ring-2 focus:ring-azul-marca/20"
            />
          </div>
          <div>
            <label htmlFor="veterinario" className="mb-1.5 block text-sm font-medium text-texto-titulo">
              Veterinário(a) <span className="text-rose-600">*</span>
            </label>
            <select
              id="veterinario"
              value={veterinario_id}
              onChange={(evento) => trocar_veterinario(evento.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo outline-none focus:border-azul-marca focus:ring-2 focus:ring-azul-marca/20"
            >
              {veterinarios.map(({ id, nome, especialidade: area }) => (
                <option key={id} value={id}>
                  {nome}
                  {area ? ` · ${area}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SecaoCartao>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SecaoCartao titulo="Escolha uma data e horário" icone={Clock} cor="bg-azul-ativo">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => trocar_semana(-1)}
              disabled={inicio_semana <= hoje}
              aria-label="Semana anterior"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-borda bg-white text-texto-subtitulo hover:bg-destaque-suave disabled:opacity-30"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="grid flex-1 grid-cols-7 gap-2">
              {(dias.length ? dias : Array.from({ length: DIAS_POR_SEMANA }, () => null)).map((dia, indice) => {
                if (!dia) {
                  return <div key={indice} className="h-20 animate-pulse rounded-xl bg-slate-100" />;
                }
                const partes = partes_do_dia(dia.data);
                const livres = dia.horarios.filter(({ disponivel }) => disponivel).length;
                const selecionado = dia.data === dia_escolhido;
                return (
                  <button
                    key={dia.data}
                    type="button"
                    disabled={livres === 0}
                    aria-pressed={selecionado}
                    onClick={() => {
                      definir_dia_escolhido(dia.data);
                      definir_horario(null);
                    }}
                    title={dia.atende ? `${livres} horários livres` : "Sem expediente"}
                    className={`flex h-20 flex-col items-center justify-center rounded-xl border text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      selecionado
                        ? "border-azul-ativo bg-azul-ativo text-white shadow-md"
                        : "border-borda bg-white text-texto-titulo hover:bg-destaque-suave"
                    }`}
                  >
                    <span className={selecionado ? "text-white/90" : "text-texto-suave"}>{partes.semana}</span>
                    <span className="text-lg font-semibold">
                      {partes.dia} {partes.mes}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => trocar_semana(1)}
              aria-label="Próxima semana"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-borda bg-white text-texto-subtitulo hover:bg-destaque-suave"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="mt-6">
            {agenda.erro ? (
              <Aviso tipo="erro">{agenda.erro}</Aviso>
            ) : carregando_agenda ? (
              <p className="flex items-center gap-2 text-texto-suave">
                <LoaderCircle className="size-4 animate-spin" /> Carregando horários...
              </p>
            ) : !dia_atual ? (
              <p className="text-texto-suave">
                {dias.some(({ horarios }) => horarios.some(({ disponivel }) => disponivel))
                  ? "Escolha um dia para ver os horários."
                  : "Nenhum horário livre nesta semana. Veja a próxima semana ou outro veterinário."}
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium text-texto-titulo">
                  Horários de {formatar_dia_extenso(dia_atual.data)}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {dia_atual.horarios.map((opcao) => {
                    const selecionado = horario?.inicio === opcao.inicio;
                    return (
                      <button
                        key={opcao.inicio}
                        type="button"
                        disabled={!opcao.disponivel}
                        aria-pressed={selecionado}
                        onClick={() => {
                          definir_horario(opcao);
                          definir_campos((atual) => sem_campo(atual, "inicio"));
                        }}
                        className={`h-11 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through ${
                          selecionado
                            ? "border-azul-ativo bg-azul-ativo text-white"
                            : "border-borda bg-white text-texto-titulo hover:bg-destaque-suave"
                        }`}
                      >
                        {formatar_hora(opcao.inicio)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {campos.inicio && <p className="mt-2 text-sm text-rose-600">{campos.inicio}</p>}
          </div>
        </SecaoCartao>

        <SecaoCartao titulo={NOMES_TIPO[tipo]} icone={CalendarCheck} cor="bg-modulo-historico">
          <dl className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <PawPrint className="size-5 text-texto-suave" />
              <dd className={animal ? "font-medium text-texto-titulo" : "text-texto-suave"}>
                {animal ? animal.nome : "Animal não selecionado"}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5 text-texto-suave" />
              <dd className={dia_escolhido ? "font-medium text-texto-titulo" : "text-texto-suave"}>
                {dia_escolhido ? formatar_dia_extenso(dia_escolhido) : "Data não escolhida"}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-texto-suave" />
              <dd className={horario ? "font-medium text-texto-titulo" : "text-texto-suave"}>
                {horario ? `${formatar_hora(horario.inicio)} às ${formatar_hora(horario.fim)}` : "Horário não escolhido"}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Stethoscope className="size-5 text-texto-suave" />
              <dd className="font-medium text-texto-titulo">{veterinario?.nome}</dd>
            </div>
          </dl>

          <label htmlFor="observacoes" className="mt-5 mb-1.5 block text-sm font-medium text-texto-titulo">
            Observações
          </label>
          <textarea
            id="observacoes"
            value={observacoes}
            onChange={(evento) => definir_observacoes(evento.target.value)}
            maxLength={1000}
            placeholder="Ex.: animal em jejum"
            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-texto-titulo outline-none focus:border-azul-marca focus:ring-2 focus:ring-azul-marca/20"
          />

          {horario && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <CircleCheck className="size-4" /> Horário disponível
            </p>
          )}

          {mensagem && (
            <div className="mt-4">
              <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
            </div>
          )}

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-azul-ativo font-medium text-white shadow-sm hover:bg-azul-marca disabled:opacity-70"
          >
            {enviando ? <LoaderCircle className="size-5 animate-spin" /> : <CalendarCheck className="size-5" />}
            {enviando ? "Agendando..." : "Confirmar agendamento"}
          </button>
          <button
            type="button"
            onClick={limpar}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-azul-marca font-medium text-azul-marca hover:bg-destaque-suave"
          >
            <Trash2 className="size-4" />
            Limpar
          </button>
        </SecaoCartao>
      </div>
    </div>
  );
}
