import Link from "next/link";
import { CircleAlert, Info, LoaderCircle, Save } from "lucide-react";

type BotoesFormularioProps = {
  href_cancelar: string;
  rotulo_salvar: string;
  enviando: boolean;
};

export function BotoesFormulario({ href_cancelar, rotulo_salvar, enviando }: BotoesFormularioProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="flex items-center gap-2 text-sm text-texto-suave">
        <Info className="size-4" />
        Campos com <span className="text-rose-600">*</span> são obrigatórios.
      </p>
      <div className="flex gap-3">
        <Link
          href={href_cancelar}
          className="flex h-11 items-center rounded-lg border border-azul-marca px-6 font-medium text-azul-marca hover:bg-destaque-suave"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={enviando}
          className="flex h-11 items-center gap-2 rounded-lg bg-azul-ativo px-6 font-medium text-white shadow-sm hover:bg-azul-marca disabled:opacity-70"
        >
          {enviando ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
          {enviando ? "Salvando..." : rotulo_salvar}
        </button>
      </div>
    </div>
  );
}

type AvisoProps = {
  tipo: "erro" | "sucesso";
  children: React.ReactNode;
};

export function Aviso({ tipo, children }: AvisoProps) {
  const estilo =
    tipo === "erro" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${estilo}`}>
      <CircleAlert className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
