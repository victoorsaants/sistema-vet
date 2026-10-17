"use client";

import { useSyncExternalStore } from "react";

const MILISSEGUNDOS_POR_MINUTO = 60_000;

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const FORMATO_HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function assinar_relogio(notificar: () => void): () => void {
  const intervalo = setInterval(notificar, 1000);
  return () => clearInterval(intervalo);
}

function obter_minuto_atual(): number {
  return Math.floor(Date.now() / MILISSEGUNDOS_POR_MINUTO);
}

function obter_minuto_servidor(): null {
  return null;
}

export default function Relogio() {
  const minuto = useSyncExternalStore(
    assinar_relogio,
    obter_minuto_atual,
    obter_minuto_servidor,
  );

  if (minuto === null) {
    return <div className="h-11 w-44" />;
  }

  const agora = new Date(minuto * MILISSEGUNDOS_POR_MINUTO);

  return (
    <time dateTime={agora.toISOString()} className="leading-snug">
      <span className="block">{FORMATO_DATA.format(agora)}</span>
      <span className="block">{FORMATO_HORA.format(agora)}</span>
    </time>
  );
}
