import { unstable_rethrow } from "next/navigation";

import { ErroApi, type CamposComErro } from "@/lib/cliente_api";

export type EstadoFormulario = {
  erro: string | null;
  campos: CamposComErro;
  valores: Record<string, string>;
  versao: number;
};

export function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

export function texto_ou_nulo(dados: FormData, campo: string): string | null {
  return texto(dados, campo) || null;
}

export function numero_ou_nulo(dados: FormData, campo: string): number | null {
  const valor = texto(dados, campo).replace(",", ".");
  return valor === "" ? null : Number(valor);
}

function valores_do_formulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  dados.forEach((valor, campo) => {
    if (typeof valor === "string" && !campo.startsWith("$")) {
      valores[campo] = valor;
    }
  });
  return valores;
}

export function estado_de_erro(
  estado: EstadoFormulario,
  dados: FormData,
  erro: unknown,
  campos_com_duplicidade: [RegExp, string][] = [],
): EstadoFormulario {
  unstable_rethrow(erro);
  const base = { valores: valores_do_formulario(dados), versao: estado.versao + 1 };
  if (!(erro instanceof ErroApi)) {
    return { ...base, erro: "Não foi possível salvar. Tente novamente.", campos: {} };
  }
  const campos = { ...erro.campos };
  if (erro.status === 409) {
    const duplicado = campos_com_duplicidade.find(([padrao]) => padrao.test(erro.message));
    if (duplicado) {
      campos[duplicado[1]] = erro.message;
    }
  }
  return { ...base, erro: erro.message, campos };
}
