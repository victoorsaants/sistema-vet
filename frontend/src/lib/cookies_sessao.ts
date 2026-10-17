import type { SessaoAutenticada } from "@/lib/tipos_auth";

export const COOKIE_ACCESS = "ajuvet_access";
export const COOKIE_REFRESH = "ajuvet_refresh";
export const COOKIE_PERFIL = "ajuvet_perfil";

const DURACAO_REFRESH_SEGUNDOS = 60 * 60 * 24 * 30;
const MARGEM_EXPIRACAO_SEGUNDOS = 60;

type OpcoesCookie = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

type ArmazemCookies = {
  set(nome: string, valor: string, opcoes?: OpcoesCookie): unknown;
  delete(nome: string): unknown;
};

function cookie_seguro(): boolean {
  const configurado = process.env.COOKIE_SEGURO;
  return configurado ? configurado === "true" : process.env.NODE_ENV === "production";
}

function criar_opcoes(max_age: number): OpcoesCookie {
  return {
    httpOnly: true,
    secure: cookie_seguro(),
    sameSite: "lax",
    path: "/",
    maxAge: max_age,
  };
}

export function gravar_cookies_sessao(armazem: ArmazemCookies, sessao: SessaoAutenticada): void {
  const agora = Math.floor(Date.now() / 1000);
  const validade_access = Math.max(sessao.expira_em - agora - MARGEM_EXPIRACAO_SEGUNDOS, 0);

  armazem.set(COOKIE_ACCESS, sessao.access_token, criar_opcoes(validade_access));
  armazem.set(COOKIE_REFRESH, sessao.refresh_token, criar_opcoes(DURACAO_REFRESH_SEGUNDOS));
  armazem.set(COOKIE_PERFIL, sessao.usuario.perfil, criar_opcoes(DURACAO_REFRESH_SEGUNDOS));
}

export function apagar_cookies_sessao(armazem: ArmazemCookies): void {
  armazem.delete(COOKIE_ACCESS);
  armazem.delete(COOKIE_REFRESH);
  armazem.delete(COOKIE_PERFIL);
}
