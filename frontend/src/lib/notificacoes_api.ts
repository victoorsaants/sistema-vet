import { montar_consulta, requisitar_autenticado } from "@/lib/api_autenticada";
import type { Referencia } from "@/lib/atendimentos_api";
import type { Pagina } from "@/lib/cadastros_api";
import type { StatusNotificacao, TipoNotificacao } from "@/lib/opcoes_notificacao";

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  canal: "email" | "whatsapp" | "sms";
  assunto: string;
  mensagem: string;
  agendada_para: string;
  status: StatusNotificacao;
  enviada_em: string | null;
  erro: string | null;
  destinatario: string | null;
  tentativas: number;
  atendimento_id: string | null;
  agendamento_id: string | null;
  tutor: Referencia & { email: string | null };
  animal: Referencia | null;
};

export type ResumoNotificacoes = {
  atrasadas: number;
  programadas: number;
  com_falha: number;
  modo_envio: "smtp" | "arquivo";
};

export function listar_notificacoes(filtro: {
  status?: StatusNotificacao;
  tipo?: TipoNotificacao;
  atendimento_id?: string;
  busca?: string;
  pagina?: number;
  tamanho?: number;
}): Promise<Pagina<Notificacao>> {
  return requisitar_autenticado(`/notificacoes${montar_consulta(filtro)}`);
}

export function obter_resumo_notificacoes(): Promise<ResumoNotificacoes> {
  return requisitar_autenticado("/notificacoes/resumo");
}

export function reenviar_notificacao(id: string): Promise<Notificacao> {
  return requisitar_autenticado(`/notificacoes/${encodeURIComponent(id)}/reenviar`, { method: "POST" });
}

export function cancelar_notificacao(id: string): Promise<Notificacao> {
  return requisitar_autenticado(`/notificacoes/${encodeURIComponent(id)}/cancelar`, { method: "POST" });
}

export function enviar_notificacoes_pendentes(): Promise<{ enviadas: number; com_falha: number }> {
  return requisitar_autenticado("/notificacoes/enviar", { method: "POST" });
}
