import { montar_consulta, requisitar_autenticado } from "@/lib/api_autenticada";
import type { TipoAtendimento } from "@/lib/agenda_api";
import type { Porte, Sexo } from "@/lib/cadastros_api";

export type StatusAtendimento = "em_andamento" | "finalizado";
export type TipoEvento = "atendimento" | "exame" | "vacina" | "prescricao";

export type Referencia = { id: string; nome: string };

export type ExameAtendimento = { nome: string; resultado: string | null };
export type VacinaAtendimento = {
  vacina: string;
  lote: string | null;
  dose: string | null;
  proxima_dose_em: string | null;
};
export type ItemPrescricao = {
  medicamento: string;
  dose: string;
  frequencia: string;
  duracao_dias: number | null;
  via: string | null;
  observacoes: string | null;
};
export type Prescricao = { orientacoes: string | null; itens: ItemPrescricao[] };

export type Anexo = {
  id: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  exame_id: string | null;
  criado_em: string;
};

export type RegistroAtendimento = {
  peso_kg: number | null;
  temperatura_c: number | null;
  frequencia_cardiaca: number | null;
  frequencia_respiratoria: number | null;
  condicao_geral: string | null;
  queixa_principal: string | null;
  diagnostico: string | null;
  procedimentos: string[];
  observacoes: string | null;
  retorno_em: string | null;
  exames: ExameAtendimento[];
  vacinas: VacinaAtendimento[];
  prescricao: Prescricao | null;
};

export type Atendimento = Omit<RegistroAtendimento, "exames" | "vacinas"> & {
  id: string;
  agendamento_id: string | null;
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  realizado_em: string;
  exames: (ExameAtendimento & { id: string; status: "solicitado" | "realizado" | "cancelado" })[];
  vacinas: (VacinaAtendimento & { id: string; aplicada_em: string })[];
  anexos: Anexo[];
  animal: {
    id: string;
    nome: string;
    especie: string;
    raca: string | null;
    sexo: Sexo | null;
    data_nascimento: string | null;
    peso_kg: number | null;
    altura_cm: number | null;
    porte: Porte | null;
    microchip: string | null;
    observacoes: string | null;
  };
  tutor: {
    id: string;
    nome: string;
    telefone_principal: string;
    email: string | null;
    endereco: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  };
  veterinario: Referencia & { perfil_id: string | null };
};

export type AtendimentoResumo = {
  id: string;
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  realizado_em: string;
  diagnostico: string | null;
  animal: Referencia;
  tutor: Referencia;
  veterinario: Referencia;
};

export type EventoHistorico = {
  tipo: TipoEvento;
  data: string;
  titulo: string;
  descricao: string | null;
  veterinario: string | null;
  atendimento_id: string | null;
};

export type ReferenciaAtendimento = {
  id: string;
  data: string;
  tipo: TipoAtendimento;
  veterinario: string;
};

export type HistoricoClinico = {
  animal: Atendimento["animal"];
  tutor: Referencia;
  resumo: { consultas: number; exames: number; vacinas: number; tratamentos: number };
  ultimo_atendimento: ReferenciaAtendimento | null;
  proximo_agendamento: ReferenciaAtendimento | null;
  eventos: EventoHistorico[];
  total_eventos: number;
  pagina: number;
  tamanho: number;
};

export function listar_atendimentos(filtro: {
  meus?: boolean;
  status?: StatusAtendimento;
  animal_id?: string;
}): Promise<AtendimentoResumo[]> {
  return requisitar_autenticado(
    `/atendimentos${montar_consulta({ ...filtro, meus: filtro.meus ? "true" : undefined })}`,
  );
}

export function obter_atendimento(id: string): Promise<Atendimento> {
  return requisitar_autenticado(`/atendimentos/${encodeURIComponent(id)}`);
}

export function iniciar_atendimento(
  origem: { agendamento_id: string } | { animal_id: string; tipo: TipoAtendimento },
): Promise<Atendimento> {
  return requisitar_autenticado("/atendimentos", { method: "POST", body: JSON.stringify(origem) });
}

export function registrar_atendimento(id: string, registro: RegistroAtendimento): Promise<Atendimento> {
  return requisitar_autenticado(`/atendimentos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(registro),
  });
}

export function finalizar_atendimento(id: string): Promise<Atendimento> {
  return requisitar_autenticado(`/atendimentos/${encodeURIComponent(id)}/finalizar`, { method: "POST" });
}

export function enviar_anexo(id: string, arquivo: File): Promise<Anexo> {
  const dados = new FormData();
  dados.append("arquivo", arquivo, arquivo.name);
  return requisitar_autenticado(`/atendimentos/${encodeURIComponent(id)}/anexos`, { method: "POST", body: dados });
}

export function remover_anexo(id: string, anexo_id: string): Promise<void> {
  return requisitar_autenticado(
    `/atendimentos/${encodeURIComponent(id)}/anexos/${encodeURIComponent(anexo_id)}`,
    { method: "DELETE" },
  );
}

export function obter_historico(
  animal_id: string,
  filtro: { tipo?: TipoEvento; pagina?: number; tamanho?: number },
): Promise<HistoricoClinico> {
  return requisitar_autenticado(`/animais/${encodeURIComponent(animal_id)}/historico${montar_consulta(filtro)}`);
}
