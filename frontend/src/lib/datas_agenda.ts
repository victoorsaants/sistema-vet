import type { StatusAgendamento, TipoAtendimento } from "@/lib/agenda_api";

export const FUSO_CLINICA = "America/Maceio";

const FORMATO_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_CLINICA,
  hour: "2-digit",
  minute: "2-digit",
});

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_CLINICA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const FORMATO_DIA_EXTENSO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const FORMATO_DIA_CURTO = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" });
const FORMATO_MES_CURTO = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" });

const FORMATO_DATA_ISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_CLINICA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const NOMES_TIPO: Record<TipoAtendimento, string> = {
  consulta: "Consulta",
  retorno: "Retorno",
  vacinacao: "Vacinação",
  exame: "Exame",
  procedimento: "Procedimento",
};

export const NOMES_STATUS: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

export const DIAS_DA_SEMANA = [
  { valor: 1, nome: "Segunda" },
  { valor: 2, nome: "Terça" },
  { valor: 3, nome: "Quarta" },
  { valor: 4, nome: "Quinta" },
  { valor: 5, nome: "Sexta" },
  { valor: 6, nome: "Sábado" },
  { valor: 0, nome: "Domingo" },
];

function data_utc(data_iso: string): Date {
  return new Date(`${data_iso}T12:00:00Z`);
}

function sem_ponto(texto: string): string {
  return texto.replace(".", "");
}

export function hoje_na_clinica(agora = new Date()): string {
  return FORMATO_DATA_ISO.format(agora);
}

export function somar_dias(data_iso: string, dias: number): string {
  const data = data_utc(data_iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function formatar_hora(instante: string): string {
  return FORMATO_HORA.format(new Date(instante));
}

export function formatar_data_curta(instante: string): string {
  return FORMATO_DATA.format(new Date(instante));
}

export function formatar_dia_extenso(data_iso: string): string {
  return FORMATO_DIA_EXTENSO.format(data_utc(data_iso));
}

export function partes_do_dia(data_iso: string): { semana: string; dia: string; mes: string } {
  const data = data_utc(data_iso);
  const semana = sem_ponto(FORMATO_DIA_CURTO.format(data));
  return {
    semana: semana.charAt(0).toUpperCase() + semana.slice(1),
    dia: String(data.getUTCDate()),
    mes: sem_ponto(FORMATO_MES_CURTO.format(data)),
  };
}

export function formatar_data_iso(data_iso: string): string {
  const [ano, mes, dia] = data_iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const DESLOCAMENTO_CLINICA = "-03:00";

export function limites_do_dia(data_iso: string): { de: string; ate: string } {
  return {
    de: `${data_iso}T00:00:00${DESLOCAMENTO_CLINICA}`,
    ate: `${somar_dias(data_iso, 1)}T00:00:00${DESLOCAMENTO_CLINICA}`,
  };
}
