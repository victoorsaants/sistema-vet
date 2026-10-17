"use client";

import { useEffect, useId, useState } from "react";
import { LoaderCircle, Search, X, type LucideIcon } from "lucide-react";

export type ItemBusca = {
  id: string;
  nome: string;
  detalhe: string;
};

type SeletorBuscaProps = {
  rotulo: string;
  nome: string;
  endpoint: string;
  placeholder: string;
  icone: LucideIcon;
  inicial: ItemBusca | null;
  erro?: string;
  className?: string;
  obrigatorio?: boolean;
  ao_selecionar?: (item: ItemBusca | null) => void;
};

const ATRASO_BUSCA_MS = 300;
const MINIMO_CARACTERES = 2;

export default function SeletorBusca({
  rotulo,
  nome,
  endpoint,
  placeholder,
  icone: Icone,
  inicial,
  erro,
  className,
  obrigatorio = true,
  ao_selecionar,
}: SeletorBuscaProps) {
  const id_lista = useId();
  const id_campo = `${nome}_busca`;
  const [selecionado, definir_selecionado] = useState<ItemBusca | null>(inicial);
  const [termo, definir_termo] = useState("");
  const [sugestoes, definir_sugestoes] = useState<ItemBusca[]>([]);
  const [carregando, definir_carregando] = useState(false);
  const [falhou, definir_falhou] = useState(false);

  useEffect(() => {
    const termo_limpo = termo.trim();
    if (selecionado || termo_limpo.length < MINIMO_CARACTERES) {
      return;
    }
    const controle = new AbortController();
    const temporizador = setTimeout(async () => {
      definir_carregando(true);
      definir_falhou(false);
      try {
        const resposta = await fetch(`${endpoint}?busca=${encodeURIComponent(termo_limpo)}`, {
          signal: controle.signal,
        });
        if (!resposta.ok) {
          throw new Error(String(resposta.status));
        }
        definir_sugestoes(await resposta.json());
      } catch {
        if (!controle.signal.aborted) {
          definir_falhou(true);
          definir_sugestoes([]);
        }
      } finally {
        if (!controle.signal.aborted) {
          definir_carregando(false);
        }
      }
    }, ATRASO_BUSCA_MS);
    return () => {
      controle.abort();
      clearTimeout(temporizador);
    };
  }, [termo, selecionado, endpoint]);

  function selecionar(item: ItemBusca | null) {
    definir_selecionado(item);
    definir_termo("");
    definir_sugestoes([]);
    ao_selecionar?.(item);
  }

  const mostrar_lista = !selecionado && termo.trim().length >= MINIMO_CARACTERES && !carregando;

  return (
    <div className={className}>
      <label htmlFor={id_campo} className="mb-1.5 block text-sm font-medium text-texto-titulo">
        {rotulo}
        {obrigatorio && <span className="text-rose-600"> *</span>}
      </label>
      <input type="hidden" name={nome} value={selecionado?.id ?? ""} />
      <input type="hidden" name={`${nome}_nome`} value={selecionado?.nome ?? ""} />
      <input type="hidden" name={`${nome}_detalhe`} value={selecionado?.detalhe ?? ""} />

      {selecionado ? (
        <div className="flex items-center gap-3 rounded-lg border border-azul-marca/40 bg-destaque-suave px-4 py-2.5">
          <Icone className="size-5 shrink-0 text-texto-subtitulo" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-texto-titulo">{selecionado.nome}</p>
            <p className="truncate text-sm text-texto-suave">{selecionado.detalhe}</p>
          </div>
          <button
            type="button"
            onClick={() => selecionar(null)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-texto-subtitulo hover:bg-white"
          >
            <X className="size-4" />
            Trocar
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            className={`flex items-center gap-3 rounded-lg border bg-white px-3 focus-within:border-azul-marca focus-within:ring-2 focus-within:ring-azul-marca/20 ${
              erro ? "border-rose-400" : "border-slate-200"
            }`}
          >
            <Search className="size-5 shrink-0 text-slate-400" />
            <input
              id={id_campo}
              type="search"
              role="combobox"
              aria-expanded={mostrar_lista}
              aria-controls={id_lista}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? `${nome}-erro` : undefined}
              autoComplete="off"
              value={termo}
              onChange={(evento) => definir_termo(evento.target.value)}
              placeholder={placeholder}
              className="h-11 w-full bg-transparent text-texto-titulo outline-none placeholder:text-slate-400"
            />
            {carregando && <LoaderCircle className="size-5 animate-spin text-slate-400" />}
          </div>

          {mostrar_lista && (
            <ul
              id={id_lista}
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-borda bg-white py-1 shadow-lg"
            >
              {falhou && <li className="px-4 py-3 text-sm text-rose-600">Não foi possível buscar.</li>}
              {!falhou && sugestoes.length === 0 && (
                <li className="px-4 py-3 text-sm text-texto-suave">Nenhum resultado encontrado.</li>
              )}
              {sugestoes.map((item) => (
                <li key={item.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => selecionar(item)}
                    className="w-full px-4 py-2.5 text-left hover:bg-destaque-suave"
                  >
                    <span className="block font-medium text-texto-titulo">{item.nome}</span>
                    <span className="block text-sm text-texto-suave">{item.detalhe}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {erro && (
        <p id={`${nome}-erro`} className="mt-1 text-sm text-rose-600">
          {erro}
        </p>
      )}
    </div>
  );
}
