"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CamposComErro } from "@/lib/cliente_api";
import { estado_de_erro, texto, type EstadoFormulario } from "@/lib/dados_formulario";
import { alterar_minha_senha, atualizar_meu_perfil } from "@/lib/perfil_api";

function validar_senhas(senha_atual: string, nova_senha: string, confirmacao: string): CamposComErro {
  const campos: CamposComErro = {};
  if (!senha_atual) {
    campos.senha_atual = "Informe a senha atual.";
  }
  if (!nova_senha) {
    campos.nova_senha = "Informe a nova senha.";
  }
  if (nova_senha !== confirmacao) {
    campos.confirmar_senha = "As senhas não conferem.";
  }
  return campos;
}

export async function salvar_perfil(estado: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  try {
    await atualizar_meu_perfil(texto(dados, "nome"));
  } catch (erro) {
    return estado_de_erro(estado, dados, erro);
  }
  revalidatePath("/", "layout");
  redirect("/perfil?salvo=dados");
}

export async function salvar_senha(estado: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const senha_atual = String(dados.get("senha_atual") ?? "");
  const nova_senha = String(dados.get("nova_senha") ?? "");
  const campos = validar_senhas(senha_atual, nova_senha, String(dados.get("confirmar_senha") ?? ""));
  if (Object.keys(campos).length > 0) {
    return { erro: "Verifique os campos destacados.", campos, valores: {}, versao: estado.versao + 1 };
  }

  try {
    await alterar_minha_senha(senha_atual, nova_senha);
  } catch (erro) {
    return { ...estado_de_erro(estado, dados, erro), valores: {} };
  }
  redirect("/perfil?salvo=senha");
}
