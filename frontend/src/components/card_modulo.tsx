import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Modulo } from "@/lib/modulos";

type CardModuloProps = {
  modulo: Modulo;
};

export default function CardModulo({ modulo }: CardModuloProps) {
  const { titulo, descricao, href, icone: Icone, cor } = modulo;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-borda bg-superficie p-6 shadow-sm shadow-sky-900/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-900/10 focus-visible:outline-2 focus-visible:outline-azul-marca"
    >
      <span
        className={`flex size-20 items-center justify-center rounded-full text-white shadow-md ${cor}`}
      >
        <Icone className="size-10" strokeWidth={2} />
      </span>
      <h2 className="mt-5 text-2xl font-semibold text-texto-titulo">{titulo}</h2>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-texto-corpo">{descricao}</p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destaque-suave text-texto-subtitulo transition group-hover:bg-azul-marca group-hover:text-white">
          <ChevronRight className="size-5" strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  );
}
