import { requisitar_autenticado } from "@/lib/api_autenticada";

export type DadosVeterinario = {
  nome: string;
  crmv: string;
  especialidade: string | null;
  telefone: string | null;
  email: string | null;
};

export type DadosAcesso = {
  email_login: string;
  senha_login: string | null;
};

export type CadastroVeterinario = DadosVeterinario & {
  id: string;
  ativo: boolean;
  acesso: { email: string; ativo: boolean } | null;
  agendamentos_futuros: number;
  atualizado_em: string;
};

export function listar_cadastros_veterinarios(): Promise<CadastroVeterinario[]> {
  return requisitar_autenticado("/veterinarios/cadastros");
}

export function obter_cadastro_veterinario(id: string): Promise<CadastroVeterinario> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(id)}`);
}

export function cadastrar_veterinario(
  dados: DadosVeterinario & { email_login: string | null; senha_login: string | null },
): Promise<CadastroVeterinario> {
  return requisitar_autenticado("/veterinarios", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizar_veterinario(
  id: string,
  dados: DadosVeterinario & { ativo: boolean },
): Promise<CadastroVeterinario> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function definir_acesso_veterinario(id: string, dados: DadosAcesso): Promise<CadastroVeterinario> {
  return requisitar_autenticado(`/veterinarios/${encodeURIComponent(id)}/acesso`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}
