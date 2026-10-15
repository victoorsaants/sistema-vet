import { montar_consulta, requisitar_autenticado } from "@/lib/api_autenticada";

export type TipoAtendimento = "consulta" | "retorno" | "vacinacao" | "exame" | "procedimento";
export type StatusAgendamento =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "faltou";

export type Veterinario = {
  id: string;
  nome: string;
  crmv: string;
  especialidade: string | null;
};

export type FaixaExpediente = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
};

export type Folga = {
  id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string | null;
};

export type HorarioAgenda = {
  inicio: string;
  fim: string;
  disponivel: boolean;
};

export type DiaAgenda = {
  data: string;
  atende: boolean;
  horarios: HorarioAgenda[];
};

export type Agendamento = {
  id: string;
  inicio: string;
  fim: string;
  tipo: TipoAtendimento;
  especialidade: string | null;
  status: StatusAgendamento;
  observacoes: string | null;
  animal: { id: string; nome: string; especie: string; raca: string | null };
  tutor: { id: string; nome: string; telefone_principal: string | null };
  veterinario: { id: string; nome: string };
};

export type NovoAgendamento = {
  animal_id: string;
  veterinario_id: string;
  tipo: TipoAtendimento;
  especialidade: string | null;
  inicio: string;
  observacoes: string | null;
};

export function listar_veterinarios(): Promise<Veterinario[]> {
  return requisitar_autenticado("/veterinarios");
}

export function obter_expediente(veterinario_id: string): Promise<{ faixas: FaixaExpediente[] }> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(veterinario_id)}/expediente`);
}

export function salvar_expediente(
  veterinario_id: string,
  faixas: FaixaExpediente[],
): Promise<{ faixas: FaixaExpediente[] }> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(veterinario_id)}/expediente`, {
    method: "PUT",
    body: JSON.stringify({ faixas }),
  });
}

export function listar_folgas(veterinario_id: string): Promise<Folga[]> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(veterinario_id)}/folgas`);
}

export function criar_folga(veterinario_id: string, folga: Omit<Folga, "id">): Promise<Folga> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(veterinario_id)}/folgas`, {
    method: "POST",
    body: JSON.stringify(folga),
  });
}

export function remover_folga(veterinario_id: string, folga_id: string): Promise<void> {
  return requisitar_autenticado(
    `/veterinarios/${encodeURIComponent(veterinario_id)}/folgas/${encodeURIComponent(folga_id)}`,
    { method: "DELETE" },
  );
}

export function consultar_agenda(veterinario_id: string, inicio: string, dias = 7): Promise<DiaAgenda[]> {
  return requisitar_autenticado(
    `/veterinarios/${encodeURIComponent(veterinario_id)}/agenda${montar_consulta({ inicio, dias })}`,
  );
}

export function listar_agendamentos(
  filtro: { status?: StatusAgendamento[]; de?: string; ate?: string } = {},
): Promise<Agendamento[]> {
  const consulta = new URLSearchParams();
  for (const status of filtro.status ?? []) {
    consulta.append("status", status);
  }
  if (filtro.de) {
    consulta.set("de", filtro.de);
  }
  if (filtro.ate) {
    consulta.set("ate", filtro.ate);
  }
  const texto = consulta.toString();
  return requisitar_autenticado(`/agendamentos${texto ? `?${texto}` : ""}`);
}

export function criar_agendamento(dados: NovoAgendamento): Promise<Agendamento> {
  return requisitar_autenticado("/agendamentos", { method: "POST", body: JSON.stringify(dados) });
}

export function alterar_status_agendamento(id: string, status: StatusAgendamento): Promise<Agendamento> {
  return requisitar_autenticado(`/agendamentos/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
