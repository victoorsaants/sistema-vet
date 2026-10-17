import { montar_consulta, requisitar_autenticado } from "@/lib/api_autenticada";
import type { TipoAtendimento } from "@/lib/agenda_api";
import type { Referencia } from "@/lib/atendimentos_api";
import type { Pagina } from "@/lib/cadastros_api";
import type { FormaPagamento, StatusLancamento, TipoLancamento } from "@/lib/opcoes_financeiro";

export type Categoria = { id: string; nome: string; tipo: TipoLancamento };

export type DadosLancamento = {
  categoria_id: string;
  descricao: string;
  valor: string;
  data_competencia: string;
  vencimento: string | null;
  forma_pagamento: FormaPagamento | null;
  tutor_id: string | null;
  atendimento_id: string | null;
};

export type NovoLancamento = DadosLancamento & {
  tipo: TipoLancamento;
  status: "pendente" | "pago";
};

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  categoria: Referencia;
  descricao: string;
  valor: number;
  forma_pagamento: FormaPagamento | null;
  status: StatusLancamento;
  data_competencia: string;
  vencimento: string | null;
  pago_em: string | null;
  tutor: Referencia | null;
  atendimento: { id: string; tipo: TipoAtendimento; realizado_em: string; animal: string } | null;
  registrado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type ExtratoLancamentos = Pagina<Lancamento> & {
  total_receitas: number;
  total_despesas: number;
};

export type ResumoFinanceiro = {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
  total_lancamentos: number;
  a_receber: number;
  a_pagar: number;
  variacao: { receitas: number | null; despesas: number | null; saldo: number | null; lancamentos: number | null };
  fluxo: { mes: string; receitas: number; despesas: number }[];
  despesas_por_categoria: { categoria: string; valor: number; percentual: number }[];
  ultimos_lancamentos: Lancamento[];
};

export type FiltroLancamentos = {
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  categoria_id?: string;
  atendimento_id?: string;
  de?: string;
  ate?: string;
  busca?: string;
};

export function listar_categorias(tipo?: TipoLancamento): Promise<Categoria[]> {
  return requisitar_autenticado(`/financeiro/categorias${montar_consulta({ tipo })}`);
}

export function obter_resumo_financeiro(mes: string): Promise<ResumoFinanceiro> {
  return requisitar_autenticado(`/financeiro/resumo${montar_consulta({ mes })}`);
}

export function listar_lancamentos(
  filtro: FiltroLancamentos & { pagina?: number; tamanho?: number },
): Promise<ExtratoLancamentos> {
  return requisitar_autenticado(`/financeiro/lancamentos${montar_consulta(filtro)}`);
}

export function obter_lancamento(id: string): Promise<Lancamento> {
  return requisitar_autenticado(`/financeiro/lancamentos/${encodeURIComponent(id)}`);
}

export function criar_lancamento(dados: NovoLancamento): Promise<Lancamento> {
  return requisitar_autenticado("/financeiro/lancamentos", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizar_lancamento(id: string, dados: DadosLancamento): Promise<Lancamento> {
  return requisitar_autenticado(`/financeiro/lancamentos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function pagar_lancamento(id: string, forma_pagamento: FormaPagamento): Promise<Lancamento> {
  return requisitar_autenticado(`/financeiro/lancamentos/${encodeURIComponent(id)}/pagar`, {
    method: "POST",
    body: JSON.stringify({ forma_pagamento }),
  });
}

export function cancelar_lancamento(id: string): Promise<Lancamento> {
  return requisitar_autenticado(`/financeiro/lancamentos/${encodeURIComponent(id)}/cancelar`, { method: "POST" });
}
