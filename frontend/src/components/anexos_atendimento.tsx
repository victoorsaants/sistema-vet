"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { CloudUpload, FileImage, FileText, LoaderCircle, X } from "lucide-react";

import { Aviso } from "@/components/botoes_formulario";
import SecaoCartao from "@/components/secao_cartao";
import { anexar_arquivo, excluir_anexo } from "@/lib/acoes_atendimento";
import type { Anexo } from "@/lib/atendimentos_api";

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;
const TIPOS_ACEITOS = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

function formatar_tamanho(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

type AnexosAtendimentoProps = {
  atendimento_id: string;
  anexos: Anexo[];
  pode_editar: boolean;
};

export default function AnexosAtendimento({ atendimento_id, anexos, pode_editar }: AnexosAtendimentoProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, definir_erro] = useState<string | null>(null);
  const [arrastando, definir_arrastando] = useState(false);
  const [enviando, iniciar] = useTransition();

  function enviar(arquivos: FileList | null) {
    const lista = Array.from(arquivos ?? []);
    const grande = lista.find((arquivo) => arquivo.size > TAMANHO_MAXIMO_BYTES);
    if (grande) {
      definir_erro(`"${grande.name}" passa do limite de 10 MB.`);
      return;
    }
    definir_erro(null);
    iniciar(async () => {
      for (const arquivo of lista) {
        const dados = new FormData();
        dados.append("arquivo", arquivo);
        const resultado = await anexar_arquivo(atendimento_id, dados);
        if (!resultado.ok) {
          definir_erro(`${arquivo.name}: ${resultado.campos.arquivo ?? resultado.erro}`);
          return;
        }
      }
    });
    if (entrada.current) {
      entrada.current.value = "";
    }
  }

  function soltar(evento: DragEvent<HTMLButtonElement>) {
    evento.preventDefault();
    definir_arrastando(false);
    enviar(evento.dataTransfer.files);
  }

  function remover(anexo: Anexo) {
    if (!window.confirm(`Remover o arquivo "${anexo.nome_arquivo}"?`)) {
      return;
    }
    iniciar(async () => {
      const resultado = await excluir_anexo(atendimento_id, anexo.id);
      definir_erro(resultado.ok ? null : resultado.erro);
    });
  }

  return (
    <SecaoCartao
      titulo="Resultados de exames"
      descricao={pode_editar ? "Envie os arquivos dos exames realizados." : "Arquivos anexados ao atendimento."}
      icone={CloudUpload}
      cor="bg-azul-ativo"
    >
      <div className={`grid gap-4 ${pode_editar ? "md:grid-cols-2" : ""}`}>
        {pode_editar && (
          <>
            <input
              ref={entrada}
              type="file"
              multiple
              accept={TIPOS_ACEITOS}
              className="sr-only"
              aria-label="Escolher arquivos de exames"
              onChange={(evento) => enviar(evento.target.files)}
            />
            <button
              type="button"
              disabled={enviando}
              onClick={() => entrada.current?.click()}
              onDragOver={(evento) => {
                evento.preventDefault();
                definir_arrastando(true);
              }}
              onDragLeave={() => definir_arrastando(false)}
              onDrop={soltar}
              className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition ${
                arrastando ? "border-azul-ativo bg-destaque-suave" : "border-slate-200 hover:bg-fundo"
              }`}
            >
              {enviando ? (
                <LoaderCircle className="size-9 animate-spin text-azul-ativo" />
              ) : (
                <CloudUpload className="size-9 text-azul-ativo" />
              )}
              <span className="text-texto-titulo">
                {enviando ? "Enviando..." : "Arraste os arquivos aqui ou clique para selecionar"}
              </span>
              <span className="text-xs text-texto-suave">PDF, JPG, PNG ou WEBP (máx. 10 MB)</span>
            </button>
          </>
        )}

        <div className="rounded-xl border border-borda p-3">
          <p className="mb-2 text-sm font-medium text-texto-titulo">Arquivos anexados</p>
          {anexos.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhum arquivo anexado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {anexos.map((anexo) => {
                const Icone = anexo.tipo_mime === "application/pdf" ? FileText : FileImage;
                return (
                  <li key={anexo.id} className="flex items-center gap-3 rounded-lg border border-borda px-3 py-2">
                    <Icone className="size-5 shrink-0 text-azul-ativo" />
                    <a
                      href={`/api/anexos/${anexo.id}`}
                      target="_blank"
                      rel="noopener"
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <span className="block truncate text-sm font-medium text-texto-titulo">{anexo.nome_arquivo}</span>
                      <span className="block text-xs text-texto-suave">{formatar_tamanho(anexo.tamanho_bytes)}</span>
                    </a>
                    {pode_editar && (
                      <button
                        type="button"
                        onClick={() => remover(anexo)}
                        disabled={enviando}
                        aria-label={`Remover ${anexo.nome_arquivo}`}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {erro && (
        <div className="mt-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}
    </SecaoCartao>
  );
}
