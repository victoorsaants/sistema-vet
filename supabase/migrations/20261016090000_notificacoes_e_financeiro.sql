-- =============================================================================
-- AjuVet+ — notificações ao tutor (RF03) e controle financeiro (RF06)
-- =============================================================================

alter table public.notificacoes
  add column atendimento_id uuid references public.atendimentos (id) on delete cascade,
  add column assunto        text not null default '',
  add column destinatario   text,
  add column tentativas     smallint not null default 0;

comment on column public.notificacoes.destinatario is
  'Endereço usado no envio. Fica vazio até a mensagem sair, pois o contato do tutor pode mudar.';

create index notificacoes_atendimento_id_idx on public.notificacoes (atendimento_id);
create index notificacoes_agendamento_id_idx on public.notificacoes (agendamento_id);

alter table public.lancamentos
  add constraint lancamentos_pago_com_forma_pagamento
  check (status <> 'pago' or forma_pagamento is not null);

create index lancamentos_tutor_id_idx on public.lancamentos (tutor_id);
