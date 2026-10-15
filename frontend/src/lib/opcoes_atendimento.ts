import type { TipoEvento } from "@/lib/atendimentos_api";

export const PROCEDIMENTOS = [
  "Consulta de rotina",
  "Exame físico",
  "Vacinação",
  "Coleta de material (exames)",
  "Medicação aplicada",
  "Curativo",
];

export const EXAMES = [
  "Hemograma completo",
  "Bioquímica sanguínea",
  "Urina tipo I",
  "Fezes",
  "Raio-X",
  "Ultrassom",
];

export const CONDICOES_GERAIS = ["Estável", "Em observação", "Instável", "Grave"];

export const NOMES_EVENTO: Record<TipoEvento, string> = {
  atendimento: "Atendimentos",
  exame: "Exames",
  vacina: "Vacinas",
  prescricao: "Medicamentos",
};
