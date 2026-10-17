import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioAnimal from "@/components/formulario_animal";
import { obter_tutor } from "@/lib/cadastros_api";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { obter_usuario_logado } from "@/lib/dal";
import { formatar_telefone } from "@/lib/formatadores";

export const metadata: Metadata = {
  title: "Cadastro de Animal | AjuVet+",
};

export default async function NovoAnimalPage({ searchParams }: PageProps<"/animais/novo">) {
  const usuario = await obter_usuario_logado();
  if (usuario.perfil !== "recepcao") {
    redirect("/animais");
  }

  const tutor_id = ler_texto((await searchParams).tutor_id);
  const tutor = tutor_id ? await carregar_ou_404(obter_tutor(tutor_id)) : null;
  const valores_iniciais: Record<string, string> = tutor
    ? { tutor_id: tutor.id, tutor_id_nome: tutor.nome, tutor_id_detalhe: formatar_telefone(tutor.telefone_principal) }
    : {};
  const voltar = tutor ? { href: `/tutores/${tutor.id}`, rotulo: tutor.nome } : { href: "/animais", rotulo: "Animais" };

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Cadastro de Animal"
        descricao="Preencha os dados para cadastrar um novo animal na clínica."
        voltar={voltar}
      />
      <FormularioAnimal animal_id={null} valores_iniciais={valores_iniciais} href_cancelar={voltar.href} />
    </div>
  );
}
