import { requisitar } from "@/lib/cliente_api";
import type { SessaoAutenticada, UsuarioLogado } from "@/lib/tipos_auth";

export { ErroApi } from "@/lib/cliente_api";

export function entrar_na_api(email: string, senha: string): Promise<SessaoAutenticada> {
  return requisitar("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
}

export function renovar_na_api(refresh_token: string): Promise<SessaoAutenticada> {
  return requisitar("/auth/renovar", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export function buscar_usuario_na_api(access_token: string): Promise<UsuarioLogado> {
  return requisitar("/auth/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
}

export function encerrar_na_api(access_token: string): Promise<void> {
  return requisitar("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
  });
}
