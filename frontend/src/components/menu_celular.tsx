"use client";

import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";

import { ConteudoMenu } from "@/components/menu_lateral";
import type { UsuarioLogado } from "@/lib/tipos_auth";

const TELA_COM_MENU_FIXO = "(min-width: 64rem)";

type MenuCelularProps = {
  usuario: UsuarioLogado;
};

export default function MenuCelular({ usuario }: MenuCelularProps) {
  const painel = useRef<HTMLDialogElement>(null);
  const fechar = () => painel.current?.close();

  useEffect(() => {
    const tela = window.matchMedia(TELA_COM_MENU_FIXO);
    const fechar_em_tela_grande = () => {
      if (tela.matches) {
        painel.current?.close();
      }
    };
    tela.addEventListener("change", fechar_em_tela_grande);
    return () => tela.removeEventListener("change", fechar_em_tela_grande);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        onClick={() => painel.current?.showModal()}
        className="rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white"
      >
        <Menu className="size-6" />
      </button>

      <dialog
        ref={painel}
        aria-label="Menu"
        onClick={(evento) => {
          if (evento.target === painel.current) {
            fechar();
          }
        }}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-y-auto bg-marinho-escuro text-white backdrop:bg-black/50"
      >
        <div className="relative flex min-h-full flex-col bg-gradient-to-b from-marinho to-marinho-escuro px-4 py-8">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={fechar}
            className="absolute top-3 right-3 rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" />
          </button>
          <ConteudoMenu usuario={usuario} ao_navegar={fechar} />
        </div>
      </dialog>
    </>
  );
}
