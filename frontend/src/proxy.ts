import { NextResponse, type NextRequest } from "next/server";

import { renovar_na_api } from "@/lib/auth_api";
import {
  apagar_cookies_sessao,
  COOKIE_ACCESS,
  COOKIE_PERFIL,
  COOKIE_REFRESH,
  gravar_cookies_sessao,
} from "@/lib/cookies_sessao";
import { rota_permitida } from "@/lib/modulos";
import { eh_perfil, type SessaoAutenticada } from "@/lib/tipos_auth";

const ROTA_LOGIN = "/login";
const ROTA_SAIR = "/sair";

async function tentar_renovar(refresh_token: string): Promise<SessaoAutenticada | null> {
  try {
    return await renovar_na_api(refresh_token);
  } catch {
    return null;
  }
}

function redirecionar(request: NextRequest, caminho: string, limpar_sessao = false): NextResponse {
  const resposta = NextResponse.redirect(new URL(caminho, request.url));
  if (limpar_sessao) {
    apagar_cookies_sessao(resposta.cookies);
  }
  return resposta;
}

export async function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  if (caminho === ROTA_SAIR) {
    return NextResponse.next();
  }

  const em_login = caminho === ROTA_LOGIN;
  let perfil = request.cookies.get(COOKIE_PERFIL)?.value;
  let sessao_renovada: SessaoAutenticada | null = null;

  if (!request.cookies.has(COOKIE_ACCESS)) {
    const refresh_token = request.cookies.get(COOKIE_REFRESH)?.value;
    sessao_renovada = refresh_token ? await tentar_renovar(refresh_token) : null;

    if (!sessao_renovada) {
      if (em_login) {
        return NextResponse.next();
      }
      return redirecionar(request, ROTA_LOGIN, refresh_token !== undefined);
    }
    perfil = sessao_renovada.usuario.perfil;
  }

  if (em_login) {
    return redirecionar(request, "/");
  }
  if (!eh_perfil(perfil)) {
    return redirecionar(request, ROTA_SAIR);
  }
  if (!rota_permitida(caminho, perfil)) {
    return redirecionar(request, "/");
  }

  if (!sessao_renovada) {
    return NextResponse.next();
  }

  request.cookies.set(COOKIE_ACCESS, sessao_renovada.access_token);
  request.cookies.set(COOKIE_REFRESH, sessao_renovada.refresh_token);
  request.cookies.set(COOKIE_PERFIL, sessao_renovada.usuario.perfil);
  const resposta = NextResponse.next({ request: { headers: request.headers } });
  gravar_cookies_sessao(resposta.cookies, sessao_renovada);
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.png|favicon.ico).*)"],
};
