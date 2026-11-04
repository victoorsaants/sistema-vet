"use client";

import { useActionState } from "react";
import { UserRound } from "lucide-react";

import { Aviso, BotoesFormulario } from "@/components/botoes_formulario";
import { CampoTexto } from "@/components/campos_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { salvar_perfil } from "@/lib/acoes_perfil";
import type { EstadoFormulario } from "@/lib/dados_formulario";
import { formatar_telefone } from "@/lib/formatadores";
import type { MeuPerfil } from "@/lib/perfil_api";
import { NOMES_PERFIL } from "@/lib/tipos_auth";

type FormularioPerfilProps = {
  perfil: MeuPerfil;
};

export default function FormularioPerfil({ perfil }: FormularioPerfilProps) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(salvar_perfil, {
    erro: null,
    campos: {},
    valores: { nome: perfil.nome },
    versao: 0,
  });
  const { veterinario } = perfil;

  return (
    <SecaoCartao
      titulo="Dados pessoais"
      descricao={
        veterinario
          ? "Aqui você altera apenas o seu nome. Para mudar os outros dados, fale com a recepção."
          : "Aqui você altera o nome exibido no sistema. O e-mail de acesso não pode ser alterado por aqui."
      }
      icone={UserRound}
    >
      <form key={estado.versao} action={enviar} noValidate className="flex flex-col gap-5">
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            rotulo="Nome"
            nome="nome"
            obrigatorio
            erro={estado.campos.nome}
            defaultValue={estado.valores.nome}
            autoComplete="name"
            className="sm:col-span-2"
          />
          <CampoTexto rotulo="E-mail de acesso" nome="email" type="email" disabled defaultValue={perfil.email ?? ""} />
          <CampoTexto rotulo="Perfil" nome="perfil" disabled defaultValue={NOMES_PERFIL[perfil.perfil]} />
          {veterinario && (
            <>
              <CampoTexto rotulo="CRMV" nome="crmv" disabled defaultValue={veterinario.crmv} />
              <CampoTexto
                rotulo="Especialidade"
                nome="especialidade"
                disabled
                defaultValue={veterinario.especialidade ?? ""}
              />
              <CampoTexto
                rotulo="Telefone"
                nome="telefone"
                disabled
                defaultValue={formatar_telefone(veterinario.telefone)}
              />
            </>
          )}
        </div>
        <BotoesFormulario href_cancelar="/" rotulo_salvar="Salvar dados" enviando={enviando} />
      </form>
    </SecaoCartao>
  );
}
