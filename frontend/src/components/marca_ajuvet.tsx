import Image from "next/image";

type MarcaAjuvetProps = {
  compacta?: boolean;
};

export default function MarcaAjuvet({ compacta = false }: MarcaAjuvetProps) {
  return (
    <div className={`flex items-center ${compacta ? "gap-3" : "flex-col gap-2"}`}>
      <div
        className={`flex items-center justify-center rounded-full bg-white shadow-lg shadow-black/20 ${
          compacta ? "size-10 p-1.5" : "size-20 p-3"
        }`}
      >
        <Image
          src="/brand/ajuvet-simbolo.png"
          alt=""
          width={599}
          height={534}
          loading="eager"
          className="h-auto w-full"
        />
      </div>
      <div className={compacta ? "" : "text-center"}>
        <p
          className={`font-bold leading-none tracking-tight text-white ${
            compacta ? "text-2xl" : "text-4xl"
          }`}
        >
          Aju<span className="text-sky-400">Vet+</span>
        </p>
        {!compacta && (
          <p className="mt-2 flex items-center gap-2 text-xs text-white/90">
            <span className="h-px w-6 bg-sky-400" />
            Sistema de Gestão Veterinária
            <span className="h-px w-6 bg-sky-400" />
          </p>
        )}
      </div>
    </div>
  );
}
