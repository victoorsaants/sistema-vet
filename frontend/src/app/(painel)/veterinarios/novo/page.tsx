import type { Metadata } from "next";

import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioVeterinario from "@/components/formulario_veterinario";

export const metadata: Metadata = {
  title: "Novo veterinário | AjuVet+",
};

export default function NovoVeterinarioPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo="Novo veterinário"
        descricao="Cadastre o veterinário e, se quiser, já crie o acesso dele ao sistema."
        voltar={{ href: "/veterinarios", rotulo: "Veterinários" }}
      />
      <FormularioVeterinario veterinario_id={null} valores_iniciais={{}} />
    </div>
  );
}
