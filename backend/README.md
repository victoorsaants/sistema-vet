# Backend — Sistema Vet

API REST em Python com FastAPI e Supabase.

## Pré-requisitos

- Python 3.11+
- Conta no [Supabase](https://supabase.com) (opcional na configuração inicial)

## Configuração

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edite o `.env` com as credenciais do Supabase quando disponíveis.

## Executar

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

| Método | Rota              | Descrição              |
|--------|-------------------|------------------------|
| GET    | `/`               | Informações da API     |
| GET    | `/docs`           | Documentação Swagger   |
| GET    | `/api/v1/health`  | Health check           |
