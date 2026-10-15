import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import { ler_texto } from "@/components/busca_paginada";
import CabecalhoPagina from "@/components/cabecalho_pagina";
import FormularioAcessoVeterinario from "@/components/formulario_acesso_veterinario";
import FormularioVeterinario from "@/components/formulario_veterinario";
import { carregar_ou_404 } from "@/lib/carregar_cadastro";
import { formatar_telefone } from "@/lib/formatadores";
import { obter_cadastro_veterinario, type CadastroVeterinario } from "@/lib/veterinarios_api";

export const metadata: Metadata = {
  title: "Veterinário | AjuVet+",
};

const MENSAGENS_SALVO: Record<string, string> = {
  criado: "Veterinário cadastrado.",
  atualizado: "Alterações salvas.",
  acesso: "Acesso atualizado.",
};

function valores_do_veterinario(veterinario: CadastroVeterinario): Record<string, string> {
  return {
    nome: veterinario.nome,
    crmv: veterinario.crmv,
    especialidade: veterinario.especialidade ?? "",
    telefone: formatar_telefone(veterinario.telefone),
    email: veterinario.email ?? "",
    ativo: veterinario.ativo ? "sim" : "nao",
  };
}

export default async function VeterinarioPage({ params, searchParams }: PageProps<"/veterinarios/[id]">) {
  const { id } = await params;
  const salvo = ler_texto((await searchParams).salvo);
  const veterinario = await carregar_ou_404(obter_cadastro_veterinario(id));
  const descricao = [veterinario.crmv, veterinario.especialidade, veterinario.ativo ? null : "Inativo"]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-10">
      <CabecalhoPagina
        titulo={veterinario.nome}
        descricao={descricao}
        voltar={{ href: "/veterinarios", rotulo: "Veterinários" }}
        acao={
          veterinario.ativo && (
            <Link
              href={`/agendamentos/expediente?veterinario=${veterinario.id}`}
              className="flex h-10 items-center gap-2 rounded-lg border border-azul-marca px-4 font-medium text-azul-marca hover:bg-destaque-suave"
            >
              <CalendarClock className="size-4" />
              Expediente e folgas
            </Link>
          )
        }
      />

      {MENSAGENS_SALVO[salvo] && <Aviso tipo="sucesso">{MENSAGENS_SALVO[salvo]}</Aviso>}
      {veterinario.ativo && !veterinario.acesso && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          Este veterinário ainda não consegue entrar no sistema. Crie o acesso abaixo.
        </p>
      )}
      {veterinario.agendamentos_futuros > 0 && (
        <p className="text-sm text-texto-suave">
          {veterinario.agendamentos_futuros} agendamento(s) futuro(s) com este veterinário.
        </p>
      )}

      <FormularioVeterinario
        key={veterinario.atualizado_em}
        veterinario_id={veterinario.id}
        valores_iniciais={valores_do_veterinario(veterinario)}
      />
      <FormularioAcessoVeterinario
        key={veterinario.acesso?.email ?? "sem-acesso"}
        veterinario_id={veterinario.id}
        email_atual={veterinario.acesso?.email ?? null}
      />
    </div>
  );
}
