import { NextResponse, type NextRequest } from "next/server";

import { listar_animais } from "@/lib/cadastros_api";

const LIMITE_SUGESTOES = 8;

export async function GET(request: NextRequest) {
  const busca = request.nextUrl.searchParams.get("busca")?.trim() ?? "";
  const resultado = await listar_animais({ busca, tamanho: LIMITE_SUGESTOES });
  return NextResponse.json(
    resultado.itens.map(({ id, nome, especie, raca, tutor }) => ({
      id,
      nome,
      detalhe: [especie, raca, `Tutor: ${tutor.nome}`].filter(Boolean).join(" · "),
    })),
  );
}
