"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  ArrowLeft,
  CircleCheckBig,
  ClipboardCheck,
  FlaskConical,
  HeartPulse,
  LoaderCircle,
  Pill,
  Plus,
  Save,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_atendimento } from "@/lib/acoes_atendimento";
import type { Atendimento, RegistroAtendimento } from "@/lib/atendimentos_api";
import type { CamposComErro } from "@/lib/cliente_api";
import { formatar_numero } from "@/lib/formatadores";
import { CONDICOES_GERAIS, EXAMES, PROCEDIMENTOS } from "@/lib/opcoes_atendimento";

type ItemEditavel = { chave: number; medicamento: string; dose: string; frequencia: string; duracao: string };
type VacinaEditavel = { chave: number; vacina: string; lote: string; dose: string; proxima: string };
type ExameEditavel = { nome: string; resultado: string };

const ESTILO_CAMPO =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo outline-none placeholder:text-slate-400 focus:border-azul-marca focus:ring-2 focus:ring-azul-marca/20 aria-[invalid=true]:border-rose-400";

let proxima_chave = 1;

function nova_chave(): number {
  proxima_chave += 1;
  return proxima_chave;
}

function texto_ou_nulo(texto: string): string | null {
  return texto.trim() || null;
}

function ler_numero(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) {
    return null;
  }
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : undefined;
}

type FormularioAtendimentoProps = {
  atendimento: Atendimento;
  anexos: ReactNode;
};

