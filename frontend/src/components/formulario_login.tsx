"use client";

import { useActionState, useState } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { entrar, type EstadoLogin } from "@/lib/acoes_auth";
import type { Perfil } from "@/lib/tipos_auth";

const ESTADO_INICIAL: EstadoLogin = { erro: null, email: "" };

type OpcaoPerfil = {
  perfil: Perfil;
  titulo: string;
  icone: LucideIcon;
  estilo: string;
  estilo_selecionado: string;
};

const OPCOES_PERFIL: OpcaoPerfil[] = [
  {
    perfil: "recepcao",
    titulo: "Recepção",
    icone: UserRound,
    estilo: "border-sky-200 bg-sky-50 text-[#0574c5]",
    estilo_selecionado: "ring-2 ring-[#0574c5]",
  },
  {
    perfil: "veterinario",
    titulo: "Veterinário",
    icone: Stethoscope,
    estilo: "border-teal-200 bg-teal-50 text-[#126e6e]",
    estilo_selecionado: "ring-2 ring-[#126e6e]",
  },
];

type FormularioLoginProps = {
  sessao_expirada: boolean;
};

export default function FormularioLogin({ sessao_expirada }: FormularioLoginProps) {
  const [estado, enviar, enviando] = useActionState(entrar, ESTADO_INICIAL);
  const [mostrar_senha, definir_mostrar_senha] = useState(false);
  const [perfil, definir_perfil] = useState<Perfil | null>(null);

  const aviso = estado.erro ?? (sessao_expirada ? "Sua sessão expirou. Entre novamente." : null);

  return (
    <form
      action={enviar}
      className="flex flex-col gap-5 rounded-2xl border border-borda bg-superficie p-6 shadow-sm sm:p-10"
    >
      <input type="hidden" name="perfil" value={perfil ?? ""} />

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 focus-within:border-azul-marca focus-within:ring-2 focus-within:ring-azul-marca/20">
        <UserRound className="size-6 shrink-0 text-slate-500" />
        <span className="sr-only">Usuário (e-mail)</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="Usuário"
          defaultValue={estado.email}
          required
          className="h-14 w-full bg-transparent text-lg text-texto-titulo outline-none placeholder:text-slate-400"
        />
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 focus-within:border-azul-marca focus-within:ring-2 focus-within:ring-azul-marca/20">
        <LockKeyhole className="size-6 shrink-0 text-slate-500" />
        <span className="sr-only">Senha</span>
        <input
          name="senha"
          type={mostrar_senha ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Senha"
          required
          className="h-14 w-full bg-transparent text-lg text-texto-titulo outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => definir_mostrar_senha(!mostrar_senha)}
          aria-label={mostrar_senha ? "Esconder senha" : "Mostrar senha"}
          className="rounded-md p-1 text-slate-500 hover:text-texto-titulo"
        >
          {mostrar_senha ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
        </button>
      </label>

      {aviso && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-rose-700">
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex h-14 items-center justify-center gap-3 rounded-xl bg-[#0a4571] text-xl font-semibold text-white shadow-md transition hover:bg-marinho disabled:opacity-70"
      >
        {enviando ? (
          <LoaderCircle className="size-6 animate-spin" />
        ) : (
          <LogIn className="size-6" />
        )}
        {enviando ? "Entrando..." : "Entrar"}
      </button>

      <div className="flex items-center gap-4 text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        Ou
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Perfil de acesso</legend>
        {OPCOES_PERFIL.map(({ perfil: valor, titulo, icone: Icone, estilo, estilo_selecionado }) => {
          const selecionado = perfil === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={selecionado}
              onClick={() => definir_perfil(selecionado ? null : valor)}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition hover:brightness-[0.98] ${estilo} ${
                selecionado ? estilo_selecionado : ""
              }`}
            >
              <Icone className="size-9 shrink-0" fill="currentColor" fillOpacity={0.15} />
              <span className="flex-1 leading-tight">
                <span className="block text-slate-600">Acessar como</span>
                <span className="block text-xl font-semibold">{titulo}</span>
              </span>
              <ChevronRight className="size-5 shrink-0" />
            </button>
          );
        })}
      </fieldset>
    </form>
  );
}
