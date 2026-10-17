"use client";

import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";

import SeletorBusca from "@/components/seletor_busca";

export default function BuscaHistorico() {
  const router = useRouter();

  return (
    <SeletorBusca
      rotulo="Animal"
      nome="animal_id"
      endpoint="/api/animais"
      placeholder="Digite o nome do animal, microchip ou tutor"
      icone={PawPrint}
      inicial={null}
      ao_selecionar={(item) => {
        if (item) {
          router.push(`/historico/${item.id}`);
        }
      }}
    />
  );
}
