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
├── docs/             # Documentação do projeto
└── README.md
```

## Fluxo de comunicação

```
┌─────────────┐     HTTP/REST      ┌─────────────┐     Supabase SDK     ┌─────────────┐
│   Frontend  │ ─────────────────► │   Backend   │ ───────────────────► │  Supabase   │
│  (Next.js)  │   localhost:3000   │  (FastAPI)  │                      │ (PostgreSQL)│
└─────────────┘   localhost:8000   └─────────────┘                      └─────────────┘
```

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
