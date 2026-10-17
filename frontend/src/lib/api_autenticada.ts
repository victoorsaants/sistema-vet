import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ErroApi, requisitar } from "@/lib/cliente_api";
import { COOKIE_ACCESS } from "@/lib/cookies_sessao";

export async function requisitar_autenticado<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const access_token = (await cookies()).get(COOKIE_ACCESS)?.value;
  if (!access_token) {
    redirect("/sair");
  }

  try {
    return await requisitar<T>(caminho, {
      ...opcoes,
      headers: { ...opcoes.headers, Authorization: `Bearer ${access_token}` },
    });
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 401) {
      redirect("/sair");
    }
    throw erro;
  }
}

export function montar_consulta(parametros: Record<string, string | number | undefined>): string {
  const consulta = new URLSearchParams();
  for (const [nome, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== "") {
      consulta.set(nome, String(valor));
    }
  }
  const texto = consulta.toString();
  return texto ? `?${texto}` : "";
}
