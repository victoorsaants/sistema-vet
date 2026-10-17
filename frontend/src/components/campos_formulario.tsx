import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import type { Opcao } from "@/lib/opcoes_cadastro";

const ESTILO_CONTROLE =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo outline-none transition placeholder:text-slate-400 focus:border-azul-marca focus:ring-2 focus:ring-azul-marca/20 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:bg-rose-50/40 disabled:bg-slate-50";

type BaseCampo = {
  rotulo: string;
  nome: string;
  obrigatorio?: boolean;
  erro?: string;
  className?: string;
};

type MolduraCampoProps = BaseCampo & {
  children: ReactNode;
};

function MolduraCampo({ rotulo, nome, obrigatorio, erro, className, children }: MolduraCampoProps) {
  return (
    <div className={className}>
      <label htmlFor={nome} className="mb-1.5 block text-sm font-medium text-texto-titulo">
        {rotulo}
        {obrigatorio && <span className="text-rose-600"> *</span>}
      </label>
      {children}
      {erro && (
        <p id={`${nome}-erro`} className="mt-1 text-sm text-rose-600">
          {erro}
        </p>
      )}
    </div>
  );
}

function atributos_controle(nome: string, obrigatorio?: boolean, erro?: string) {
  return {
    id: nome,
    name: nome,
    required: obrigatorio,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? `${nome}-erro` : undefined,
  };
}

type CampoTextoProps = BaseCampo & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">;

export function CampoTexto({ rotulo, nome, obrigatorio, erro, className, ...entrada }: CampoTextoProps) {
  return (
    <MolduraCampo rotulo={rotulo} nome={nome} obrigatorio={obrigatorio} erro={erro} className={className}>
      <input {...entrada} {...atributos_controle(nome, obrigatorio, erro)} className={`h-11 ${ESTILO_CONTROLE}`} />
    </MolduraCampo>
  );
}

type CampoSelecaoProps = BaseCampo &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id"> & {
    opcoes: Opcao[];
    vazio?: string;
  };

export function CampoSelecao({
  rotulo,
  nome,
  obrigatorio,
  erro,
  className,
  opcoes,
  vazio = "Selecione",
  ...selecao
}: CampoSelecaoProps) {
  return (
    <MolduraCampo rotulo={rotulo} nome={nome} obrigatorio={obrigatorio} erro={erro} className={className}>
      <select {...selecao} {...atributos_controle(nome, obrigatorio, erro)} className={`h-11 ${ESTILO_CONTROLE}`}>
        <option value="">{vazio}</option>
        {opcoes.map(({ valor, rotulo: texto }) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
    </MolduraCampo>
  );
}

type CampoAreaTextoProps = BaseCampo & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">;

export function CampoAreaTexto({ rotulo, nome, obrigatorio, erro, className, ...area }: CampoAreaTextoProps) {
  return (
    <MolduraCampo rotulo={rotulo} nome={nome} obrigatorio={obrigatorio} erro={erro} className={className}>
      <textarea {...area} {...atributos_controle(nome, obrigatorio, erro)} className={`min-h-24 py-2 ${ESTILO_CONTROLE}`} />
    </MolduraCampo>
  );
}
