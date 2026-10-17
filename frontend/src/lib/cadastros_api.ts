import { montar_consulta, requisitar_autenticado } from "@/lib/api_autenticada";

export type Pagina<T> = {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
};

export type DadosTutor = {
  nome: string;
  cpf: string;
  data_nascimento: string | null;
  telefone_principal: string;
  telefone_secundario: string | null;
  email: string | null;
  cep: string;
  endereco: string;
  bairro: string | null;
  cidade: string;
  estado: string;
  como_conheceu: string | null;
};

export type Tutor = DadosTutor & {
  id: string;
  ativo: boolean;
  atualizado_em: string;
};

export type TutorResumo = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone_principal: string;
  email: string | null;
  cidade: string | null;
  total_animais: number;
};

export type Sexo = "macho" | "femea";
export type Porte = "pequeno" | "medio" | "grande";

export type TutorDoAnimal = {
  id: string;
  nome: string;
  telefone_principal: string;
};

export type DadosAnimal = {
  tutor_id: string;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: Sexo | null;
  data_nascimento: string | null;
  cor_pelagem: string | null;
  peso_kg: number | null;
  altura_cm: number | null;
  largura_cm: number | null;
  porte: Porte | null;
  microchip: string | null;
  castrado: boolean | null;
  observacoes: string | null;
};

export type Animal = Omit<DadosAnimal, "tutor_id"> & {
  id: string;
  ativo: boolean;
  atualizado_em: string;
  tutor: TutorDoAnimal;
};

export type AnimalResumo = {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: Sexo | null;
  data_nascimento: string | null;
  microchip: string | null;
  tutor: TutorDoAnimal;
};

type FiltroListagem = {
  busca?: string;
  pagina?: number;
  tamanho?: number;
};

export function listar_tutores(filtro: FiltroListagem): Promise<Pagina<TutorResumo>> {
  return requisitar_autenticado(`/tutores${montar_consulta(filtro)}`);
}

export function obter_tutor(id: string): Promise<Tutor> {
  return requisitar_autenticado(`/tutores/${encodeURIComponent(id)}`);
}

export function criar_tutor(dados: DadosTutor): Promise<Tutor> {
  return requisitar_autenticado("/tutores", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizar_tutor(id: string, dados: DadosTutor): Promise<Tutor> {
  return requisitar_autenticado(`/tutores/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function listar_animais(
  filtro: FiltroListagem & { tutor_id?: string },
): Promise<Pagina<AnimalResumo>> {
  return requisitar_autenticado(`/animais${montar_consulta(filtro)}`);
}

export function obter_animal(id: string): Promise<Animal> {
  return requisitar_autenticado(`/animais/${encodeURIComponent(id)}`);
}

export function criar_animal(dados: DadosAnimal): Promise<Animal> {
  return requisitar_autenticado("/animais", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizar_animal(id: string, dados: DadosAnimal): Promise<Animal> {
  return requisitar_autenticado(`/animais/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}
