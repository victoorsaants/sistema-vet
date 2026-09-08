# Sistema Vet

Sistema para consultório veterinário.

## Stack

- **Frontend:** React + Next.js (`/frontend`)
- **Backend:** Python + FastAPI (`/backend`)
- **Banco de dados:** Supabase

## Estrutura

```
sistema-vet/
├── backend/    # API REST
├── frontend/   # Interface web
└── docs/       # Documentação
```

## Início rápido

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
