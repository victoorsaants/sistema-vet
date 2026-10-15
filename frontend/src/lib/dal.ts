import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { buscar_usuario_na_api, ErroApi } from "@/lib/auth_api";
import { COOKIE_ACCESS } from "@/lib/cookies_sessao";
import type { UsuarioLogado } from "@/lib/tipos_auth";

export const obter_usuario_logado = cache(async (): Promise<UsuarioLogado> => {
  const access_token = (await cookies()).get(COOKIE_ACCESS)?.value;
  if (!access_token) {
    redirect("/sair");
  }

  try {
    return await buscar_usuario_na_api(access_token);
  } catch (erro) {
    if (erro instanceof ErroApi && (erro.status === 401 || erro.status === 403)) {
      redirect("/sair");
    }
    throw erro;
  }
});
