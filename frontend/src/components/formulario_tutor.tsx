"use client";

import { useActionState, type FormEvent } from "react";
import { UserRound } from "lucide-react";

import { Aviso, BotoesFormulario } from "@/components/botoes_formulario";
import { CampoSelecao, CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_tutor } from "@/lib/acoes_cadastros";
import type { EstadoFormulario } from "@/lib/dados_formulario";
import { formatar_cep, formatar_cpf, formatar_telefone } from "@/lib/formatadores";
import { COMO_CONHECEU, ESTADOS } from "@/lib/opcoes_cadastro";

type FormularioTutorProps = {
  tutor_id: string | null;
  valores_iniciais: Record<string, string>;
};

function mascara(formatar: (valor: string) => string) {
  return (evento: FormEvent<HTMLInputElement>) => {
    evento.currentTarget.value = formatar(evento.currentTarget.value);
  };
}

export default function FormularioTutor({ tutor_id, valores_iniciais }: FormularioTutorProps) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    salvar_tutor.bind(null, tutor_id),
    { erro: null, campos: {}, valores: valores_iniciais, versao: 0 },
  );
  const { valores, campos } = estado;

  return (
    <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-6">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <SecaoCartao titulo="Dados do Tutor" descricao="Dados pessoais, contato e endereço." icone={UserRound}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            rotulo="Nome completo"
            nome="nome"
            obrigatorio
            erro={campos.nome}
            defaultValue={valores.nome}
            placeholder="Digite o nome completo do tutor"
            autoComplete="name"
          />
          <CampoTexto
            rotulo="CPF"
            nome="cpf"
            obrigatorio
            erro={campos.cpf}
            defaultValue={valores.cpf}
            placeholder="000.000.000-00"
            inputMode="numeric"
            onInput={mascara(formatar_cpf)}
          />
          <CampoTexto
            rotulo="Data de nascimento"
            nome="data_nascimento"
            type="date"
            erro={campos.data_nascimento}
            defaultValue={valores.data_nascimento}
          />
          <CampoTexto
            rotulo="Telefone principal"
            nome="telefone_principal"
            obrigatorio
            erro={campos.telefone_principal}
            defaultValue={valores.telefone_principal}
            placeholder="(79) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            onInput={mascara(formatar_telefone)}
          />
          <CampoTexto
            rotulo="Telefone secundário"
            nome="telefone_secundario"
            erro={campos.telefone_secundario}
            defaultValue={valores.telefone_secundario}
            placeholder="(79) 99999-9999"
            inputMode="tel"
            onInput={mascara(formatar_telefone)}
          />
          <CampoTexto
            rotulo="E-mail"
            nome="email"
            type="email"
            erro={campos.email}
            defaultValue={valores.email}
            placeholder="exemplo@email.com"
            autoComplete="email"
          />
          <CampoTexto
            rotulo="Endereço completo"
            nome="endereco"
            obrigatorio
            erro={campos.endereco}
            defaultValue={valores.endereco}
            placeholder="Rua, número, complemento"
            autoComplete="street-address"
          />
          <CampoTexto
            rotulo="Bairro"
            nome="bairro"
            erro={campos.bairro}
            defaultValue={valores.bairro}
            placeholder="Digite o bairro"
          />
          <CampoTexto
            rotulo="Cidade"
            nome="cidade"
            obrigatorio
            erro={campos.cidade}
            defaultValue={valores.cidade}
            placeholder="Digite a cidade"
            autoComplete="address-level2"
          />
          <CampoSelecao
            rotulo="Estado"
            nome="estado"
            obrigatorio
            erro={campos.estado}
            defaultValue={valores.estado}
            opcoes={ESTADOS}
            vazio="Selecione o estado"
          />
          <CampoTexto
            rotulo="CEP"
            nome="cep"
            obrigatorio
            erro={campos.cep}
            defaultValue={valores.cep}
            placeholder="00000-000"
            inputMode="numeric"
            autoComplete="postal-code"
            onInput={mascara(formatar_cep)}
          />
          <CampoSelecao
            rotulo="Como nos conheceu?"
            nome="como_conheceu"
            erro={campos.como_conheceu}
            defaultValue={valores.como_conheceu}
            opcoes={COMO_CONHECEU}
            vazio="Selecione uma opção"
          />
        </div>
      </SecaoCartao>

      <BotoesFormulario
        href_cancelar={tutor_id ? `/tutores/${tutor_id}` : "/tutores"}
        rotulo_salvar="Salvar tutor"
        enviando={enviando}
      />
    </form>
  );
}
