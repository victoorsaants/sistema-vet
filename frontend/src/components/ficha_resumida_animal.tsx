import type { ReactNode } from "react";
import { Mail, MapPin, PawPrint, Phone, TriangleAlert, UserRound } from "lucide-react";

import type { Atendimento } from "@/lib/atendimentos_api";
import { calcular_idade, formatar_cep, formatar_data, formatar_numero, formatar_telefone } from "@/lib/formatadores";
import { NOMES_PORTE, NOMES_SEXO } from "@/lib/opcoes_cadastro";

type FichaResumidaAnimalProps = {
  animal: Atendimento["animal"];
  tutor?: Atendimento["tutor"];
  acao?: ReactNode;
};

export default function FichaResumidaAnimal({ animal, tutor, acao }: FichaResumidaAnimalProps) {
  const dados = [
    animal.peso_kg ? `Peso: ${formatar_numero(animal.peso_kg)} kg` : null,
    animal.altura_cm ? `Altura: ${formatar_numero(animal.altura_cm)} cm` : null,
    animal.data_nascimento ? `Idade: ${calcular_idade(animal.data_nascimento)}` : null,
    animal.porte ? `Porte: ${NOMES_PORTE[animal.porte]}` : null,
    animal.data_nascimento ? `Nascimento: ${formatar_data(animal.data_nascimento)}` : null,
    animal.microchip ? `Microchip: ${animal.microchip}` : null,
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-borda bg-superficie p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
      <div className="flex flex-1 gap-5">
        <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-modulo-animais/15 text-modulo-animais">
          <PawPrint className="size-12" fill="currentColor" strokeWidth={0} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-texto-titulo">{animal.nome}</h2>
            {animal.sexo && <span className="text-texto-corpo">{NOMES_SEXO[animal.sexo]}</span>}
            <span className="rounded-full bg-azul-ativo px-3 py-0.5 text-sm font-medium text-white">{animal.especie}</span>
          </div>
          {animal.raca && <p className="font-semibold text-texto-subtitulo">{animal.raca}</p>}
          <p className="mt-1 text-texto-corpo">{dados.join("  ·  ")}</p>
          {animal.observacoes && (
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {animal.observacoes}
            </p>
          )}
        </div>
      </div>

      {tutor && (
        <div className="flex gap-4 border-borda lg:max-w-md lg:border-l lg:pl-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-azul-ativo text-white">
            <UserRound className="size-6" />
          </span>
          <div className="text-sm text-texto-corpo">
            <p className="text-texto-suave">Tutor(a)</p>
            <p className="text-base font-semibold text-texto-titulo">{tutor.nome}</p>
            <p className="mt-1 flex items-center gap-2">
              <Phone className="size-4" /> {formatar_telefone(tutor.telefone_principal)}
            </p>
            {tutor.email && (
              <p className="flex items-center gap-2">
                <Mail className="size-4" /> {tutor.email}
              </p>
            )}
            {tutor.endereco && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>
                  {tutor.endereco}
                  {[tutor.bairro, tutor.cidade && `${tutor.cidade}/${tutor.estado}`, tutor.cep && `CEP ${formatar_cep(tutor.cep)}`]
                    .filter(Boolean)
                    .map((parte) => ` · ${parte}`)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {acao && <div className="shrink-0">{acao}</div>}
    </section>
  );
}
