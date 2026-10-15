import Link from "next/link";
import { BellRing, ChevronRight, MailWarning } from "lucide-react";

import { AcoesNotificacao } from "@/components/acoes_notificacao";
import SecaoCartao from "@/components/secao_cartao";
import { formatar_data_curta, formatar_hora } from "@/lib/datas_agenda";
import { listar_notificacoes } from "@/lib/notificacoes_api";
import {
  ESTILOS_STATUS_NOTIFICACAO,
  NOMES_STATUS_NOTIFICACAO,
  NOMES_TIPO_NOTIFICACAO,
  type StatusNotificacao,
} from "@/lib/opcoes_notificacao";

const LIMITE = 200;

type NotificacoesAtendimentoProps = {
  atendimento_id: string;
  finalizado: boolean;
  email_tutor: string | null;
  pode_ver_fila: boolean;
};

export default async function NotificacoesAtendimento({
  atendimento_id,
  finalizado,
  email_tutor,
  pode_ver_fila,
}: NotificacoesAtendimentoProps) {
  const notificacoes = finalizado ? (await listar_notificacoes({ atendimento_id, tamanho: LIMITE })).itens : [];
  const principais = notificacoes
    .filter(({ tipo }) => tipo !== "lembrete_medicamento")
    .sort((a, b) => a.agendada_para.localeCompare(b.agendada_para));
  const contagem_remedios = notificacoes
    .filter(({ tipo }) => tipo === "lembrete_medicamento")
    .reduce<Partial<Record<StatusNotificacao, number>>>(
      (contagem, { status }) => ({ ...contagem, [status]: (contagem[status] ?? 0) + 1 }),
      {},
    );
  const resumo_remedios = (Object.entries(contagem_remedios) as [StatusNotificacao, number][])
    .map(([status, quantidade]) => `${quantidade} ${NOMES_STATUS_NOTIFICACAO[status].toLowerCase()}${quantidade > 1 ? "s" : ""}`)
    .join(", ");

  return (
    <SecaoCartao
      titulo="Notificações ao tutor"
      descricao={email_tutor ? `Enviadas por e-mail para ${email_tutor}.` : undefined}
      icone={BellRing}
      cor="bg-modulo-notificacoes"
    >
      {!email_tutor && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
          <MailWarning className="mt-0.5 size-5 shrink-0" />
          O tutor não tem e-mail cadastrado. A receita e os lembretes ficam com falha até a recepção cadastrar um e-mail e
          reenviar.
        </p>
      )}

      {!finalizado ? (
        <p className="text-texto-suave">
          Ao finalizar, a receita é enviada ao tutor e os lembretes de remédio, retorno e vacina são programados.
        </p>
      ) : notificacoes.length === 0 ? (
        <p className="text-texto-suave">Nenhuma mensagem foi programada para este atendimento.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda">
          {principais.map((notificacao) => {
            const instante = notificacao.enviada_em ?? notificacao.agendada_para;
            return (
              <li key={notificacao.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-48 flex-1">
                  <p className="font-medium text-texto-titulo">{NOMES_TIPO_NOTIFICACAO[notificacao.tipo]}</p>
                  <p className="text-sm text-texto-suave">
                    {notificacao.status === "enviada" ? "Enviada em" : "Programada para"} {formatar_data_curta(instante)} às{" "}
                    {formatar_hora(instante)}
                  </p>
                  {notificacao.erro && <p className="text-sm text-rose-700">{notificacao.erro}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${ESTILOS_STATUS_NOTIFICACAO[notificacao.status]}`}>
                  {NOMES_STATUS_NOTIFICACAO[notificacao.status]}
                </span>
                <AcoesNotificacao id={notificacao.id} status={notificacao.status} />
              </li>
            );
          })}
          {resumo_remedios && (
            <li className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-medium text-texto-titulo">Lembretes de remédio</p>
                <p className="text-sm text-texto-suave">Um aviso em cada horário de dose: {resumo_remedios}.</p>
              </div>
              {pode_ver_fila && (
                <Link
                  href="/notificacoes?tipo=lembrete_medicamento"
                  className="flex items-center gap-1 text-sm font-medium text-azul-marca hover:underline"
                >
                  Ver na fila <ChevronRight className="size-4" />
                </Link>
              )}
            </li>
          )}
        </ul>
      )}
    </SecaoCartao>
  );
}
