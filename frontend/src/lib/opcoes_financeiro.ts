import type { Opcao } from "@/lib/opcoes_cadastro";

export type TipoLancamento = "receita" | "despesa";
export type StatusLancamento = "pendente" | "pago" | "cancelado";
export type FormaPagamento = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "transferencia" | "boleto";

export const NOMES_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  transferencia: "Transferência",
  boleto: "Boleto",
};

export const FORMAS_PAGAMENTO: Opcao[] = Object.entries(NOMES_FORMA_PAGAMENTO).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));

export const NOMES_TIPO_LANCAMENTO: Record<TipoLancamento, string> = {
  receita: "Receita",
  despesa: "Despesa",
};

export const TIPOS_LANCAMENTO: Opcao[] = [
  { valor: "receita", rotulo: "Receitas" },
  { valor: "despesa", rotulo: "Despesas" },
];

export const SITUACOES_LANCAMENTO: Opcao[] = [
  { valor: "pago", rotulo: "Recebido / pago" },
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "cancelado", rotulo: "Cancelado" },
];

const FORMATO_MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatar_moeda(valor: number): string {
  return FORMATO_MOEDA.format(valor);
}

export function valor_para_campo(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

export function ler_valor_monetario(texto: string): string {
  const limpo = texto.replace(/[R$\s]/g, "");
  if (limpo.includes(",")) {
    return limpo.replace(/\./g, "").replace(",", ".");
  }
  return /^\d+\.\d{1,2}$/.test(limpo) ? limpo : limpo.replace(/\./g, "");
}

export function situacao_lancamento(
  tipo: TipoLancamento,
  status: StatusLancamento,
  vencimento: string | null,
  hoje: string,
): { rotulo: string; estilo: string } {
  if (status === "pago") {
    return tipo === "receita"
      ? { rotulo: "Recebido", estilo: "bg-emerald-50 text-emerald-800" }
      : { rotulo: "Pago", estilo: "bg-pink-50 text-pink-700" };
  }
  if (status === "cancelado") {
    return { rotulo: "Cancelado", estilo: "bg-slate-100 text-slate-600 line-through" };
  }
  if (vencimento && vencimento < hoje) {
    return { rotulo: "Vencido", estilo: "bg-rose-100 text-rose-800" };
  }
  return { rotulo: tipo === "receita" ? "A receber" : "A pagar", estilo: "bg-amber-50 text-amber-800" };
}

export function primeiro_dia_do_mes(data_iso: string): string {
  return `${data_iso.slice(0, 7)}-01`;
}

export function somar_meses(mes_iso: string, meses: number): string {
  const [ano, mes] = mes_iso.split("-").map(Number);
  const indice = ano * 12 + mes - 1 + meses;
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}-01`;
}

export function ultimo_dia_do_mes(mes_iso: string): string {
  const proximo = new Date(`${somar_meses(mes_iso, 1)}T12:00:00Z`);
  proximo.setUTCDate(0);
  return proximo.toISOString().slice(0, 10);
}

const FORMATO_MES_ANO = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
const FORMATO_MES_CURTO = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" });

export function nome_do_mes(mes_iso: string): string {
  const texto = FORMATO_MES_ANO.format(new Date(`${mes_iso.slice(0, 7)}-15T12:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function mes_abreviado(mes_iso: string): string {
  const mes = FORMATO_MES_CURTO.format(new Date(`${mes_iso.slice(0, 7)}-15T12:00:00Z`)).replace(".", "");
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)}/${mes_iso.slice(2, 4)}`;
}
