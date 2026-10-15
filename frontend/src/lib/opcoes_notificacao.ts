export type TipoNotificacao =
  | "prescricao"
  | "lembrete_medicamento"
  | "lembrete_retorno"
  | "lembrete_vacina"
  | "confirmacao_agendamento";

export type StatusNotificacao = "pendente" | "enviada" | "falhou" | "cancelada";

export const NOMES_TIPO_NOTIFICACAO: Record<TipoNotificacao, string> = {
  prescricao: "Receita",
  lembrete_medicamento: "Lembrete de remédio",
  lembrete_retorno: "Lembrete de retorno",
  lembrete_vacina: "Lembrete de vacina",
  confirmacao_agendamento: "Lembrete de consulta",
};

export const NOMES_STATUS_NOTIFICACAO: Record<StatusNotificacao, string> = {
  pendente: "Programada",
  enviada: "Enviada",
  falhou: "Com falha",
  cancelada: "Cancelada",
};

export const ESTILOS_STATUS_NOTIFICACAO: Record<StatusNotificacao, string> = {
  pendente: "bg-sky-50 text-sky-800",
  enviada: "bg-emerald-50 text-emerald-800",
  falhou: "bg-rose-50 text-rose-700",
  cancelada: "bg-slate-100 text-slate-600",
};