export default function FormularioAtendimento({ atendimento, anexos }: FormularioAtendimentoProps) {
  const [peso, definir_peso] = useState(formatar_numero(atendimento.peso_kg ?? atendimento.animal.peso_kg));
  const [temperatura, definir_temperatura] = useState(formatar_numero(atendimento.temperatura_c));
  const [frequencia_cardiaca, definir_fc] = useState(formatar_numero(atendimento.frequencia_cardiaca));
  const [frequencia_respiratoria, definir_fr] = useState(formatar_numero(atendimento.frequencia_respiratoria));
  const [condicao, definir_condicao] = useState(atendimento.condicao_geral ?? "");
  const [queixa, definir_queixa] = useState(atendimento.queixa_principal ?? "");
  const [observacoes, definir_observacoes] = useState(atendimento.observacoes ?? "");
  const [diagnostico, definir_diagnostico] = useState(atendimento.diagnostico ?? "");
  const [retorno, definir_retorno] = useState(atendimento.retorno_em ?? "");
  const [procedimentos, definir_procedimentos] = useState<string[]>(atendimento.procedimentos);
  const [novo_procedimento, definir_novo_procedimento] = useState("");
  const [exames, definir_exames] = useState<ExameEditavel[]>(
    atendimento.exames.map(({ nome, resultado }) => ({ nome, resultado: resultado ?? "" })),
  );
  const [novo_exame, definir_novo_exame] = useState("");
  const [itens, definir_itens] = useState<ItemEditavel[]>(() =>
    (atendimento.prescricao?.itens ?? []).map((item) => ({
      chave: nova_chave(),
      medicamento: item.medicamento,
      dose: item.dose,
      frequencia: item.frequencia,
      duracao: item.duracao_dias ? String(item.duracao_dias) : "",
    })),
  );
  const [orientacoes, definir_orientacoes] = useState(atendimento.prescricao?.orientacoes ?? "");
  const [vacinas, definir_vacinas] = useState<VacinaEditavel[]>(() =>
    atendimento.vacinas.map((vacina) => ({
      chave: nova_chave(),
      vacina: vacina.vacina,
      lote: vacina.lote ?? "",
      dose: vacina.dose ?? "",
      proxima: vacina.proxima_dose_em ?? "",
    })),
  );
  const [campos, definir_campos] = useState<CamposComErro>({});
  const [mensagem, definir_mensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  const procedimentos_extras = procedimentos.filter((nome) => !PROCEDIMENTOS.includes(nome));
  const exames_extras = exames.filter(({ nome }) => !EXAMES.includes(nome));

  function alternar_procedimento(nome: string) {
    definir_procedimentos((atual) => (atual.includes(nome) ? atual.filter((item) => item !== nome) : [...atual, nome]));
  }

  function adicionar_procedimento() {
    const nome = novo_procedimento.trim();
    if (nome && !procedimentos.includes(nome)) {
      definir_procedimentos([...procedimentos, nome]);
    }
    definir_novo_procedimento("");
  }

  function alternar_exame(nome: string) {
    definir_exames((atual) =>
      atual.some((exame) => exame.nome === nome)
        ? atual.filter((exame) => exame.nome !== nome)
        : [...atual, { nome, resultado: "" }],
    );
  }

  function adicionar_exame() {
    const nome = novo_exame.trim();
    if (nome && !exames.some((exame) => exame.nome === nome)) {
      definir_exames([...exames, { nome, resultado: "" }]);
    }
    definir_novo_exame("");
  }

  function montar_registro(): RegistroAtendimento | null {
    const numeros = {
      peso_kg: ler_numero(peso),
      temperatura_c: ler_numero(temperatura),
      frequencia_cardiaca: ler_numero(frequencia_cardiaca),
      frequencia_respiratoria: ler_numero(frequencia_respiratoria),
    };
    const invalidos = Object.fromEntries(
      Object.entries(numeros)
        .filter(([, valor]) => valor === undefined)
        .map(([campo]) => [campo, "Informe um número."]),
    );
    const itens_preenchidos = itens.filter((item) => item.medicamento.trim() || item.dose.trim() || item.frequencia.trim());
    if (itens_preenchidos.some((item) => !item.medicamento.trim() || !item.dose.trim() || !item.frequencia.trim())) {
      invalidos.prescricao = "Preencha medicamento, dose e frequência de cada item da prescrição.";
    }
    if (Object.keys(invalidos).length > 0) {
      definir_campos(invalidos);
      definir_mensagem({ tipo: "erro", texto: "Verifique os campos destacados." });
      return null;
    }
    return {
      peso_kg: numeros.peso_kg ?? null,
      temperatura_c: numeros.temperatura_c ?? null,
      frequencia_cardiaca: numeros.frequencia_cardiaca ?? null,
      frequencia_respiratoria: numeros.frequencia_respiratoria ?? null,
      condicao_geral: texto_ou_nulo(condicao),
      queixa_principal: texto_ou_nulo(queixa),
      diagnostico: texto_ou_nulo(diagnostico),
      procedimentos,
      observacoes: texto_ou_nulo(observacoes),
      retorno_em: texto_ou_nulo(retorno),
      exames: exames.map(({ nome, resultado }) => ({ nome, resultado: texto_ou_nulo(resultado) })),
      vacinas: vacinas
        .filter((vacina) => vacina.vacina.trim())
        .map((vacina) => ({
          vacina: vacina.vacina.trim(),
          lote: texto_ou_nulo(vacina.lote),
          dose: texto_ou_nulo(vacina.dose),
          proxima_dose_em: texto_ou_nulo(vacina.proxima),
        })),
      prescricao:
        itens_preenchidos.length || orientacoes.trim()
          ? {
              orientacoes: texto_ou_nulo(orientacoes),
              itens: itens_preenchidos.map((item) => ({
                medicamento: item.medicamento.trim(),
                dose: item.dose.trim(),
                frequencia: item.frequencia.trim(),
                duracao_dias: item.duracao ? Number(item.duracao) : null,
                via: null,
                observacoes: null,
              })),
            }
          : null,
    };
  }

  function salvar(finalizar: boolean) {
    const registro = montar_registro();
    if (!registro) {
      return;
    }
    if (finalizar && !window.confirm("Finalizar o atendimento? Ele não poderá mais ser alterado, e a receita e os lembretes serão enviados ao tutor.")) {
      return;
    }
    iniciar(async () => {
      const resultado = await salvar_atendimento(atendimento.id, registro, finalizar);
      if (resultado.ok) {
        definir_campos({});
        const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        definir_mensagem({ tipo: "sucesso", texto: finalizar ? "Atendimento finalizado." : `Rascunho salvo às ${hora}.` });
      } else {
        definir_campos(resultado.campos);
        const detalhes = [...new Set(Object.values(resultado.campos))].join(" ");
        definir_mensagem({ tipo: "erro", texto: detalhes ? `${resultado.erro} ${detalhes}` : resultado.erro });
      }
    });
  }

  const campo_numero = (rotulo: string, nome: string, valor: string, alterar: (valor: string) => void, exemplo: string) => (
    <label className="text-sm font-medium text-texto-titulo">
      {rotulo}
      <input
        value={valor}
        onChange={(evento) => alterar(evento.target.value)}
        inputMode="decimal"
        placeholder={exemplo}
        aria-invalid={campos[nome] ? true : undefined}
        className={`mt-1.5 h-11 ${ESTILO_CAMPO}`}
      />
      {campos[nome] && <span className="mt-1 block text-sm font-normal text-rose-600">{campos[nome]}</span>}
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <SecaoCartao titulo="Estado do animal" descricao="Sinais vitais e condição atual." icone={HeartPulse} cor="bg-azul-ativo">
          <div className="grid grid-cols-2 gap-4">
            {campo_numero("Peso (kg)", "peso_kg", peso, definir_peso, "Ex.: 32,5")}
            {campo_numero("Temperatura (°C)", "temperatura_c", temperatura, definir_temperatura, "Ex.: 38,7")}
            {campo_numero("Freq. cardíaca (bpm)", "frequencia_cardiaca", frequencia_cardiaca, definir_fc, "Ex.: 90")}
            {campo_numero("Freq. respiratória (rpm)", "frequencia_respiratoria", frequencia_respiratoria, definir_fr, "Ex.: 18")}
            <label className="col-span-2 text-sm font-medium text-texto-titulo">
              Condição geral
              <select value={condicao} onChange={(evento) => definir_condicao(evento.target.value)} className={`mt-1.5 h-11 ${ESTILO_CAMPO}`}>
                <option value="">Selecione</option>
                {CONDICOES_GERAIS.map((opcao) => (
                  <option key={opcao}>{opcao}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-sm font-medium text-texto-titulo">
              Queixa principal
              <textarea
                value={queixa}
                onChange={(evento) => definir_queixa(evento.target.value)}
                maxLength={1000}
                placeholder="Motivo da consulta relatado pelo tutor"
                className={`mt-1.5 min-h-20 py-2 ${ESTILO_CAMPO}`}
              />
            </label>
          </div>
        </SecaoCartao>

        <SecaoCartao titulo="Procedimentos realizados" descricao="O que foi feito no atendimento." icone={Stethoscope} cor="bg-modulo-atendimentos">
          <div className="flex flex-col gap-2.5">
            {[...PROCEDIMENTOS, ...procedimentos_extras].map((nome) => (
              <label key={nome} className="flex items-center gap-3 text-texto-titulo">
                <input
                  type="checkbox"
                  checked={procedimentos.includes(nome)}
                  onChange={() => alternar_procedimento(nome)}
                  className="size-5 accent-azul-ativo"
                />
                {nome}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={novo_procedimento}
              onChange={(evento) => definir_novo_procedimento(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  adicionar_procedimento();
                }
              }}
              placeholder="Outro procedimento"
              maxLength={100}
              aria-label="Outro procedimento"
              className={`h-10 ${ESTILO_CAMPO}`}
            />
            <button type="button" onClick={adicionar_procedimento} aria-label="Adicionar procedimento" className="rounded-lg border border-azul-marca px-3 text-azul-marca hover:bg-destaque-suave">
              <Plus className="size-4" />
            </button>
          </div>
          <label className="mt-4 block text-sm font-medium text-texto-titulo">
            Observações sobre o estado e os procedimentos
            <textarea
              value={observacoes}
              onChange={(evento) => definir_observacoes(evento.target.value)}
              maxLength={2000}
              placeholder="Ex.: animal ativo, sem sinais de dor"
              className={`mt-1.5 min-h-20 py-2 ${ESTILO_CAMPO}`}
            />
          </label>
        </SecaoCartao>

        <SecaoCartao titulo="Exames solicitados" descricao="Marque os exames e, se já houver, o resultado." icone={FlaskConical} cor="bg-modulo-historico">
          <div className="flex flex-col gap-2.5">
            {[...EXAMES, ...exames_extras.map(({ nome }) => nome)].map((nome) => {
              const exame = exames.find((item) => item.nome === nome);
              return (
                <div key={nome}>
                  <label className="flex items-center gap-3 text-texto-titulo">
                    <input type="checkbox" checked={Boolean(exame)} onChange={() => alternar_exame(nome)} className="size-5 accent-azul-ativo" />
                    {nome}
                  </label>
                  {exame && (
                    <input
                      value={exame.resultado}
                      onChange={(evento) =>
                        definir_exames((atual) => atual.map((item) => (item.nome === nome ? { ...item, resultado: evento.target.value } : item)))
                      }
                      placeholder="Resultado (opcional)"
                      maxLength={2000}
                      aria-label={`Resultado de ${nome}`}
                      className={`mt-1.5 ml-8 h-9 w-[calc(100%-2rem)] ${ESTILO_CAMPO}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={novo_exame}
              onChange={(evento) => definir_novo_exame(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  adicionar_exame();
                }
              }}
              placeholder="Outro exame"
              maxLength={100}
              aria-label="Outro exame"
              className={`h-10 ${ESTILO_CAMPO}`}
            />
            <button type="button" onClick={adicionar_exame} aria-label="Adicionar exame" className="rounded-lg border border-azul-marca px-3 text-azul-marca hover:bg-destaque-suave">
              <Plus className="size-4" />
            </button>
          </div>
        </SecaoCartao>
      </div>

      <SecaoCartao
        titulo="Prescrição de medicamentos"
        descricao="Medicamentos e orientações para o tutor."
        icone={Pill}
        cor="bg-modulo-financeiro"
        acao={
          <button
            type="button"
            onClick={() => definir_itens([...itens, { chave: nova_chave(), medicamento: "", dose: "", frequencia: "", duracao: "" }])}
            className="flex h-10 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
          >
            <Plus className="size-4" /> Adicionar medicamento
          </button>
        }
      >
        {itens.length === 0 ? (
          <p className="text-texto-suave">Nenhum medicamento prescrito.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[2fr_1.2fr_1.5fr_0.8fr_auto] gap-2 px-1 text-sm font-semibold text-texto-titulo md:grid">
              <span>Medicamento</span>
              <span>Dose</span>
              <span>Frequência</span>
              <span>Duração (dias)</span>
              <span className="w-9" />
            </div>
            {itens.map((item, indice) => (
              <div key={item.chave} className="grid gap-2 rounded-lg border border-borda p-2 md:grid-cols-[2fr_1.2fr_1.5fr_0.8fr_auto] md:border-0 md:p-0">
                {(
                  [
                    ["medicamento", "Ex.: Amoxicilina 250 mg"],
                    ["dose", "Ex.: 1 comprimido"],
                    ["frequencia", "Ex.: a cada 12 horas"],
                    ["duracao", "Ex.: 7"],
                  ] as const
                ).map(([campo, exemplo]) => (
                  <input
                    key={campo}
                    value={item[campo]}
                    onChange={(evento) =>
                      definir_itens((atual) => atual.map((linha) => (linha.chave === item.chave ? { ...linha, [campo]: evento.target.value } : linha)))
                    }
                    inputMode={campo === "duracao" ? "numeric" : undefined}
                    placeholder={exemplo}
                    aria-label={`${campo} do item ${indice + 1}`}
                    className={`h-10 ${ESTILO_CAMPO}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => definir_itens((atual) => atual.filter((linha) => linha.chave !== item.chave))}
                  aria-label={`Remover item ${indice + 1}`}
                  className="flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {campos.prescricao && <p className="mt-2 text-sm text-rose-600">{campos.prescricao}</p>}
        <label className="mt-4 block text-sm font-medium text-texto-titulo">
          Orientações gerais
          <textarea
            value={orientacoes}
            onChange={(evento) => definir_orientacoes(evento.target.value)}
            maxLength={2000}
            placeholder="Ex.: manter o animal em repouso relativo"
            className={`mt-1.5 min-h-20 py-2 ${ESTILO_CAMPO}`}
          />
        </label>
      </SecaoCartao>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecaoCartao
          titulo="Vacinas aplicadas"
          descricao="Registre as vacinas aplicadas hoje."
          icone={Syringe}
          cor="bg-modulo-agendamentos"
          acao={
            <button
              type="button"
              onClick={() => definir_vacinas([...vacinas, { chave: nova_chave(), vacina: "", lote: "", dose: "", proxima: "" }])}
              className="flex h-10 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
            >
              <Plus className="size-4" /> Adicionar vacina
            </button>
          }
        >
          {vacinas.length === 0 ? (
            <p className="text-texto-suave">Nenhuma vacina aplicada neste atendimento.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {vacinas.map((vacina, indice) => (
                <div key={vacina.chave} className="grid grid-cols-2 gap-2 rounded-lg border border-borda p-3 sm:grid-cols-[1.5fr_1fr_1fr_1.2fr_auto]">
                  {(
                    [
                      ["vacina", "Vacina (ex.: V10)", "text"],
                      ["lote", "Lote", "text"],
                      ["dose", "Dose", "text"],
                      ["proxima", "Próxima dose", "date"],
                    ] as const
                  ).map(([campo, rotulo, tipo]) => (
                    <input
                      key={campo}
                      type={tipo}
                      value={vacina[campo]}
                      onChange={(evento) =>
                        definir_vacinas((atual) => atual.map((linha) => (linha.chave === vacina.chave ? { ...linha, [campo]: evento.target.value } : linha)))
                      }
                      placeholder={rotulo}
                      aria-label={`${rotulo} da vacina ${indice + 1}`}
                      title={rotulo}
                      className={`h-10 ${ESTILO_CAMPO}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => definir_vacinas((atual) => atual.filter((linha) => linha.chave !== vacina.chave))}
                    aria-label={`Remover vacina ${indice + 1}`}
                    className="flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {campos.vacinas && <p className="mt-2 text-sm text-rose-600">{campos.vacinas}</p>}
        </SecaoCartao>

        <SecaoCartao titulo="Diagnóstico e retorno" descricao="Conclusão do atendimento." icone={ClipboardCheck} cor="bg-modulo-animais">
          <label className="block text-sm font-medium text-texto-titulo">
            Diagnóstico
            <textarea
              value={diagnostico}
              onChange={(evento) => definir_diagnostico(evento.target.value)}
              maxLength={2000}
              placeholder="Ex.: dermatite alérgica leve"
              className={`mt-1.5 min-h-24 py-2 ${ESTILO_CAMPO}`}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-texto-titulo">
            Retorno em
            <input type="date" value={retorno} onChange={(evento) => definir_retorno(evento.target.value)} className={`mt-1.5 h-11 ${ESTILO_CAMPO}`} />
          </label>
        </SecaoCartao>
      </div>

      {anexos}

      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/atendimentos"
          className="flex h-11 items-center gap-2 rounded-lg border border-azul-marca px-5 font-medium text-azul-marca hover:bg-destaque-suave"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => salvar(false)}
            disabled={salvando}
            className="flex h-11 items-center gap-2 rounded-lg border border-azul-marca px-5 font-medium text-azul-marca hover:bg-destaque-suave disabled:opacity-60"
          >
            {salvando ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
            Salvar rascunho
          </button>
          <button
            type="button"
            onClick={() => salvar(true)}
            disabled={salvando}
            className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-6 font-medium text-white shadow-sm hover:bg-azul-marca disabled:opacity-60"
          >
            {salvando ? <LoaderCircle className="size-5 animate-spin" /> : <CircleCheckBig className="size-5" />}
            Finalizar atendimento
          </button>
        </div>
      </div>
    </div>
  );
}
