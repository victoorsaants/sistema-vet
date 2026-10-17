# Arquitetura — AjuVet+

## Estrutura do repositório

```
sistema-vet/
├── backend/          # API FastAPI
│   └── app/
│       ├── api/      # Rotas da API
│       ├── db/       # Pool de conexões com o PostgreSQL
│       ├── config.py # Configurações
│       └── main.py   # Entry point
│   ├── banco/        # SQL só do banco local (compatibilidade e usuários de exemplo)
│   ├── scripts/      # Banco local, migrations e criação de usuários
│   └── tests/        # Testes (unitários e de integração)
├── frontend/         # App Next.js + React
├── supabase/         # Migrations e seed, compatíveis com o Supabase
├── docs/             # Documentação do projeto
└── README.md
```

## Fluxo de comunicação

```
┌─────────────┐     HTTP/REST      ┌─────────────┐       psycopg        ┌─────────────┐
│   Frontend  │ ─────────────────► │   Backend   │ ───────────────────► │ PostgreSQL  │
│  (Next.js)  │   localhost:3000   │  (FastAPI)  │                      │   (local)   │
└─────────────┘   localhost:8000   └─────────────┘                      └─────────────┘
                                                                        localhost:5433

Mais tarde o mesmo PostgreSQL pode ser o do Supabase: as migrations são compatíveis e
basta trocar a `DATABASE_URL`.
```

## Docker

O `docker-compose.yml` da raiz sobe as três partes em containers separados, numa rede interna:

```
navegador ──► frontend:3000 ──► backend:8000 ──► banco:5432
              (Next.js           (FastAPI,         (PostgreSQL 15,
               standalone)        migrations         volume banco_ajuvet)
                                  ao subir,
                                  volume arquivos_ajuvet)
```

- **frontend** (`frontend/Dockerfile`): build em três etapas (dependências, `next build` com
  `output: "standalone"` e imagem final só com o `server.js`). Roda como usuário sem privilégios.
  O `API_URL` aponta para `http://backend:8000/api/v1`, o nome do serviço na rede do compose.
- **backend** (`backend/Dockerfile`): Python 3.12 slim. O build usa a raiz como contexto para
  levar `supabase/migrations` junto. Ao subir, o `docker-entrypoint.sh` confere o `JWT_SEGREDO`,
  aplica as migrations e, com `CARREGAR_DADOS_EXEMPLO=true`, carrega os dados de exemplo se o
  banco estiver vazio. Anexos e e-mails ficam no volume `arquivos_ajuvet`.
- **banco**: imagem oficial `postgres:15`, com senha, exposta só em `127.0.0.1`.
- No computador, a API do container fica em `127.0.0.1:8001` (`PORTA_BACKEND`), e não na 8000,
  para poder rodar ao mesmo tempo que o `uvicorn` local.
- Os três têm healthcheck; o backend só sobe com o banco pronto, e o frontend só com o backend.
- A configuração fica no `.env` da raiz (modelo em `.env.example`).

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável        | Descrição                          |
|-----------------|------------------------------------|
| `DATABASE_URL`  | Conexão com o PostgreSQL (padrão: `postgresql://postgres@localhost:5433/ajuvet`) |
| `JWT_SEGREDO`   | Segredo que assina os tokens de login. Obrigatório |
| `JWT_MINUTOS_ACCESS` | Validade do access token em minutos (padrão: 60) |
| `DIAS_REFRESH`  | Validade da sessão sem uso, em dias (padrão: 30) |
| `FUSO_HORARIO`  | Fuso da clínica para a agenda (padrão: `America/Maceio`) |
| `API_HOST`      | Host do servidor (padrão: 0.0.0.0) |
| `API_PORT`      | Porta do servidor (padrão: 8000)   |
| `CORS_ORIGINS`  | Origens permitidas (separadas por vírgula) |

### Frontend (`frontend/.env.local`)

| Variável  | Descrição |
|-----------|-----------|
| `API_URL` | URL base da API (padrão: `http://localhost:8000/api/v1`). Usada só no servidor do Next.js, por isso não tem o prefixo `NEXT_PUBLIC_`. |
| `COOKIE_SEGURO` | `true` marca os cookies de sessão como `Secure` (só HTTPS). Padrão: `true` em produção, `false` em desenvolvimento. |

## Autenticação (RF01)

```
Navegador ──► Next.js (server action / proxy) ──► FastAPI /auth/* ──► auth.users + auth.sessoes
              cookies httpOnly                   senha bcrypt, JWT HS256
```

- O login é feito por uma server action, que chama `POST /auth/login` e grava três cookies
  httpOnly: `ajuvet_access`, `ajuvet_refresh` e `ajuvet_perfil`. Os tokens nunca chegam ao
  JavaScript do navegador.
- O `src/proxy.ts` roda em toda navegação. Sem sessão, manda para `/login`. Com o access token
  vencido, renova pelo refresh token na hora. Também barra rotas que o perfil não pode abrir
  (Tutores e Controle Financeiro são só da Recepção).
- No backend, a senha é conferida com bcrypt contra `auth.users` (mesmo formato do Supabase
  Auth). O access token é um JWT com o id do usuário e da sessão; o refresh token é aleatório,
  guardado só como hash em `auth.sessoes` e trocado a cada renovação. O logout encerra a sessão,
  o que invalida os dois tokens.
- As páginas do painel buscam o usuário em `GET /auth/me` (`src/lib/dal.ts`). Se o token for
  recusado, a rota `/sair` apaga os cookies e volta para o login.
- No backend, `obter_usuario_atual` e `exigir_perfis(...)` protegem as rotas. Essa é a
  checagem que vale; a do proxy só evita mostrar telas proibidas.

## Portas padrão

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Swagger:** http://localhost:8000/docs
- **Backend no Docker:** http://localhost:8001 (Swagger em `/docs`)
