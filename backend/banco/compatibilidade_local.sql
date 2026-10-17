-- =============================================================================
-- Estruturas que o Supabase já traz prontas e que, no banco local, precisam
-- ser criadas antes das migrations. Não rodar no Supabase.
-- =============================================================================

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;

create extension if not exists pgcrypto with schema extensions;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  encrypted_password text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column auth.users.encrypted_password is
  'Hash bcrypt da senha, no mesmo formato usado pelo Supabase Auth.';

create table if not exists auth.sessoes (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null references auth.users (id) on delete cascade,
  refresh_token_hash text not null unique,
  expira_em          timestamptz not null,
  encerrada_em       timestamptz,
  criada_em          timestamptz not null default now()
);

create index if not exists sessoes_usuario_id_idx on auth.sessoes (usuario_id);

create table if not exists storage.buckets (
  id     text primary key,
  name   text not null,
  public boolean not null default false
);
