import type { Metadata } from "next";
import Link from "next/link";

import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioLancamento from "@/components/formulario_lancamento";
import { obter_atendimento, type Atendimento } from "@/lib/atendimentos_api";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { formatar_data_curta, hoje_na_clinica, NOMES_TIPO } from "@/lib/datas_agenda";
import { listar_categorias, type Categoria } from "@/lib/financeiro_api";
import { formatar_telefone } from "@/lib/formatadores";
import type { TipoLancamento } from "@/lib/opcoes_financeiro";

export const metadata: Metadata = {
  title: "Novo lançamento | AjuVet+",
};

const CATEGORIA_POR_ATENDIMENTO: Record<Atendimento["tipo"], string> = {
  consulta: "Consultas",
  retorno: "Consultas",
  vacinacao: "Vacinas",
  exame: "Exames",
  procedimento: "Procedimentos",
};

function valores_do_atendimento(atendimento: Atendimento, categorias: Categoria[]): Record<string, string> {
  const categoria = categorias.find(({ nome }) => nome === CATEGORIA_POR_ATENDIMENTO[atendimento.tipo]);
  return {
    descricao: `${NOMES_TIPO[atendimento.tipo]} - ${atendimento.animal.nome}`,
    categoria_id: categoria?.id ?? "",
    tutor_id: atendimento.tutor.id,
    tutor_id_nome: atendimento.tutor.nome,
    tutor_id_detalhe: formatar_telefone(atendimento.tutor.telefone_principal),
  };
}

export default async function NovoLancamentoPage({ searchParams }: PageProps<"/financeiro/lancamentos/novo">) {
  const parametros = await searchParams;
  const tipo: TipoLancamento = ler_texto(parametros.tipo) === "despesa" ? "despesa" : "receita";
  const atendimento_id = tipo === "receita" ? ler_texto(parametros.atendimento_id) : "";
  const [categorias, atendimento] = await Promise.all([
    listar_categorias(tipo),
    atendimento_id ? carregar_ou_404(obter_atendimento(atendimento_id)) : null,
  ]);
  const valores_iniciais = {
    data_competencia: hoje_na_clinica(),
    status: "pago",
    ...(atendimento ? valores_do_atendimento(atendimento, categorias) : {}),
  };
  const voltar = atendimento
    ? { href: `/atendimentos/${atendimento.id}`, rotulo: "Atendimento" }
    : { href: "/financeiro", rotulo: "Controle Financeiro" };

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={tipo === "receita" ? "Registrar receita" : "Registrar despesa"}
        descricao={
          tipo === "receita"
            ? "Registre um valor recebido ou a receber pela clínica."
            : "Registre um gasto pago ou a pagar pela clínica."
        }
        voltar={voltar}
        acao={
          !atendimento && (
            <nav aria-label="Tipo de lançamento" className="flex rounded-lg border border-borda bg-superficie p-1">
              {(["receita", "despesa"] as const).map((opcao) => (
                <Link
                  key={opcao}
                  href={`/financeiro/lancamentos/novo?tipo=${opcao}`}
                  aria-current={opcao === tipo ? "page" : undefined}
                  className={`rounded-md px-4 py-2 font-medium ${
                    opcao === tipo ? "bg-azul-ativo text-white" : "text-texto-subtitulo hover:bg-destaque-suave"
                  }`}
                >
                  {opcao === "receita" ? "Receita" : "Despesa"}
                </Link>
              ))}
            </nav>
          )
        }
      />
      <FormularioLancamento
        key={tipo}
        lancamento_id={null}
        tipo={tipo}
        categorias={categorias.map(({ id, nome }) => ({ valor: id, rotulo: nome }))}
        valores_iniciais={valores_iniciais}
        href_cancelar={voltar.href}
        atendimento={
          atendimento
            ? {
                id: atendimento.id,
                descricao: `${NOMES_TIPO[atendimento.tipo]} de ${atendimento.animal.nome} em ${formatar_data_curta(atendimento.realizado_em)} (${atendimento.veterinario.nome})`,
              }
            : null
        }
      />
    </div>
  );
}
