export const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1";

export type CamposComErro = Record<string, string>;

export class ErroApi extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly campos: CamposComErro = {},
  ) {
    super(mensagem);
  }
}

export async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      cache: "no-store",
      headers:
        opcoes.body instanceof FormData ? opcoes.headers : { "Content-Type": "application/json", ...opcoes.headers },
    });
  } catch {
    throw new ErroApi(503, "Não foi possível conectar ao servidor. Tente novamente.");
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const mensagem =
      typeof corpo?.detail === "string" ? corpo.detail : "Não foi possível concluir a operação.";
    throw new ErroApi(resposta.status, mensagem, corpo?.campos ?? {});
  }

  if (resposta.status === 204) {
    return undefined as T;
  }
  return resposta.json() as Promise<T>;
}
