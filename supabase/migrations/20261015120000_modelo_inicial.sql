-- =============================================================================
-- AjuVet+ — modelo de dados inicial
-- Tutores, animais, veterinários, agendamentos, atendimentos, prescrições e
-- financeiro.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;


-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type public.perfil_usuario as enum ('recepcao', 'veterinario');

create type public.sexo_animal as enum ('macho', 'femea');

create type public.porte_animal as enum ('pequeno', 'medio', 'grande');

create type public.tipo_atendimento as enum (
  'consulta',
  'retorno',
  'vacinacao',
  'exame',
  'procedimento'
);

create type public.status_agendamento as enum (
  'agendado',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
  'faltou'
);

create type public.status_atendimento as enum ('em_andamento', 'finalizado');

create type public.status_exame as enum ('solicitado', 'realizado', 'cancelado');

create type public.tipo_lancamento as enum ('receita', 'despesa');

create type public.status_lancamento as enum ('pendente', 'pago', 'cancelado');

create type public.forma_pagamento as enum (
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
  'boleto'
);

create type public.tipo_notificacao as enum (
  'prescricao',
  'lembrete_medicamento',
  'lembrete_retorno',
  'lembrete_vacina',
  'confirmacao_agendamento'
);

create type public.canal_notificacao as enum ('email', 'whatsapp', 'sms');

create type public.status_notificacao as enum ('pendente', 'enviada', 'falhou', 'cancelada');


-- -----------------------------------------------------------------------------
-- Função comum: mantém atualizado_em em dia
-- -----------------------------------------------------------------------------

create function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- Usuários do sistema (ligados ao Supabase Auth)
-- -----------------------------------------------------------------------------

create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null,
  perfil        public.perfil_usuario not null,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- Veterinários e agenda
-- -----------------------------------------------------------------------------

