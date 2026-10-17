import { NextResponse, type NextRequest } from "next/server";

import { listar_tutores } from "@/lib/cadastros_api";
import { formatar_cpf, formatar_telefone } from "@/lib/formatadores";

const LIMITE_SUGESTOES = 8;

export async function GET(request: NextRequest) {
  const busca = request.nextUrl.searchParams.get("busca")?.trim() ?? "";
  const resultado = await listar_tutores({ busca, tamanho: LIMITE_SUGESTOES });
  return NextResponse.json(
    resultado.itens.map(({ id, nome, cpf, telefone_principal }) => ({
      id,
      nome,
      detalhe: [cpf && formatar_cpf(cpf), formatar_telefone(telefone_principal)].filter(Boolean).join(" · "),
    })),
  );
}
