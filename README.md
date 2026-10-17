# Sistema Vet

Sistema para consultório veterinário.

## Stack

- **Frontend:** React + Next.js (`/frontend`)
- **Backend:** Python + FastAPI (`/backend`)
- **Banco de dados:** Supabase
- **Infra local:** Docker Compose

## Estrutura

```
sistema-vet/
├── backend/             # API REST
├── frontend/            # Interface web
├── docker/              # Configuração do banco e do gateway (Docker)
├── scripts/             # Utilitários
├── docs/                # Documentação
└── docker-compose.yml
```

## Início rápido com Docker (recomendado)

Sobe frontend, backend e banco de dados (Supabase local) com um único comando.
Requer [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env         # Windows: copy .env.example .env
docker compose up -d --build
```

| Serviço             | URL                          |
|---------------------|------------------------------|
| Frontend            | http://localhost:3000        |
| Backend (API)       | http://localhost:8001        |
| Swagger             | http://localhost:8001/docs   |
| API do Supabase     | http://localhost:54321       |
| Postgres            | `localhost:54322` (usuário `postgres`, senha `POSTGRES_PASSWORD` do `.env`) |

Comandos úteis:

```bash
docker compose ps                # status dos containers
docker compose logs -f backend   # logs de um serviço
docker compose down              # para tudo (mantém os dados do banco)
docker compose down -v           # para tudo e APAGA os dados do banco
```

Detalhes em [`docs/docker.md`](./docs/docker.md).

## Início rápido sem Docker

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # Windows
uvicorn app.main:app --reload --port 8000
```

API disponível em http://localhost:8000 — documentação em http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponível em http://localhost:3000

## Documentação

Consulte a pasta [`/docs`](./docs/README.md) para detalhes de arquitetura e guias.
