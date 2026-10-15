-- =============================================================================
-- Usuários de exemplo para desenvolvimento local. Senha de ambos: ajuvet123
-- Carregado por: python -m scripts.migrar --seed. Não rodar em produção.
-- =============================================================================

insert into auth.users (id, email, encrypted_password) values
  ('60000000-0000-4000-8000-000000000001', 'recepcao@ajuvet.local', extensions.crypt('ajuvet123', extensions.gen_salt('bf'))),
  ('60000000-0000-4000-8000-000000000002', 'mariana.costa@ajuvet.local', extensions.crypt('ajuvet123', extensions.gen_salt('bf')))
on conflict (id) do nothing;

insert into public.perfis (id, nome, perfil) values
  ('60000000-0000-4000-8000-000000000001', 'Mariana', 'recepcao'),
  ('60000000-0000-4000-8000-000000000002', 'Dra. Mariana Costa', 'veterinario')
on conflict (id) do nothing;

update public.veterinarios
set perfil_id = '60000000-0000-4000-8000-000000000002'
where id = '10000000-0000-4000-8000-000000000001';
