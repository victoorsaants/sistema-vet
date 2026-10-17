# Docker — Sistema Vet

O `docker-compose.yml` na raiz sobe toda a aplicação isolada em containers.

## Serviços

```
                 host                              rede interna do compose
┌──────────────────────────────┐
│ localhost:3000  ─► frontend  │  Next.js (build de produção, output standalone)
│ localhost:8001  ─► backend   │  FastAPI ──► http://kong:8000 (SDK do Supabase)
│ localhost:54321 ─► kong      │  gateway ──► /rest/v1/ ──► rest:3000
│                    rest      │  PostgREST ──► db:5432 (papel authenticator)
│ localhost:54322 ─► db        │  supabase/postgres (dados no volume db-data)
└──────────────────────────────┘
```

| Serviço    | Imagem                         | Função                                              |
|------------|--------------------------------|-----------------------------------------------------|
| `db`       | `supabase/postgres`            | Postgres com as extensões e papéis do Supabase      |
| `rest`     | `postgrest/postgrest`          | API REST gerada a partir do schema `public`         |
| `kong`     | `kong`                         | Gateway que expõe `/rest/v1/`, como no Supabase     |
| `backend`  | build de `backend/Dockerfile`  | API FastAPI                                         |
| `frontend` | build de `frontend/Dockerfile` | App Next.js                                         |

A ordem de inicialização é garantida por healthchecks:
`db` → `rest` → `kong` → `backend` → `frontend`.

Na primeira inicialização do volume, o banco executa os scripts de `docker/db/`:

- `roles.sql` — define a senha dos papéis internos (ex.: `authenticator`, usado pelo PostgREST);
- `pgrst-watch.sql` — faz o PostgREST recarregar o schema sozinho após `CREATE`/`ALTER`/`DROP`.

## Configuração

Todas as variáveis ficam no `.env` da raiz (copiado de `.env.example`).

| Variável              | Descrição                                                   |
|-----------------------|-------------------------------------------------------------|
| `POSTGRES_PASSWORD`   | Senha do Postgres e dos papéis internos do Supabase         |
| `JWT_SECRET`          | Segredo usado pelo PostgREST para validar os JWTs           |
| `ANON_KEY`            | Chave pública (papel `anon`), para uso futuro no frontend   |
| `SERVICE_ROLE_KEY`    | Chave do backend (papel `service_role`, ignora RLS)         |
| `*_PORT`              | Portas expostas no host                                     |
| `CORS_ORIGINS`        | Origens permitidas pelo backend                             |
| `NEXT_PUBLIC_API_URL` | URL da API vista pelo navegador (embutida no build)         |

As chaves do `.env.example` servem só para desenvolvimento. Para gerar novas:

```bash
python scripts/gerar_chaves_supabase.py
```

> `POSTGRES_PASSWORD` só é aplicada na **primeira** inicialização do banco.
> Se trocar depois, rode `docker compose down -v` (apaga os dados) e suba de novo.

## Uso no dia a dia

```bash
docker compose up -d --build       # sobe/atualiza tudo
docker compose up -d --build backend   # rebuild de um serviço só
docker compose logs -f backend     # acompanha logs
docker compose down                # para (mantém dados)
docker compose down -v             # para e apaga o volume do banco
```

Os containers do frontend e backend rodam o código **copiado no build**:
após alterar o código, rode `docker compose up -d --build <serviço>`.
Para desenvolvimento com hot reload, é possível rodar só o banco no Docker
(`docker compose up -d kong`) e o backend/frontend localmente, com o
`backend/.env` apontando para `SUPABASE_URL=http://localhost:54321` e
`SUPABASE_KEY` igual à `SERVICE_ROLE_KEY` do `.env` da raiz.

## Acessando o banco

- **Cliente SQL** (DBeaver, pgAdmin etc.): `localhost:54322`, banco `postgres`,
  usuário `postgres`, senha `POSTGRES_PASSWORD`.
- **psql no container:** `docker compose exec db psql -U postgres`
- **API REST:** `http://localhost:54321/rest/v1/<tabela>` com os headers
  `apikey` e `Authorization: Bearer <chave>`.

Tabelas criadas no schema `public` ficam disponíveis no PostgREST
automaticamente e, **enquanto o RLS não for habilitado, podem ser lidas e
alteradas por qualquer um com a `ANON_KEY`** (mesmo comportamento do Supabase
na nuvem). Habilite RLS em toda tabela nova:

```sql
alter table public.minha_tabela enable row level security;
```

> As portas do banco (54322) e da API do Supabase (54321) ficam abertas só em
> `127.0.0.1`, pois a senha e as chaves de desenvolvimento estão no repositório.
