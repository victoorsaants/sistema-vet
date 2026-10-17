"use client";

import { useActionState, useState } from "react";
import { ClipboardPlus, HandCoins, ReceiptText, UserRound } from "lucide-react";

import { Aviso, BotoesFormulario } from "@/components/botoes_formulario";
import { CampoSelecao, CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import SeletorBusca from "@/components/seletor_busca";
import { salvar_lancamento } from "@/lib/acoes_financeiro";
import type { EstadoFormulario } from "@/lib/dados_formulario";
import { FORMAS_PAGAMENTO, type TipoLancamento } from "@/lib/opcoes_financeiro";
import type { Opcao } from "@/lib/opcoes_cadastro";

type FormularioLancamentoProps = {
  lancamento_id: string | null;
  tipo: TipoLancamento;
  categorias: Opcao[];
  valores_iniciais: Record<string, string>;
  href_cancelar: string;
  atendimento?: { id: string; descricao: string } | null;
};

export default function FormularioLancamento({
  lancamento_id,
  tipo,
  categorias,
  valores_iniciais,
  href_cancelar,
  atendimento,
}: FormularioLancamentoProps) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    salvar_lancamento.bind(null, lancamento_id),
    { erro: null, campos: {}, valores: valores_iniciais, versao: 0 },
  );
  const { valores, campos } = estado;
  const [situacao, definir_situacao] = useState(lancamento_id ? "pendente" : valores.status || "pago");
  const receita = tipo === "receita";
  const pago = situacao === "pago";
  const tutor_inicial = valores.tutor_id
    ? { id: valores.tutor_id, nome: valores.tutor_id_nome ?? "", detalhe: valores.tutor_id_detalhe ?? "" }
    : null;
  const opcoes_situacao = receita
    ? [
        { valor: "pago", rotulo: "Recebido" },
        { valor: "pendente", rotulo: "A receber" },
      ]
    : [
        { valor: "pago", rotulo: "Pago" },
        { valor: "pendente", rotulo: "A pagar" },
      ];

  return (
    <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-6">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="status" value={situacao} />
      {atendimento && <input type="hidden" name="atendimento_id" value={atendimento.id} />}

      {atendimento && !lancamento_id && (
        <p className="flex items-center gap-3 rounded-xl border border-borda bg-destaque-suave px-4 py-3 text-texto-titulo">
          <ClipboardPlus className="size-5 shrink-0 text-azul-ativo" />
          Pagamento do atendimento: {atendimento.descricao}
        </p>
      )}

      <SecaoCartao
        titulo={receita ? "Dados da receita" : "Dados da despesa"}
        descricao={receita ? "Valores recebidos ou a receber da clínica." : "Gastos pagos ou a pagar da clínica."}
        icone={receita ? HandCoins : ReceiptText}
        cor={receita ? "bg-receita" : "bg-despesa"}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            rotulo="Descrição"
            nome="descricao"
            obrigatorio
            erro={campos.descricao}
            defaultValue={valores.descricao}
            placeholder={receita ? "Ex.: Consulta - Thor" : "Ex.: Compra de luvas"}
            maxLength={200}
            className="sm:col-span-2"
          />
          <CampoSelecao
            rotulo="Categoria"
            nome="categoria_id"
            obrigatorio
            erro={campos.categoria_id}
            defaultValue={valores.categoria_id}
            opcoes={categorias}
            vazio="Selecione a categoria"
          />
          <CampoTexto
            rotulo="Valor (R$)"
            nome="valor"
            obrigatorio
            erro={campos.valor}
            defaultValue={valores.valor}
            placeholder="Ex.: 120,00"
            inputMode="decimal"
          />
          <CampoTexto
            rotulo="Data"
            nome="data_competencia"
            type="date"
            obrigatorio
            erro={campos.data_competencia}
            defaultValue={valores.data_competencia}
          />
          {lancamento_id ? (
            <CampoTexto
              rotulo="Vencimento"
              nome="vencimento"
              type="date"
              erro={campos.vencimento}
              defaultValue={valores.vencimento}
            />
          ) : (
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-texto-titulo">
                Situação<span className="text-rose-600"> *</span>
              </legend>
              <div className="grid h-11 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
                {opcoes_situacao.map(({ valor, rotulo }) => (
                  <label
                    key={valor}
                    className={`flex cursor-pointer items-center justify-center rounded-md text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-azul-marca/40 ${
                      situacao === valor ? "bg-azul-ativo text-white" : "text-texto-subtitulo hover:bg-destaque-suave"
                    }`}
                  >
                    <input
                      type="radio"
                      name="situacao"
                      value={valor}
                      checked={situacao === valor}
                      onChange={() => definir_situacao(valor)}
                      className="sr-only"
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!lancamento_id &&
            (pago ? (
              <CampoSelecao
                rotulo="Forma de pagamento"
                nome="forma_pagamento"
                obrigatorio
                erro={campos.forma_pagamento}
                defaultValue={valores.forma_pagamento}
                opcoes={FORMAS_PAGAMENTO}
              />
            ) : (
              <CampoTexto
                rotulo="Vencimento"
                nome="vencimento"
                type="date"
                erro={campos.vencimento}
                defaultValue={valores.vencimento}
              />
            ))}

          {receita && (
            <SeletorBusca
              rotulo="Tutor"
              nome="tutor_id"
              obrigatorio={false}
              endpoint="/api/tutores"
              placeholder="Digite o nome, CPF ou telefone do tutor"
              icone={UserRound}
              inicial={tutor_inicial}
              erro={campos.tutor_id}
              className="sm:col-span-2 lg:col-span-3"
            />
          )}
        </div>
      </SecaoCartao>

      <BotoesFormulario
        href_cancelar={href_cancelar}
        rotulo_salvar={lancamento_id ? "Salvar alterações" : receita ? "Registrar receita" : "Registrar despesa"}
        enviando={enviando}
      />
    </form>
  );
}
