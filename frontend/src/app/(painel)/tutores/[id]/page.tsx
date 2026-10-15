import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PawPrint, Plus } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioTutor from "@/components/formulario_tutor";
import SecaoCartao from "@/components/secao_cartao";
import { listar_animais, obter_tutor, type Tutor } from "@/lib/cadastros_api";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { calcular_idade, formatar_cep, formatar_cpf, formatar_telefone } from "@/lib/formatadores";

export const metadata: Metadata = {
  title: "Tutor | AjuVet+",
};

function valores_do_tutor(tutor: Tutor): Record<string, string> {
  return {
    nome: tutor.nome,
    cpf: formatar_cpf(tutor.cpf),
    data_nascimento: tutor.data_nascimento ?? "",
    telefone_principal: formatar_telefone(tutor.telefone_principal),
    telefone_secundario: formatar_telefone(tutor.telefone_secundario),
    email: tutor.email ?? "",
    cep: formatar_cep(tutor.cep),
    endereco: tutor.endereco ?? "",
    bairro: tutor.bairro ?? "",
    cidade: tutor.cidade ?? "",
    estado: tutor.estado ?? "",
    como_conheceu: tutor.como_conheceu ?? "",
  };
}

export default async function TutorPage({ params, searchParams }: PageProps<"/tutores/[id]">) {
  const { id } = await params;
  const salvo = ler_texto((await searchParams).salvo);
  const [tutor, animais] = await Promise.all([
    carregar_ou_404(obter_tutor(id)),
    carregar_ou_404(listar_animais({ tutor_id: id, tamanho: 100 })),
  ]);
  const href_novo_animal = `/animais/novo?tutor_id=${tutor.id}`;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={tutor.nome}
        descricao="Consulte e atualize os dados do tutor e veja os animais vinculados."
        voltar={{ href: "/tutores", rotulo: "Tutores" }}
      />

      {salvo === "criado" && (
        <Aviso tipo="sucesso">
          Tutor cadastrado.{" "}
          <Link href={href_novo_animal} className="font-semibold underline">
            Cadastre agora o primeiro animal dele.
          </Link>
        </Aviso>
      )}
      {salvo === "atualizado" && <Aviso tipo="sucesso">Alterações salvas.</Aviso>}

      <SecaoCartao
        titulo="Animais do tutor"
        descricao={`${animais.total} ${animais.total === 1 ? "animal vinculado" : "animais vinculados"}`}
        icone={PawPrint}
        cor="bg-modulo-animais"
        acao={
          <Link
            href={href_novo_animal}
            className="flex h-10 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
          >
            <Plus className="size-4" />
            Cadastrar animal
          </Link>
        }
      >
        {animais.itens.length === 0 ? (
          <p className="text-texto-suave">Nenhum animal cadastrado para este tutor.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {animais.itens.map((animal) => (
              <li key={animal.id}>
                <Link
                  href={`/animais/${animal.id}`}
                  className="flex items-center gap-3 rounded-xl border border-borda p-4 hover:bg-fundo"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-modulo-animais/15 text-modulo-animais">
                    <PawPrint className="size-5" fill="currentColor" strokeWidth={0} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-texto-titulo">{animal.nome}</span>
                    <span className="block text-sm text-texto-suave">
                      {[animal.especie, animal.raca, calcular_idade(animal.data_nascimento)]
                        .filter((parte) => parte && parte !== "—")
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-texto-subtitulo" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SecaoCartao>

      <FormularioTutor
        key={tutor.atualizado_em}
        tutor_id={tutor.id}
        valores_iniciais={valores_do_tutor(tutor)}
      />
    </div>
  );
}
