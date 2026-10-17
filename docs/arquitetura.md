# Arquitetura — Sistema Vet

## Estrutura do repositório

```
sistema-vet/
├── backend/          # API FastAPI
│   └── app/
│       ├── api/      # Rotas da API
│       ├── db/       # Cliente Supabase
│       ├── config.py # Configurações
│       └── main.py   # Entry point
├── frontend/         # App Next.js + React
├── docker/           # Config. do banco e do gateway (Docker)
├── scripts/          # Utilitários (ex.: gerar chaves do Supabase local)
├── docs/             # Documentação do projeto
├── docker-compose.yml
└── README.md
```

## Fluxo de comunicação

```
┌─────────────┐     HTTP/REST      ┌─────────────┐     Supabase SDK     ┌─────────────┐
│   Frontend  │ ─────────────────► │   Backend   │ ───────────────────► │  Supabase   │
│  (Next.js)  │   localhost:3000   │  (FastAPI)  │                      │ (PostgreSQL)│
└─────────────┘   localhost:8000   └─────────────┘                      └─────────────┘
```

Com Docker, o Supabase roda localmente (Postgres + PostgREST + gateway Kong).
Veja [docker.md](./docker.md).

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável        | Descrição                          |
|-----------------|------------------------------------|
| `SUPABASE_URL`  | URL do projeto Supabase            |
| `SUPABASE_KEY`  | Chave anon ou service role         |
| `API_HOST`      | Host do servidor (padrão: 0.0.0.0) |
| `API_PORT`      | Porta do servidor (padrão: 8000)   |
| `CORS_ORIGINS`  | Origens permitidas (separadas por vírgula) |

### Frontend (`frontend/.env.local`)

| Variável                  | Descrição              |
|---------------------------|------------------------|
| `NEXT_PUBLIC_API_URL`     | URL base da API        |

## Portas padrão

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Swagger:** http://localhost:8000/docs
- **Backend (Docker):** http://localhost:8001 (Swagger em /docs)
- **Supabase local (Docker):** http://localhost:54321
- **Postgres (Docker):** localhost:54322
