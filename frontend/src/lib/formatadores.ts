export function somente_digitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatar_cpf(valor: string | null | undefined): string {
  const digitos = somente_digitos(valor ?? "").slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatar_telefone(valor: string | null | undefined): string {
  const digitos = somente_digitos(valor ?? "").slice(0, 11);
  if (digitos.length <= 2) {
    return digitos;
  }
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const corte = numero.length > 8 ? 5 : 4;
  const final = numero.slice(corte);
  return `(${ddd}) ${numero.slice(0, corte)}${final ? `-${final}` : ""}`;
}

export function formatar_cep(valor: string | null | undefined): string {
  const digitos = somente_digitos(valor ?? "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export function formatar_data(valor: string | null | undefined): string {
  if (!valor) {
    return "—";
  }
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatar_numero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "" : String(valor).replace(".", ",");
}

export function calcular_idade(data_nascimento: string | null | undefined, hoje = new Date()): string {
  if (!data_nascimento) {
    return "—";
  }
  const [ano, mes, dia] = data_nascimento.slice(0, 10).split("-").map(Number);
  let meses = (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes);
  if (hoje.getDate() < dia) {
    meses -= 1;
  }
  if (meses < 1) {
    return "menos de 1 mês";
  }
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anos > 0) {
    partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  }
  if (resto > 0) {
    partes.push(`${resto} ${resto === 1 ? "mês" : "meses"}`);
  }
  return partes.join(" e ");
}
