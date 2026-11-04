import { requisitar_autenticado } from "@/lib/api_autenticada";
import type { UsuarioLogado } from "@/lib/tipos_auth";

export type MeuPerfil = UsuarioLogado & {
  veterinario: {
    crmv: string;
    especialidade: string | null;
    telefone: string | null;
  } | null;
};

export function obter_meu_perfil(): Promise<MeuPerfil> {
  return requisitar_autenticado("/auth/perfil");
}

export function atualizar_meu_perfil(nome: string): Promise<MeuPerfil> {
  return requisitar_autenticado("/auth/perfil", {
    method: "PUT",
    body: JSON.stringify({ nome }),
  });
}

export function alterar_minha_senha(senha_atual: string, nova_senha: string): Promise<void> {
  return requisitar_autenticado("/auth/senha", {
    method: "PUT",
    body: JSON.stringify({ senha_atual, nova_senha }),
  });
}
