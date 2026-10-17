import { NextResponse, type NextRequest } from "next/server";

import { consultar_agenda } from "@/lib/agenda_api";
import { ErroApi } from "@/lib/cliente_api";

const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const veterinario_id = request.nextUrl.searchParams.get("veterinario_id") ?? "";
  const inicio = request.nextUrl.searchParams.get("inicio") ?? "";
  if (!veterinario_id || !PADRAO_DATA.test(inicio)) {
    return NextResponse.json({ detail: "Informe o veterinário e a data inicial." }, { status: 400 });
  }
  try {
    return NextResponse.json(await consultar_agenda(veterinario_id, inicio));
  } catch (erro) {
    if (erro instanceof ErroApi) {
      return NextResponse.json({ detail: erro.message }, { status: erro.status });
    }
    throw erro;
  }
}
