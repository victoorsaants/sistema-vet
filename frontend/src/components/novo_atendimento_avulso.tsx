"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, PawPrint, Stethoscope, Zap } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import SecaoCartao from "@/components/secao_cartao";
import SeletorBusca, { type ItemBusca } from "@/components/seletor_busca";
import { atender_sem_agendamento } from "@/lib/acoes_atendimento";
import type { TipoAtendimento } from "@/lib/agenda_api";
import { NOMES_TIPO } from "@/lib/datas_agenda";

export default function NovoAtendimentoAvulso() {
  const [animal, definir_animal] = useState<ItemBusca | null>(null);
  const [tipo, definir_tipo] = useState<TipoAtendimento>("consulta");
  const [erro, definir_erro] = useState<string | null>(null);
  const [abrindo, iniciar] = useTransition();

  function abrir() {
    if (!animal) {
      definir_erro("Selecione o animal.");
      return;
    }
    const animal_id = animal.id;
    iniciar(async () => {
      const resultado = await atender_sem_agendamento(animal_id, tipo);
      if (resultado && !resultado.ok) {
        definir_erro(resultado.erro);
      }
    });
  }

  return (
    <SecaoCartao
      titulo="Atendimento sem agendamento"
      descricao="Para encaixes e emergências."
      icone={Zap}
      cor="bg-modulo-agendamentos"
    >
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
        <SeletorBusca
          rotulo="Animal"
          nome="animal_id"
          endpoint="/api/animais"
          placeholder="Nome do animal, microchip ou tutor"
          icone={PawPrint}
          inicial={null}
          ao_selecionar={(item) => {
            definir_animal(item);
            definir_erro(null);
          }}
        />
        <label className="text-sm font-medium text-texto-titulo">
          Tipo
          <select
            value={tipo}
            onChange={(evento) => definir_tipo(evento.target.value as TipoAtendimento)}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-texto-titulo"
          >
            {Object.entries(NOMES_TIPO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={abrir}
          disabled={abrindo}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-azul-ativo px-5 font-medium text-white hover:bg-azul-marca disabled:opacity-70"
        >
          {abrindo ? <LoaderCircle className="size-5 animate-spin" /> : <Stethoscope className="size-5" />}
          Iniciar atendimento
        </button>
      </div>
      {erro && (
        <div className="mt-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}
    </SecaoCartao>
  );
}
