import type { Porte, Sexo } from "@/lib/cadastros_api";

export type Opcao = {
  valor: string;
  rotulo: string;
};

function opcoes_de_textos(textos: string[]): Opcao[] {
  return textos.map((texto) => ({ valor: texto, rotulo: texto }));
}

export const ESTADOS = opcoes_de_textos([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export const COMO_CONHECEU = opcoes_de_textos([
  "Indicação",
  "Instagram",
  "Google",
  "Facebook",
  "Passou em frente à clínica",
  "Outro",
]);

export const ESPECIES = opcoes_de_textos(["Cão", "Gato", "Ave", "Roedor", "Réptil", "Outro"]);

export const NOMES_SEXO: Record<Sexo, string> = {
  macho: "Macho",
  femea: "Fêmea",
};

export const NOMES_PORTE: Record<Porte, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
};

export const SEXOS: Opcao[] = Object.entries(NOMES_SEXO).map(([valor, rotulo]) => ({ valor, rotulo }));

export const PORTES: Opcao[] = Object.entries(NOMES_PORTE).map(([valor, rotulo]) => ({ valor, rotulo }));

export const OPCOES_CASTRADO: Opcao[] = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
];
