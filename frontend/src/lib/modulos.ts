import {
  BellRing,
  CalendarDays,
  ClipboardPlus,
  FileText,
  PawPrint,
  Stethoscope,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Perfil } from "@/lib/tipos_auth";

export type Modulo = {
  titulo: string;
  descricao: string;
  href: string;
  icone: LucideIcon;
  cor: string;
  perfis: Perfil[];
  exibir_no_inicio?: boolean;
};

export const MODULOS: Modulo[] = [
  {
    titulo: "Tutores / Clientes",
    descricao: "Cadastre e consulte os tutores e clientes da clínica.",
    href: "/tutores",
    icone: UserRound,
    cor: "bg-modulo-tutores",
    perfis: ["recepcao"],
  },
  {
    titulo: "Animais",
    descricao: "Cadastre e consulte os animais atendidos na clínica.",
    href: "/animais",
    icone: PawPrint,
    cor: "bg-modulo-animais",
    perfis: ["recepcao", "veterinario"],
  },
  {
    titulo: "Atendimentos",
    descricao: "Registre atendimentos realizados e consulte o histórico.",
    href: "/atendimentos",
    icone: ClipboardPlus,
    cor: "bg-modulo-atendimentos",
    perfis: ["recepcao", "veterinario"],
  },
  {
    titulo: "Agendamentos",
    descricao: "Marque e visualize as consultas e retornos.",
    href: "/agendamentos",
    icone: CalendarDays,
    cor: "bg-modulo-agendamentos",
    perfis: ["recepcao", "veterinario"],
  },
  {
    titulo: "Histórico",
    descricao: "Acesse o histórico dos animais e atendimentos.",
    href: "/historico",
    icone: FileText,
    cor: "bg-modulo-historico",
    perfis: ["recepcao", "veterinario"],
  },
  {
    titulo: "Controle Financeiro",
    descricao: "Gerencie receitas, despesas e relatórios financeiros.",
    href: "/financeiro",
    icone: Wallet,
    cor: "bg-modulo-financeiro",
    perfis: ["recepcao"],
  },
  {
    titulo: "Veterinários",
    descricao: "Cadastre os veterinários e o acesso de cada um ao sistema.",
    href: "/veterinarios",
    icone: Stethoscope,
    cor: "bg-modulo-atendimentos",
    perfis: ["recepcao"],
    exibir_no_inicio: false,
  },
  {
    titulo: "Notificações",
    descricao: "Acompanhe as receitas e lembretes enviados aos tutores.",
    href: "/notificacoes",
    icone: BellRing,
    cor: "bg-modulo-notificacoes",
    perfis: ["recepcao"],
    exibir_no_inicio: false,
  },
];

export function modulos_do_perfil(perfil: Perfil): Modulo[] {
  return MODULOS.filter((modulo) => modulo.perfis.includes(perfil));
}

export function rota_permitida(caminho: string, perfil: Perfil): boolean {
  const modulo = MODULOS.find(
    ({ href }) => caminho === href || caminho.startsWith(`${href}/`),
  );
  return modulo === undefined || modulo.perfis.includes(perfil);
}
