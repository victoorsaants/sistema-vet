import type { Metadata } from "next";
import Link from "next/link";
import { FileClock, PawPrint, UserRound } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioAnimal from "@/components/formulario_animal";
import SecaoCartao from "@/components/secao_cartao";
import { obter_animal, type Animal } from "@/lib/cadastros_api";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { obter_usuario_logado } from "@/lib/dal";
import { calcular_idade, formatar_data, formatar_numero, formatar_telefone } from "@/lib/formatadores";
import { NOMES_PORTE, NOMES_SEXO } from "@/lib/opcoes_cadastro";

export const metadata: Metadata = {
  title: "Animal | AjuVet+",
};

function valores_do_animal(animal: Animal): Record<string, string> {
  return {
    tutor_id: animal.tutor.id,
    tutor_id_nome: animal.tutor.nome,
    tutor_id_detalhe: formatar_telefone(animal.tutor.telefone_principal),
    nome: animal.nome,
    especie: animal.especie,
    raca: animal.raca ?? "",
    sexo: animal.sexo ?? "",
    data_nascimento: animal.data_nascimento ?? "",
    cor_pelagem: animal.cor_pelagem ?? "",
    peso_kg: formatar_numero(animal.peso_kg),
    altura_cm: formatar_numero(animal.altura_cm),
    largura_cm: formatar_numero(animal.largura_cm),
    porte: animal.porte ?? "",
    microchip: animal.microchip ?? "",
    castrado: animal.castrado === null ? "" : animal.castrado ? "sim" : "nao",
    observacoes: animal.observacoes ?? "",
  };
}

function descrever_castrado(castrado: boolean | null): string {
  if (castrado === null) {
    return "Não informado";
  }
  return castrado ? "Sim" : "Não";
}

function FichaAnimal({ animal }: { animal: Animal }) {
  const medida = (valor: number | null, unidade: string) => (valor ? `${formatar_numero(valor)} ${unidade}` : "—");
  const itens: [string, string][] = [
    ["Espécie", animal.especie],
    ["Raça", animal.raca ?? "—"],
    ["Sexo", animal.sexo ? NOMES_SEXO[animal.sexo] : "—"],
    ["Nascimento", formatar_data(animal.data_nascimento)],
    ["Idade", calcular_idade(animal.data_nascimento)],
    ["Cor / pelagem", animal.cor_pelagem ?? "—"],
    ["Peso", medida(animal.peso_kg, "kg")],
    ["Altura", medida(animal.altura_cm, "cm")],
    ["Largura", medida(animal.largura_cm, "cm")],
    ["Porte", animal.porte ? NOMES_PORTE[animal.porte] : "—"],
    ["Microchip", animal.microchip ?? "—"],
    ["Castrado", descrever_castrado(animal.castrado)],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <SecaoCartao titulo="Ficha do animal" icone={PawPrint} cor="bg-modulo-animais">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="text-sm text-texto-suave">{rotulo}</dt>
              <dd className="font-medium text-texto-titulo">{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 rounded-xl bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Alergias e observações</p>
          <p className="mt-1 whitespace-pre-line text-amber-900">{animal.observacoes ?? "Nenhuma observação registrada."}</p>
        </div>
      </SecaoCartao>
      <SecaoCartao titulo="Tutor" icone={UserRound} cor="bg-modulo-tutores">
        <p className="text-lg font-semibold text-texto-titulo">{animal.tutor.nome}</p>
        <p className="text-texto-corpo">{formatar_telefone(animal.tutor.telefone_principal)}</p>
      </SecaoCartao>
    </div>
  );
}

export default async function AnimalPage({ params, searchParams }: PageProps<"/animais/[id]">) {
  const { id } = await params;
  const salvo = ler_texto((await searchParams).salvo);
  const [usuario, animal] = await Promise.all([obter_usuario_logado(), carregar_ou_404(obter_animal(id))]);
  const pode_editar = usuario.perfil === "recepcao";

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={animal.nome}
        descricao={[animal.especie, animal.raca, `Tutor: ${animal.tutor.nome}`].filter(Boolean).join(" · ")}
        voltar={{ href: "/animais", rotulo: "Animais" }}
        acao={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/historico/${animal.id}`}
              className="flex h-10 items-center gap-2 rounded-lg bg-azul-ativo px-4 font-medium text-white hover:bg-azul-marca"
            >
              <FileClock className="size-4" />
              Histórico clínico
            </Link>
            {pode_editar && (
              <Link
                href={`/tutores/${animal.tutor.id}`}
                className="flex h-10 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
              >
                <UserRound className="size-4" />
                Ver tutor
              </Link>
            )}
          </div>
        }
      />

      {salvo === "criado" && <Aviso tipo="sucesso">Animal cadastrado.</Aviso>}
      {salvo === "atualizado" && <Aviso tipo="sucesso">Alterações salvas.</Aviso>}

      {pode_editar ? (
        <FormularioAnimal
          key={animal.atualizado_em}
          animal_id={animal.id}
          valores_iniciais={valores_do_animal(animal)}
          href_cancelar="/animais"
        />
      ) : (
        <FichaAnimal animal={animal} />
      )}
    </div>
  );
}