create table public.veterinarios (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid unique references public.perfis (id) on delete set null,
  nome          text not null,
  crmv          text not null unique,
  especialidade text,
  telefone      text,
  email         text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on column public.veterinarios.perfil_id is
  'Login do veterinário. Pode ficar vazio enquanto ele não tiver acesso ao sistema.';

create table public.disponibilidades_veterinario (
  id               uuid primary key default gen_random_uuid(),
  veterinario_id   uuid not null references public.veterinarios (id) on delete cascade,
  dia_semana       smallint not null check (dia_semana between 0 and 6),
  hora_inicio      time not null,
  hora_fim         time not null,
  duracao_minutos  smallint not null default 30 check (duracao_minutos > 0),
  criado_em        timestamptz not null default now(),
  check (hora_fim > hora_inicio),
  exclude using gist (
    veterinario_id with =,
    dia_semana with =,
    tsrange('2000-01-01'::date + hora_inicio, '2000-01-01'::date + hora_fim) with &&
  )
);

comment on table public.disponibilidades_veterinario is
  'Expediente semanal de cada veterinário (0 = domingo). Os horários livres da agenda saem daqui.';

create table public.bloqueios_agenda (
  id             uuid primary key default gen_random_uuid(),
  veterinario_id uuid not null references public.veterinarios (id) on delete cascade,
  inicio         timestamptz not null,
  fim            timestamptz not null,
  motivo         text,
  criado_em      timestamptz not null default now(),
  check (fim > inicio)
);

comment on table public.bloqueios_agenda is
  'Férias, folgas e outros períodos em que o veterinário não atende.';


-- -----------------------------------------------------------------------------
-- Tutores e animais
-- -----------------------------------------------------------------------------

create table public.tutores (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  cpf                 char(11) unique check (cpf ~ '^[0-9]{11}$'),
  data_nascimento     date,
  telefone_principal  text not null,
  telefone_secundario text,
  email               text,
  cep                 char(8) check (cep ~ '^[0-9]{8}$'),
  endereco            text,
  bairro              text,
  cidade              text,
  estado              char(2),
  como_conheceu       text,
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

comment on column public.tutores.cpf is 'Somente dígitos.';
comment on column public.tutores.cep is 'Somente dígitos.';

create table public.animais (
  id              uuid primary key default gen_random_uuid(),
  tutor_id        uuid not null references public.tutores (id) on delete restrict,
  nome            text not null,
  especie         text not null,
  raca            text,
  sexo            public.sexo_animal,
  data_nascimento date,
  cor_pelagem     text,
  peso_kg         numeric(6, 2) check (peso_kg > 0),
  altura_cm       numeric(6, 2) check (altura_cm > 0),
  largura_cm      numeric(6, 2) check (largura_cm > 0),
  porte           public.porte_animal,
  microchip       text unique,
  castrado        boolean,
  observacoes     text,
  foto_url        text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

comment on column public.animais.observacoes is
  'Alergias, doenças pré-existentes, comportamento e outras observações importantes.';
comment on column public.animais.peso_kg is
  'Último peso conhecido. O histórico de pesos fica em atendimentos.';


-- -----------------------------------------------------------------------------
-- Agendamentos
-- -----------------------------------------------------------------------------

create table public.agendamentos (
  id             uuid primary key default gen_random_uuid(),
  animal_id      uuid not null references public.animais (id) on delete restrict,
  veterinario_id uuid not null references public.veterinarios (id) on delete restrict,
  tipo           public.tipo_atendimento not null,
  especialidade  text,
  inicio         timestamptz not null,
  fim            timestamptz not null,
  status         public.status_agendamento not null default 'agendado',
  observacoes    text,
  criado_por     uuid references public.perfis (id) on delete set null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check (fim > inicio),
  constraint agendamentos_sem_conflito_veterinario exclude using gist (
    veterinario_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status not in ('cancelado', 'faltou'))
);

comment on constraint agendamentos_sem_conflito_veterinario on public.agendamentos is
  'Impede dois agendamentos ativos do mesmo veterinário no mesmo horário.';


-- -----------------------------------------------------------------------------
-- Atendimentos, exames, anexos e vacinas
-- -----------------------------------------------------------------------------

create table public.atendimentos (
  id                      uuid primary key default gen_random_uuid(),
  agendamento_id          uuid unique references public.agendamentos (id) on delete set null,
  animal_id               uuid not null references public.animais (id) on delete restrict,
  veterinario_id          uuid not null references public.veterinarios (id) on delete restrict,
  tipo                    public.tipo_atendimento not null,
  status                  public.status_atendimento not null default 'em_andamento',
  realizado_em            timestamptz not null default now(),
  peso_kg                 numeric(6, 2) check (peso_kg > 0),
  temperatura_c           numeric(4, 1) check (temperatura_c between 25 and 45),
  frequencia_cardiaca     smallint check (frequencia_cardiaca > 0),
  frequencia_respiratoria smallint check (frequencia_respiratoria > 0),
  condicao_geral          text,
  queixa_principal        text,
  diagnostico             text,
  procedimentos           text[] not null default '{}',
  observacoes             text,
  retorno_em              date,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now()
);

comment on column public.atendimentos.procedimentos is
  'Procedimentos realizados, ex.: {"Consulta de rotina","Exame físico"}.';

create table public.exames (
  id             uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos (id) on delete cascade,
  nome           text not null,
  status         public.status_exame not null default 'solicitado',
  resultado      text,
  solicitado_em  timestamptz not null default now(),
  realizado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table public.anexos (
  id              uuid primary key default gen_random_uuid(),
  atendimento_id  uuid not null references public.atendimentos (id) on delete cascade,
  exame_id        uuid references public.exames (id) on delete set null,
  nome_arquivo    text not null,
  caminho_storage text not null unique,
  tipo_mime       text not null,
  tamanho_bytes   bigint not null check (tamanho_bytes > 0),
  enviado_por     uuid references public.perfis (id) on delete set null,
  criado_em       timestamptz not null default now()
);

comment on column public.anexos.caminho_storage is 'Caminho do arquivo no bucket "anexos" do Supabase Storage.';

create table public.vacinas_aplicadas (
  id               uuid primary key default gen_random_uuid(),
  animal_id        uuid not null references public.animais (id) on delete cascade,
  atendimento_id   uuid references public.atendimentos (id) on delete set null,
  vacina           text not null,
  lote             text,
  dose             text,
  aplicada_em      date not null,
  proxima_dose_em  date,
  criado_em        timestamptz not null default now(),
  check (proxima_dose_em is null or proxima_dose_em > aplicada_em)
);


-- -----------------------------------------------------------------------------
-- Prescrições e notificações ao tutor
-- -----------------------------------------------------------------------------

create table public.prescricoes (
  id             uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos (id) on delete cascade,
  orientacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table public.itens_prescricao (
  id            uuid primary key default gen_random_uuid(),
  prescricao_id uuid not null references public.prescricoes (id) on delete cascade,
  medicamento   text not null,
  dose          text not null,
  frequencia    text not null,
  intervalo_horas smallint check (intervalo_horas > 0),
  duracao_dias  smallint check (duracao_dias > 0),
  via           text,
  observacoes   text,
  criado_em     timestamptz not null default now()
);

comment on column public.itens_prescricao.frequencia is 'Texto exibido ao tutor, ex.: "a cada 12 horas".';
comment on column public.itens_prescricao.intervalo_horas is
  'Mesmo intervalo da frequência, em horas, para gerar os lembretes de medicamento.';

create table public.notificacoes (
  id             uuid primary key default gen_random_uuid(),
  tutor_id       uuid not null references public.tutores (id) on delete cascade,
  animal_id      uuid references public.animais (id) on delete cascade,
  prescricao_id  uuid references public.prescricoes (id) on delete cascade,
  agendamento_id uuid references public.agendamentos (id) on delete cascade,
  tipo           public.tipo_notificacao not null,
  canal          public.canal_notificacao not null,
  mensagem       text not null,
  agendada_para  timestamptz not null default now(),
  status         public.status_notificacao not null default 'pendente',
  enviada_em     timestamptz,
  erro           text,
  criado_em      timestamptz not null default now()
);

comment on table public.notificacoes is
  'Fila de mensagens ao tutor: receitas, lembretes de medicamento, retorno, vacina e agendamento.';


-- -----------------------------------------------------------------------------
-- Financeiro
-- -----------------------------------------------------------------------------

create table public.categorias_financeiras (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null,
  tipo  public.tipo_lancamento not null,
  ativo boolean not null default true,
  unique (nome, tipo),
  unique (id, tipo)
);

create table public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  tipo             public.tipo_lancamento not null,
  categoria_id     uuid not null,
  descricao        text not null,
  valor            numeric(12, 2) not null check (valor > 0),
  forma_pagamento  public.forma_pagamento,
  status           public.status_lancamento not null default 'pendente',
  data_competencia date not null default current_date,
  vencimento       date,
  pago_em          timestamptz,
  atendimento_id   uuid references public.atendimentos (id) on delete set null,
  tutor_id         uuid references public.tutores (id) on delete set null,
  registrado_por   uuid references public.perfis (id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  foreign key (categoria_id, tipo) references public.categorias_financeiras (id, tipo),
  check (status <> 'pago' or pago_em is not null)
);

comment on column public.lancamentos.status is
  'Para receitas, "pago" aparece na tela como "Recebido".';

insert into public.categorias_financeiras (nome, tipo) values
  ('Consultas', 'receita'),
  ('Exames', 'receita'),
  ('Vacinas', 'receita'),
  ('Procedimentos', 'receita'),
  ('Produtos', 'receita'),
  ('Outras receitas', 'receita'),
  ('Medicamentos', 'despesa'),
  ('Exames', 'despesa'),
  ('Materiais', 'despesa'),
  ('Folha de Pagamento', 'despesa'),
  ('Aluguel e contas', 'despesa'),
  ('Outras despesas', 'despesa');


-- -----------------------------------------------------------------------------
-- Gatilhos de atualizado_em
-- -----------------------------------------------------------------------------

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.definir_atualizado_em();
create trigger veterinarios_atualizado_em before update on public.veterinarios
  for each row execute function public.definir_atualizado_em();
create trigger tutores_atualizado_em before update on public.tutores
  for each row execute function public.definir_atualizado_em();
create trigger animais_atualizado_em before update on public.animais
  for each row execute function public.definir_atualizado_em();
create trigger agendamentos_atualizado_em before update on public.agendamentos
  for each row execute function public.definir_atualizado_em();
create trigger atendimentos_atualizado_em before update on public.atendimentos
  for each row execute function public.definir_atualizado_em();
create trigger exames_atualizado_em before update on public.exames
  for each row execute function public.definir_atualizado_em();
create trigger prescricoes_atualizado_em before update on public.prescricoes
  for each row execute function public.definir_atualizado_em();
create trigger lancamentos_atualizado_em before update on public.lancamentos
  for each row execute function public.definir_atualizado_em();


-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------

create index tutores_nome_trgm_idx on public.tutores using gin (nome extensions.gin_trgm_ops);
create index animais_nome_trgm_idx on public.animais using gin (nome extensions.gin_trgm_ops);
create index animais_tutor_id_idx on public.animais (tutor_id);

create index disponibilidades_veterinario_id_idx on public.disponibilidades_veterinario (veterinario_id);
create index bloqueios_agenda_veterinario_inicio_idx on public.bloqueios_agenda (veterinario_id, inicio);

create index agendamentos_animal_id_idx on public.agendamentos (animal_id);
create index agendamentos_inicio_idx on public.agendamentos (inicio);

create index atendimentos_animal_realizado_idx on public.atendimentos (animal_id, realizado_em desc);
create index atendimentos_veterinario_id_idx on public.atendimentos (veterinario_id);
create index exames_atendimento_id_idx on public.exames (atendimento_id);
create index anexos_atendimento_id_idx on public.anexos (atendimento_id);
create index vacinas_aplicadas_animal_id_idx on public.vacinas_aplicadas (animal_id);
create index vacinas_aplicadas_proxima_dose_idx on public.vacinas_aplicadas (proxima_dose_em)
  where proxima_dose_em is not null;

create index prescricoes_atendimento_id_idx on public.prescricoes (atendimento_id);
create index itens_prescricao_prescricao_id_idx on public.itens_prescricao (prescricao_id);
create index notificacoes_pendentes_idx on public.notificacoes (agendada_para)
  where status = 'pendente';
create index notificacoes_tutor_id_idx on public.notificacoes (tutor_id);

create index lancamentos_competencia_idx on public.lancamentos (data_competencia desc);
create index lancamentos_categoria_id_idx on public.lancamentos (categoria_id);
create index lancamentos_atendimento_id_idx on public.lancamentos (atendimento_id);


-- -----------------------------------------------------------------------------
-- Segurança
-- RLS ligado em todas as tabelas e sem políticas: nada fica exposto pela chave
-- anon. O backend acessa com a service role key. As políticas por perfil entram
-- junto com o login (RF01).
-- -----------------------------------------------------------------------------

alter table public.perfis                       enable row level security;
alter table public.veterinarios                 enable row level security;
alter table public.disponibilidades_veterinario enable row level security;
alter table public.bloqueios_agenda             enable row level security;
alter table public.tutores                      enable row level security;
alter table public.animais                      enable row level security;
alter table public.agendamentos                 enable row level security;
alter table public.atendimentos                 enable row level security;
alter table public.exames                       enable row level security;
alter table public.anexos                       enable row level security;
alter table public.vacinas_aplicadas            enable row level security;
alter table public.prescricoes                  enable row level security;
alter table public.itens_prescricao             enable row level security;
alter table public.notificacoes                 enable row level security;
alter table public.categorias_financeiras       enable row level security;
alter table public.lancamentos                  enable row level security;

insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;
