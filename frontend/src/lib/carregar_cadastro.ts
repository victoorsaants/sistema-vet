import { notFound } from "next/navigation";

import { ErroApi } from "@/lib/cliente_api";

export async function carregar_ou_404<T>(busca: Promise<T>): Promise<T> {
  try {
    return await busca;
  } catch (erro) {
    if (erro instanceof ErroApi && (erro.status === 404 || erro.status === 422)) {
      notFound();
    }
    throw erro;
  }
}
