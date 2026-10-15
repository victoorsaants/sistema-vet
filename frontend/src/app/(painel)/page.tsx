import Image from "next/image";
import Link from "next/link";
import { BellRing, ChevronRight, Heart, PawPrint } from "lucide-react";

import CardModulo from "@/components/card_modulo";
import ListaAgendamentos from "@/components/lista_agendamentos";
import { listar_agendamentos } from "@/lib/agenda_api";
import { obter_usuario_logado } from "@/lib/dal";
import { modulos_do_perfil } from "@/lib/modulos";
import { obter_resumo_notificacoes } from "@/lib/notificacoes_api";
import type { Perfil } from "@/lib/tipos_auth";

const LIMITE_PROXIMOS = 5;

const BOAS_VINDAS: Record<Perfil, { titulo: string; descricao: string }> = {
  recepcao: {
    titulo: "Boas-vindas ao AjuVet+",
    descricao:
      "Aqui você gerencia os atendimentos, cadastros e agendamentos da nossa clínica veterinária.",
  },
  veterinario: {
    titulo: "Boas-vindas ao painel veterinário",
    descricao:
      "Acesse as informações dos animais, registre observações clínicas e acompanhe o histórico de saúde dos pacientes.",
  },
};

export default async function InicioPage() {
  const usuario = await obter_usuario_logado();
  const boas_vindas = BOAS_VINDAS[usuario.perfil];
  const proximos =
    usuario.perfil === "veterinario"
      ? (await listar_agendamentos({ status: ["agendado", "confirmado", "em_atendimento"] })).slice(0, LIMITE_PROXIMOS)
      : null;
  const falhas = usuario.perfil === "recepcao" ? (await obter_resumo_notificacoes()).com_falha : 0;

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 sm:px-10">
      <section className="relative mt-6 flex items-center justify-between gap-6 sm:mt-2">
        <svg
          aria-hidden
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
          className="pointer-events-none absolute -right-10 bottom-0 hidden h-36 w-3/5 text-destaque-claro md:block"
        >
          <path
            d="M0 160 C 120 150, 180 60, 330 70 S 520 10, 600 0 L 600 160 Z"
            fill="currentColor"
          />
        </svg>

        <div className="relative max-w-xl">
          <h1 className="text-4xl font-bold text-texto-titulo sm:text-5xl">
            Olá, {usuario.nome}!
          </h1>
          <p className="mt-2 text-2xl font-semibold text-texto-titulo">
            {boas_vindas.titulo}
          </p>
          <p className="mt-3 text-lg text-texto-corpo">
            {boas_vindas.descricao}
          </p>
        </div>

        <div className="relative mr-6 hidden shrink-0 items-start md:flex">
          <Image
            src="/brand/ajuvet-simbolo.png"
            alt=""
            width={599}
            height={534}
            loading="eager"
            className="w-36 drop-shadow-sm"
          />
          <Heart
            aria-hidden
            className="-ml-2 size-9 text-azul-marca"
            fill="currentColor"
            strokeWidth={0}
          />
        </div>
      </section>

      {falhas > 0 && (
        <Link
          href="/notificacoes?status=falhou"
          className="mt-8 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 hover:bg-rose-100"
        >
          <BellRing className="size-5 shrink-0" />
          <span className="flex-1">
            {falhas === 1 ? "1 mensagem para tutor não foi enviada." : `${falhas} mensagens para tutores não foram enviadas.`}{" "}
            Confira o e-mail cadastrado e reenvie.
          </span>
          <ChevronRight className="size-5" />
        </Link>
      )}

      <section
        aria-label="Módulos do sistema"
        className="mt-8 mb-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
      >
        {modulos_do_perfil(usuario.perfil)
          .filter((modulo) => modulo.exibir_no_inicio !== false)
          .map((modulo) => (
            <CardModulo key={modulo.href} modulo={modulo} />
          ))}
      </section>

      {proximos && (
        <div className="mb-12">
          <ListaAgendamentos
            titulo="Próximos atendimentos"
            agendamentos={proximos}
            pode_alterar={false}
            pode_atender
            mostrar_veterinario={false}
            vazio="Nenhum atendimento agendado para você."
          />
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-borda pt-6">
        <p className="text-texto-corpo">
          <span className="font-semibold text-texto-subtitulo">AjuVet+</span>
          <span className="mx-3 text-borda">|</span>
          Sistema de Gestão Veterinária
        </p>
        <p className="flex items-center gap-2 font-manuscrita text-2xl text-azul-marca -rotate-6">
          Pets saudáveis, vidas mais felizes!
          <PawPrint className="size-6 rotate-6" fill="currentColor" strokeWidth={0} />
        </p>
      </footer>
    </div>
  );
}
