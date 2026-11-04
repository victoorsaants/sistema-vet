import type { Metadata } from "next";

import { Aviso } from "@/components/botoes_formulario";
import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioPerfil from "@/components/formulario_perfil";
import FormularioSenha from "@/components/formulario_senha";
import { obter_meu_perfil } from "@/lib/perfil_api";

export const metadata: Metadata = {
  title: "Meu perfil | AjuVet+",
};

const MENSAGENS_SALVO: Record<string, string> = {
  dados: "Dados atualizados.",
  senha: "Senha alterada.",
};

export default async function PerfilPage({ searchParams }: PageProps<"/perfil">) {
  const salvo = ler_texto((await searchParams).salvo);
  const perfil = await obter_meu_perfil();

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina titulo="Meu perfil" descricao="Consulte seus dados e altere a sua senha." />

      {MENSAGENS_SALVO[salvo] && <Aviso tipo="sucesso">{MENSAGENS_SALVO[salvo]}</Aviso>}

      <FormularioPerfil key={`${perfil.nome}-${salvo}`} perfil={perfil} />
      <FormularioSenha key={salvo} />
    </div>
  );
}
