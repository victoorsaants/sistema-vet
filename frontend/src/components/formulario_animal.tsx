"use client";

import { useActionState } from "react";
import { PawPrint, UserRound } from "lucide-react";

import { Aviso, BotoesFormulario } from "@/components/botoes_formulario";
import { CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import SeletorBusca from "@/components/seletor_busca";
import { salvar_animal } from "@/lib/acoes_cadastros";
import type { EstadoFormulario } from "@/lib/dados_formulario";
import { ESPECIES, OPCOES_CASTRADO, PORTES, SEXOS } from "@/lib/opcoes_cadastro";

type FormularioAnimalProps = {
  animal_id: string | null;
  valores_iniciais: Record<string, string>;
  href_cancelar: string;
};

export default function FormularioAnimal({ animal_id, valores_iniciais, href_cancelar }: FormularioAnimalProps) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    salvar_animal.bind(null, animal_id),
    { erro: null, campos: {}, valores: valores_iniciais, versao: 0 },
  );
  const { valores, campos } = estado;
  const tutor_inicial = valores.tutor_id
    ? { id: valores.tutor_id, nome: valores.tutor_id_nome ?? "", detalhe: valores.tutor_id_detalhe ?? "" }
    : null;

  return (
    <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-6">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <SecaoCartao
        titulo="Informações do animal"
        descricao="Ficha individual com os dados essenciais do animal."
        icone={PawPrint}
        cor="bg-modulo-animais"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SeletorBusca
            rotulo="Tutor"
            nome="tutor_id"
            endpoint="/api/tutores"
            placeholder="Digite o nome, CPF ou telefone do tutor"
            icone={UserRound}
            inicial={tutor_inicial}
            erro={campos.tutor_id}
            className="sm:col-span-2 lg:col-span-3"
          />

          <CampoTexto
            rotulo="Nome do animal"
            nome="nome"
            obrigatorio
            erro={campos.nome}
            defaultValue={valores.nome}
            placeholder="Ex.: Mel"
          />
          <CampoSelecao
            rotulo="Espécie"
            nome="especie"
            obrigatorio
            erro={campos.especie}
            defaultValue={valores.especie}
            opcoes={ESPECIES}
            vazio="Selecione a espécie"
          />
          <CampoTexto
            rotulo="Raça"
            nome="raca"
            erro={campos.raca}
            defaultValue={valores.raca}
            placeholder="Ex.: SRD, Golden Retriever"
          />
          <CampoSelecao
            rotulo="Sexo"
            nome="sexo"
            erro={campos.sexo}
            defaultValue={valores.sexo}
            opcoes={SEXOS}
          />
          <CampoTexto
            rotulo="Data de nascimento"
            nome="data_nascimento"
            type="date"
            erro={campos.data_nascimento}
            defaultValue={valores.data_nascimento}
          />
          <CampoTexto
            rotulo="Cor / pelagem"
            nome="cor_pelagem"
            erro={campos.cor_pelagem}
            defaultValue={valores.cor_pelagem}
            placeholder="Ex.: caramelo"
          />
          <CampoTexto
            rotulo="Peso (kg)"
            nome="peso_kg"
            obrigatorio
            erro={campos.peso_kg}
            defaultValue={valores.peso_kg}
            placeholder="Ex.: 8,5"
            inputMode="decimal"
          />
          <CampoTexto
            rotulo="Altura (cm)"
            nome="altura_cm"
            erro={campos.altura_cm}
            defaultValue={valores.altura_cm}
            placeholder="Ex.: 35"
            inputMode="decimal"
          />
          <CampoTexto
            rotulo="Largura (cm)"
            nome="largura_cm"
            erro={campos.largura_cm}
            defaultValue={valores.largura_cm}
            placeholder="Ex.: 22"
            inputMode="decimal"
          />
          <CampoSelecao
            rotulo="Porte do animal"
            nome="porte"
            erro={campos.porte}
            defaultValue={valores.porte}
            opcoes={PORTES}
            vazio="Selecione o porte"
          />
          <CampoTexto
            rotulo="Microchip / identificação"
            nome="microchip"
            erro={campos.microchip}
            defaultValue={valores.microchip}
            placeholder="Número do microchip (se houver)"
          />
          <CampoSelecao
            rotulo="Castrado?"
            nome="castrado"
            erro={campos.castrado}
            defaultValue={valores.castrado}
            opcoes={OPCOES_CASTRADO}
            vazio="Não informado"
          />
          <CampoAreaTexto
            rotulo="Alergias, condições ou observações importantes"
            nome="observacoes"
            erro={campos.observacoes}
            defaultValue={valores.observacoes}
            placeholder="Informe alergias, doenças pré-existentes, comportamento ou outras observações..."
            maxLength={2000}
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>
      </SecaoCartao>

      <BotoesFormulario href_cancelar={href_cancelar} rotulo_salvar="Salvar animal" enviando={enviando} />
    </form>
  );
}
