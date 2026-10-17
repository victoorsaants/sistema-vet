import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type CabecalhoPaginaProps = {
  titulo: string;
  descricao: string;
  voltar?: { href: string; rotulo: string };
  acao?: ReactNode;
};

export default function CabecalhoPagina({ titulo, descricao, voltar, acao }: CabecalhoPaginaProps) {
  return (
    <header className="relative mt-6 mb-8 flex flex-wrap items-end justify-between gap-4 sm:mt-2">
      <div>
        {voltar && (
          <Link
            href={voltar.href}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-texto-subtitulo hover:text-azul-marca"
          >
            <ChevronLeft className="size-4" />
            {voltar.rotulo}
          </Link>
        )}
        <h1 className="text-3xl font-bold text-texto-titulo sm:text-4xl">{titulo}</h1>
        <p className="mt-2 text-lg text-texto-corpo">{descricao}</p>
      </div>
      {acao}
    </header>
  );
}
