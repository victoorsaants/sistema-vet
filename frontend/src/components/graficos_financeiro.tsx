import type { ResumoFinanceiro } from "@/lib/financeiro_api";
import { formatar_moeda, mes_abreviado } from "@/lib/opcoes_financeiro";

const LARGURA = 520;
const ALTURA = 250;
const MARGEM_ESQUERDA = 76;
const MARGEM_DIREITA = 30;
const MARGEM_TOPO = 14;
const MARGEM_BASE = 34;
const DIVISOES = 4;

const CORES_CATEGORIAS = ["#2697e4", "#e2508a", "#c9a227", "#f08a3c", "#8b6fd0", "#38bbc1"];
const MAXIMO_CATEGORIAS = 5;

const FORMATO_EIXO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function teto_redondo(valor: number): number {
  if (valor <= 0) {
    return 1000;
  }
  const potencia = 10 ** Math.floor(Math.log10(valor));
  const passo = [1, 2, 2.5, 5, 10].find((multiplo) => multiplo * potencia >= valor) ?? 10;
  return passo * potencia;
}

export function GraficoFluxo({ fluxo }: { fluxo: ResumoFinanceiro["fluxo"] }) {
  const maximo = teto_redondo(Math.max(...fluxo.flatMap(({ receitas, despesas }) => [receitas, despesas])));
  const largura_util = LARGURA - MARGEM_ESQUERDA - MARGEM_DIREITA;
  const altura_util = ALTURA - MARGEM_TOPO - MARGEM_BASE;
  const x = (indice: number) => MARGEM_ESQUERDA + (indice * largura_util) / Math.max(1, fluxo.length - 1);
  const y = (valor: number) => MARGEM_TOPO + (1 - valor / maximo) * altura_util;
  const linha = (chave: "receitas" | "despesas") =>
    fluxo.map((mes, indice) => `${indice === 0 ? "M" : "L"}${x(indice)},${y(mes[chave])}`).join(" ");
  const area = (chave: "receitas" | "despesas") =>
    `${linha(chave)} L${x(fluxo.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const descricao = fluxo
    .map((mes) => `${mes_abreviado(mes.mes)}: receitas ${formatar_moeda(mes.receitas)}, despesas ${formatar_moeda(mes.despesas)}`)
    .join("; ");

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={`Fluxo financeiro. ${descricao}`} className="h-auto w-full">
      <defs>
        <linearGradient id="area-receitas" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-receita)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-receita)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="area-despesas" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-despesa)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--color-despesa)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {Array.from({ length: DIVISOES + 1 }, (_, indice) => {
        const valor = (maximo / DIVISOES) * indice;
        return (
          <g key={indice}>
            <line x1={MARGEM_ESQUERDA} x2={LARGURA - MARGEM_DIREITA} y1={y(valor)} y2={y(valor)} stroke="var(--color-borda)" />
            <text x={MARGEM_ESQUERDA - 8} y={y(valor) + 4} textAnchor="end" className="fill-texto-suave text-[12px]">
              {FORMATO_EIXO.format(valor)}
            </text>
          </g>
        );
      })}
      <path d={area("receitas")} fill="url(#area-receitas)" />
      <path d={area("despesas")} fill="url(#area-despesas)" />
      <path d={linha("receitas")} fill="none" stroke="var(--color-receita)" strokeWidth="2.5" />
      <path d={linha("despesas")} fill="none" stroke="var(--color-despesa)" strokeWidth="2.5" />
      {fluxo.map((mes, indice) => (
        <g key={mes.mes}>
          <circle cx={x(indice)} cy={y(mes.receitas)} r="4" fill="var(--color-receita)" />
          <circle cx={x(indice)} cy={y(mes.despesas)} r="4" fill="var(--color-despesa)" />
          <text x={x(indice)} y={ALTURA - 10} textAnchor="middle" className="fill-texto-corpo text-[13px]">
            {mes_abreviado(mes.mes)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function GraficoCategorias({
  categorias,
  total,
}: {
  categorias: ResumoFinanceiro["despesas_por_categoria"];
  total: number;
}) {
  if (categorias.length === 0) {
    return <p className="py-10 text-center text-texto-suave">Nenhuma despesa paga neste mês.</p>;
  }

  const principais = categorias.slice(0, MAXIMO_CATEGORIAS);
  const restantes = categorias.slice(MAXIMO_CATEGORIAS);
  const fatias = restantes.length
    ? [
        ...principais,
        {
          categoria: "Outras",
          valor: restantes.reduce((soma, { valor }) => soma + valor, 0),
          percentual: Math.round(restantes.reduce((soma, { percentual }) => soma + percentual, 0) * 10) / 10,
        },
      ]
    : principais;
  const raio = 58;
  const circunferencia = 2 * Math.PI * raio;
  const comprimentos = fatias.map(({ valor }) => (valor / total) * circunferencia);
  const inicios = comprimentos.map((_, indice) => comprimentos.slice(0, indice).reduce((soma, atual) => soma + atual, 0));

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 160 160" aria-hidden className="size-full -rotate-90">
          {fatias.map(({ categoria }, indice) => (
            <circle
              key={categoria}
              cx="80"
              cy="80"
              r={raio}
              fill="none"
              stroke={CORES_CATEGORIAS[indice % CORES_CATEGORIAS.length]}
              strokeWidth="22"
              strokeDasharray={`${comprimentos[indice]} ${circunferencia - comprimentos[indice]}`}
              strokeDashoffset={-inicios[indice]}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-texto-titulo">{formatar_moeda(total)}</span>
          <span className="text-sm text-texto-suave">Total</span>
        </div>
      </div>
      <ul className="flex min-w-44 flex-1 flex-col gap-2">
        {fatias.map(({ categoria, percentual }, indice) => (
          <li key={categoria} className="flex items-center gap-2 text-sm text-texto-titulo">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: CORES_CATEGORIAS[indice % CORES_CATEGORIAS.length] }}
            />
            <span className="flex-1">{categoria}</span>
            <span className="font-medium">{percentual.toLocaleString("pt-BR")}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
