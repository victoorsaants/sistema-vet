import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { API_URL } from "@/lib/cliente_api";
import { COOKIE_ACCESS } from "@/lib/cookies_sessao";

const CABECALHOS_REPASSADOS = ["content-type", "content-length", "content-disposition"];

export async function GET(_: NextRequest, { params }: RouteContext<"/api/anexos/[id]">) {
  const { id } = await params;
  const access_token = (await cookies()).get(COOKIE_ACCESS)?.value;
  if (!access_token) {
    return NextResponse.json({ detail: "Faça login para continuar." }, { status: 401 });
  }

  const resposta = await fetch(`${API_URL}/anexos/${encodeURIComponent(id)}/arquivo`, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!resposta) {
    return NextResponse.json({ detail: "Não foi possível conectar ao servidor." }, { status: 503 });
  }
  if (!resposta.ok) {
    return NextResponse.json(await resposta.json().catch(() => ({})), { status: resposta.status });
  }

  const cabecalhos = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  for (const nome of CABECALHOS_REPASSADOS) {
    const valor = resposta.headers.get(nome);
    if (valor) {
      cabecalhos.set(nome, valor);
    }
  }
  return new Response(resposta.body, { status: 200, headers: cabecalhos });
}
