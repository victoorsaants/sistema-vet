import { NextResponse } from "next/server";

import { apagar_cookies_sessao } from "@/lib/cookies_sessao";

export function GET() {
  const resposta = new NextResponse(null, { status: 307, headers: { Location: "/login?sessao=expirada" } });
  apagar_cookies_sessao(resposta.cookies);
  return resposta;
}
