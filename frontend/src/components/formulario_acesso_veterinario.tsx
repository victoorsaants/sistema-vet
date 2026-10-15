"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle, Save } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import { CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_acesso } from "@/lib/acoes_veterinarios";
import type { EstadoFormulario } from "@/lib/dados_formulario";

type FormularioAcessoVeterinarioProps = {
  veterinario_id: string;
  email_atual: string | null;
};

export default function FormularioAcessoVeterinario({ veterinario_id, email_atual }: FormularioAcessoVeterinarioProps) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    salvar_acesso.bind(null, veterinario_id),
    { erro: null, campos: {}, valores: { email_login: email_atual ?? "" }, versao: 0 },
  );
  const { valores, campos } = estado;
  const tem_acesso = email_atual !== null;

  return (
    <SecaoCartao
      titulo="Acesso ao sistema"
      descricao={
        tem_acesso
          ? "Troque o e-mail de login ou defina uma nova senha. Trocar a senha desconecta o veterinário."
          : "Este veterinário ainda não tem login. Crie um para ele ver a agenda e registrar atendimentos."
      }
      icone={KeyRound}
      cor="bg-azul-ativo"
    >
      <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-5">
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
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
            rotulo={tem_acesso ? "Nova senha" : "Senha inicial"}
            nome="senha_login"
            type="password"
            obrigatorio={!tem_acesso}
            erro={campos.senha_login}
            placeholder={tem_acesso ? "Deixe em branco para manter a atual" : "Pelo menos 8 caracteres"}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={enviando}
            className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-6 font-medium text-white shadow-sm hover:bg-azul-marca disabled:opacity-70"
          >
            {enviando ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
            {tem_acesso ? "Salvar acesso" : "Criar acesso"}
          </button>
        </div>
      </form>
    </SecaoCartao>
  );
}
