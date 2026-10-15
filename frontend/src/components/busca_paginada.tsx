import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

type BarraBuscaProps = {
  busca: string;
  placeholder: string;
};

export function BarraBusca({ busca, placeholder }: BarraBuscaProps) {
  return (
    <form role="search" className="flex gap-3">
      <label className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-azul-marca focus-within:ring-2 focus-within:ring-azul-marca/20">
        <Search className="size-5 shrink-0 text-slate-400" />
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          name="busca"
          defaultValue={busca}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent text-texto-titulo outline-none placeholder:text-slate-400"
        />
      </label>
      <button
        type="submit"
        className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white hover:bg-azul-marca"
      >
        <Search className="size-4" />
        Buscar
      </button>
    </form>
  );
}

type PaginacaoProps = {
  caminho: string;
  pagina: number;
  tamanho: number;
  total: number;
  busca: string;
  rotulo_itens: string;
  parametros?: Record<string, string>;
};

function href_pagina(caminho: string, pagina: number, busca: string, parametros: Record<string, string> = {}): string {
  const consulta = new URLSearchParams(parametros);
  if (busca) {
    consulta.set("busca", busca);
  }
  if (pagina > 1) {
    consulta.set("pagina", String(pagina));
  }
  const texto = consulta.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

export function Paginacao({ caminho, pagina, tamanho, total, busca, rotulo_itens, parametros }: PaginacaoProps) {
  const total_paginas = Math.max(1, Math.ceil(total / tamanho));
  const primeiro = total === 0 ? 0 : (pagina - 1) * tamanho + 1;
  const ultimo = Math.min(pagina * tamanho, total);
  const estilo_botao =
    "flex size-9 items-center justify-center rounded-lg border border-borda bg-white text-texto-subtitulo hover:bg-destaque-suave";

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-texto-suave">
      <p>
        Mostrando {primeiro}–{ultimo} de {total} {rotulo_itens}
      </p>
      <div className="flex items-center gap-2">
        {pagina > 1 ? (
          <Link href={href_pagina(caminho, pagina - 1, busca, parametros)} aria-label="Página anterior" className={estilo_botao}>
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={`${estilo_botao} opacity-40`}>
            <ChevronLeft className="size-4" />
          </span>
        )}
        <span className="px-2 font-medium text-texto-titulo">
          {pagina} de {total_paginas}
        </span>
        {pagina < total_paginas ? (
          <Link href={href_pagina(caminho, pagina + 1, busca, parametros)} aria-label="Próxima página" className={estilo_botao}>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={`${estilo_botao} opacity-40`}>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}

export function ler_numero_pagina(valor: string | string[] | undefined): number {
  const numero = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

export function ler_texto(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
}
