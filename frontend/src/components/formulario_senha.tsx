"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { Aviso, BotoesFormulario } from "@/components/botoes_formulario";
import { CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_senha } from "@/lib/acoes_perfil";
import type { EstadoFormulario } from "@/lib/dados_formulario";

const ESTADO_INICIAL: EstadoFormulario = { erro: null, campos: {}, valores: {}, versao: 0 };

export default function FormularioSenha() {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(salvar_senha, ESTADO_INICIAL);
  const { campos } = estado;

  return (
    <SecaoCartao
      titulo="Alterar senha"
      descricao="Você continua conectado aqui. As outras sessões abertas com a sua conta serão desconectadas."
      icone={KeyRound}
      cor="bg-azul-ativo"
    >
      <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-5">
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            rotulo="Senha atual"
            nome="senha_atual"
            type="password"
            obrigatorio
            erro={campos.senha_atual}
            autoComplete="current-password"
            className="sm:col-span-2"
          />
          <CampoTexto
            rotulo="Nova senha"
            nome="nova_senha"
            type="password"
            obrigatorio
            erro={campos.nova_senha}
            placeholder="Pelo menos 8 caracteres"
            autoComplete="new-password"
          />
          <CampoTexto
            rotulo="Confirmar nova senha"
            nome="confirmar_senha"
            type="password"
            obrigatorio
            erro={campos.confirmar_senha}
            autoComplete="new-password"
          />
        </div>
        <BotoesFormulario href_cancelar="/" rotulo_salvar="Alterar senha" enviando={enviando} />
      </form>
    </SecaoCartao>
  );
}
