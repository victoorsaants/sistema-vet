import type { Metadata } from "next";
import Image from "next/image";
import { PawPrint } from "lucide-react";

import FormularioLogin from "@/components/formulario_login";

export const metadata: Metadata = {
  title: "Entrar | AjuVet+",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { sessao } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex flex-col items-center overflow-hidden bg-[#ebf2fa] px-6 pt-10 lg:w-[42%] lg:pt-16">
        <PawPrint
          aria-hidden
          className="absolute top-10 right-8 size-20 rotate-12 text-sky-200"
          fill="currentColor"
          strokeWidth={0}
        />
        <PawPrint
          aria-hidden
          className="absolute top-56 left-4 size-16 -rotate-12 text-sky-200"
          fill="currentColor"
          strokeWidth={0}
        />
        <Image
          src="/brand/ajuvet-logo.png"
          alt="AjuVet+ — Sistema de Gestão Veterinária"
          width={967}
          height={891}
          preload
          className="relative w-56 lg:w-80"
        />
        <p className="relative mt-6 max-w-xs text-2xl leading-snug text-texto-titulo lg:text-3xl">
          Cuidando de quem sempre esteve ao seu lado.
        </p>
        <Image
          src="/brand/login-pets.jpg"
          alt="Cachorro golden retriever e gato lado a lado"
          width={640}
          height={458}
          loading="eager"
          className="relative mt-auto hidden w-full max-w-xl lg:block"
        />
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center bg-[#f7f8fc] px-4 py-10 sm:px-10">
        <div className="w-full max-w-2xl">
          <h1 className="text-center text-4xl font-semibold text-marinho">Bem-vindo ao AjuVet+</h1>
          <p className="mt-3 mb-10 text-center text-xl text-slate-600">
            Faça login para acessar o sistema.
          </p>
          <FormularioLogin sessao_expirada={sessao === "expirada"} />
          <p className="mt-16 text-center text-slate-500">
            AjuVet+ <span className="mx-2">|</span> Sistema de Gestão Veterinária
            <span className="mt-1 block">Mais organização para um cuidado melhor.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
