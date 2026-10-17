import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SecaoCartaoProps = {
  titulo: string;
  descricao?: string;
  icone: LucideIcon;
  cor?: string;
  acao?: ReactNode;
  children: ReactNode;
};

export default function SecaoCartao({
  titulo,
  descricao,
  icone: Icone,
  cor = "bg-azul-marca",
  acao,
  children,
}: SecaoCartaoProps) {
  return (
    <section className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-white ${cor}`}>
          <Icone className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-texto-titulo">{titulo}</h2>
          {descricao && <p className="text-sm text-texto-suave">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}
