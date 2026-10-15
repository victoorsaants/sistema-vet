"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { encerrar_na_api, entrar_na_api, ErroApi } from "@/lib/auth_api";
import {
  apagar_cookies_sessao,
  COOKIE_ACCESS,
  gravar_cookies_sessao,
} from "@/lib/cookies_sessao";
import { eh_perfil, NOMES_PERFIL } from "@/lib/tipos_auth";

export type EstadoLogin = {
  erro: string | null;
  email: string;
};

export async function entrar(_estado: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  const perfil_escolhido = dados.get("perfil");

  if (!email || !senha) {
    return { erro: "Informe o usuário e a senha.", email };
  }

  let sessao;
  try {
    sessao = await entrar_na_api(email, senha);
  } catch (erro) {
    const mensagem =
      erro instanceof ErroApi ? erro.message : "Não foi possível entrar. Tente novamente.";
    return { erro: mensagem, email };
  }

  if (eh_perfil(perfil_escolhido) && sessao.usuario.perfil !== perfil_escolhido) {
    await encerrar_na_api(sessao.access_token).catch(() => undefined);
    return {
      erro: `Este usuário não tem acesso como ${NOMES_PERFIL[perfil_escolhido]}.`,
      email,
    };
  }

  gravar_cookies_sessao(await cookies(), sessao);
  redirect("/");
}

export async function sair(): Promise<void> {
  const armazem = await cookies();
  const access_token = armazem.get(COOKIE_ACCESS)?.value;
  if (access_token) {
    await encerrar_na_api(access_token).catch(() => undefined);
  }
  apagar_cookies_sessao(armazem);
  redirect("/login");
}
