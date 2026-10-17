export type Perfil = "recepcao" | "veterinario";

export type UsuarioLogado = {
  id: string;
  email: string | null;
  nome: string;
  perfil: Perfil;
};

export type SessaoAutenticada = {
  access_token: string;
  refresh_token: string;
  expira_em: number;
  usuario: UsuarioLogado;
};

export const NOMES_PERFIL: Record<Perfil, string> = {
  recepcao: "Recepção",
  veterinario: "Veterinário",
};

export function eh_perfil(valor: unknown): valor is Perfil {
  return valor === "recepcao" || valor === "veterinario";
}
