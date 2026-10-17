import type { Metadata } from "next";

import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioTutor from "@/components/formulario_tutor";

export const metadata: Metadata = {
  title: "Cadastro de Tutor | AjuVet+",
};

export default function NovoTutorPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Cadastro de Tutor"
        descricao="Preencha os dados do tutor. Depois você poderá cadastrar os animais dele."
        voltar={{ href: "/tutores", rotulo: "Tutores" }}
      />
      <FormularioTutor tutor_id={null} valores_iniciais={{}} />
    </div>
  );
}
