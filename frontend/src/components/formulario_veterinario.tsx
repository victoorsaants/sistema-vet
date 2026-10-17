"use client";

import { useActionState, useState, type FormEvent } from "react";
import { KeyRound, Stethoscope } from "lucide-react";

import { Aviso, BotoesFormulario } from "@/components/botoes_formulario";
import { CampoSelecao, CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_veterinario } from "@/lib/acoes_veterinarios";
import type { EstadoFormulario } from "@/lib/dados_formulario";
import { formatar_telefone } from "@/lib/formatadores";

type FormularioVeterinarioProps = {
  veterinario_id: string | null;
  valores_iniciais: Record<string, string>;
};

const SITUACOES = [
  { valor: "sim", rotulo: "Ativo" },
  { valor: "nao", rotulo: "Inativo" },
];

function mascara_telefone(evento: FormEvent<HTMLInputElement>) {
  evento.currentTarget.value = formatar_telefone(evento.currentTarget.value);
}

export default function FormularioVeterinario({ veterinario_id, valores_iniciais }: FormularioVeterinarioProps) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    salvar_veterinario.bind(null, veterinario_id),
    { erro: null, campos: {}, valores: valores_iniciais, versao: 0 },
  );
  const { valores, campos } = estado;
  const [criar_acesso, definir_criar_acesso] = useState(
    estado.versao === 0 ? true : valores.criar_acesso === "sim",
  );

  return (
    <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-6">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <SecaoCartao
        titulo="Dados do veterinário"
        descricao="Identificação profissional e contato."
        icone={Stethoscope}
        cor="bg-modulo-atendimentos"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            rotulo="Nome"
            nome="nome"
            obrigatorio
            erro={campos.nome}
            defaultValue={valores.nome}
            placeholder="Ex.: Dra. Mariana Costa"
            autoComplete="off"
          />
          <CampoTexto
            rotulo="CRMV"
            nome="crmv"
            obrigatorio
            erro={campos.crmv}
            defaultValue={valores.crmv}
            placeholder="Ex.: CRMV-SE 0001"
          />
          <CampoTexto
            rotulo="Especialidade"
            nome="especialidade"
            erro={campos.especialidade}
            defaultValue={valores.especialidade}
            placeholder="Ex.: Clínica geral"
          />
          <CampoTexto
            rotulo="Telefone"
            nome="telefone"
            erro={campos.telefone}
            defaultValue={valores.telefone}
            placeholder="(79) 99999-9999"
            inputMode="tel"
            onInput={mascara_telefone}
          />
          <CampoTexto
            rotulo="E-mail de contato"
            nome="email"
            type="email"
            erro={campos.email}
            defaultValue={valores.email}
            placeholder="exemplo@email.com"
          />
          {veterinario_id && (
            <CampoSelecao
              rotulo="Situação"
              nome="ativo"
              obrigatorio
              erro={campos.ativo}
              defaultValue={valores.ativo}
              opcoes={SITUACOES}
              vazio="Selecione"
            />
          )}
        </div>
        {veterinario_id && (
          <p className="mt-4 text-sm text-texto-suave">
            Inativo não aparece na agenda nem consegue entrar no sistema. Os atendimentos já feitos continuam no
            histórico.
          </p>
        )}
      </SecaoCartao>

      {!veterinario_id && (
        <SecaoCartao
          titulo="Acesso ao sistema"
          descricao="Login para o veterinário ver a agenda e registrar atendimentos."
          icone={KeyRound}
          cor="bg-azul-ativo"
        >
          <label className="mb-5 flex items-center gap-3 font-medium text-texto-titulo">
            <input
              type="checkbox"
              name="criar_acesso"
              value="sim"
              checked={criar_acesso}
              onChange={(evento) => definir_criar_acesso(evento.target.checked)}
              className="size-5 accent-azul-ativo"
            />
            Criar acesso agora
          </label>
          {criar_acesso ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="E-mail de acesso"
                nome="email_login"
                type="email"
                obrigatorio
                erro={campos.email_login}
                defaultValue={valores.email_login}
                placeholder="nome@clinica.com"
                autoComplete="off"
              />
              <CampoTexto
                rotulo="Senha inicial"
                nome="senha_login"
                type="password"
                obrigatorio
                erro={campos.senha_login}
                placeholder="Pelo menos 8 caracteres"
                autoComplete="new-password"
              />
            </div>
          ) : (
            <p className="text-texto-suave">Você pode criar o acesso depois, na página do veterinário.</p>
          )}
        </SecaoCartao>
      )}

      <BotoesFormulario
        href_cancelar="/veterinarios"
        rotulo_salvar={veterinario_id ? "Salvar alterações" : "Cadastrar veterinário"}
        enviando={enviando}
      />
    </form>
  );
}
