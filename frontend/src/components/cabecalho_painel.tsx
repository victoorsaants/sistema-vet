import { CalendarDays, LogOut, PawPrint } from "lucide-react";

import MarcaAjuvet from "@/components/marca_ajuvet";
import Relogio from "@/components/relogio";
import { sair } from "@/lib/acoes_auth";

export default function CabecalhoPainel() {
  return (
    <header className="relative z-10">
      <div className="flex items-center justify-between bg-marinho px-4 py-3 lg:hidden">
        <MarcaAjuvet compacta />
        <form action={sair}>
          <button
            type="submit"
            aria-label="Sair"
            className="rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-6" />
          </button>
        </form>
      </div>

      <div className="hidden items-center justify-end gap-6 px-10 pt-6 text-texto-titulo sm:flex">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-7 text-texto-subtitulo" />
          <Relogio />
        </div>
        <span className="h-10 w-px bg-borda" />
        <div className="flex items-center gap-3">
          <PawPrint className="size-8 text-marinho" fill="currentColor" strokeWidth={0} />
          <div className="leading-tight">
            <p className="text-lg font-semibold">AjuVet+</p>
            <p className="text-sm text-texto-corpo">Clínica Veterinária</p>
          </div>
        </div>
      </div>
    </header>
  );
}
