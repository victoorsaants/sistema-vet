"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, House, LogOut, PawPrint } from "lucide-react";

import MarcaAjuvet from "@/components/marca_ajuvet";
import { sair } from "@/lib/acoes_auth";
import { modulos_do_perfil } from "@/lib/modulos";
import { NOMES_PERFIL, type UsuarioLogado } from "@/lib/tipos_auth";

type ConteudoMenuProps = {
  usuario: UsuarioLogado;
  ao_navegar?: () => void;
};

export function ConteudoMenu({ usuario, ao_navegar }: ConteudoMenuProps) {
  const caminho_atual = usePathname();
  const itens_menu = [
    { titulo: "Início", href: "/", icone: House },
    ...modulos_do_perfil(usuario.perfil),
  ];

  return (
    <>
      <MarcaAjuvet />

      <nav className="mt-10 flex flex-col gap-1">
        {itens_menu.map(({ titulo, href, icone: Icone }) => {
          const ativo = href === "/" ? caminho_atual === "/" : caminho_atual === href || caminho_atual.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={ao_navegar}
              aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-lg transition-colors ${
                ativo
                  ? "bg-gradient-to-r from-azul-ativo to-azul-marca font-medium shadow-lg shadow-black/25"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              <Icone className="size-6 shrink-0" strokeWidth={2} />
              {titulo}
            </Link>
          );
        })}
      </nav>

      <PawPrint
        aria-hidden
        className="pointer-events-none mx-auto mt-auto size-36 shrink-0 text-white/5 tela-baixa:hidden"
        fill="currentColor"
        strokeWidth={0}
      />

      <div className="mt-6 flex flex-col gap-5 border-t border-azul-marca/60 px-2 pt-6">
        <Link
          href="/perfil"
          onClick={ao_navegar}
          title="Meu perfil"
          aria-current={caminho_atual === "/perfil" ? "page" : undefined}
          className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
            caminho_atual === "/perfil" ? "bg-white/15" : "hover:bg-white/10"
          }`}
        >
          <CircleUserRound className="size-11 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 leading-tight">
            <span className="sr-only">Meu perfil: </span>
            <p className="text-lg">{NOMES_PERFIL[usuario.perfil]}</p>
            <p className="text-white/80">{usuario.nome}</p>
          </div>
        </Link>
        <form action={sair}>
          <button
            type="submit"
            className="flex items-center gap-3 rounded-lg px-1 py-1 text-lg text-white/90 hover:text-white"
          >
            <LogOut className="size-6" />
            Sair
          </button>
        </form>
      </div>
    </>
  );
}

type MenuLateralProps = {
  usuario: UsuarioLogado;
};

export default function MenuLateral({ usuario }: MenuLateralProps) {
  return (
    <aside className="relative hidden w-72 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-marinho to-marinho-escuro px-4 py-8 text-white lg:flex">
      <ConteudoMenu usuario={usuario} />
    </aside>
  );
}
