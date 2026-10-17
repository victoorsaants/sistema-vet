# AjuVet+

Sistema de gestão para clínicas veterinárias: cadastro de tutores e animais, agenda dos
veterinários, atendimentos, prescrições e controle financeiro.

## Stack

- **Frontend:** React + Next.js 16 (`/frontend`)
- **Backend:** Python + FastAPI (`/backend`)
- **Banco de dados:** PostgreSQL 15 local, com migrations prontas para o Supabase (`/supabase`)

## Estrutura

```
sistema-vet/
├── backend/            # API REST (com Dockerfile)
├── frontend/           # Interface web (com Dockerfile)
├── supabase/           # Migrations e dados de exemplo do banco
├── docs/               # Documentação
└── docker-compose.yml  # Banco, backend e frontend em containers
```

## Como executar com Docker

É o jeito mais simples: só precisa do [Docker Desktop](https://www.docker.com/products/docker-desktop/).
Cada parte roda no seu próprio container:

| Container | O que é | Endereço |
|-----------|---------|----------|
| `frontend` | Next.js em modo produção | http://localhost:3000 |
| `backend` | API FastAPI; aplica as migrations ao subir | http://localhost:8000/docs |
| `banco` | PostgreSQL 15 | `localhost:5433` |

Na raiz do projeto, crie o arquivo de configuração:

```bash
copy .env.example .env
```

No Linux ou macOS, use `cp .env.example .env`. Gere um segredo e cole em `JWT_SEGREDO` no `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Suba tudo:

```bash
docker compose up -d --build
```

Na primeira vez, o build demora alguns minutos. Com `CARREGAR_DADOS_EXEMPLO=true` (padrão do
`.env.example`), o banco já vem com os usuários e dados de exemplo da tabela abaixo.

| Comando | Para quê |
|---------|----------|
| `docker compose ps` | Ver se os três containers estão `healthy` |
| `docker compose logs -f backend` | Acompanhar o log da API |
| `docker compose up -d --build` | Aplicar mudanças no código (reconstrói as imagens) |
| `docker compose down` | Parar tudo; os dados continuam nos volumes |
| `docker compose down -v` | Parar e **apagar** banco, anexos e e-mails salvos |
| `docker compose exec backend python -m scripts.criar_usuario --email ... --nome ... --perfil recepcao` | Criar usuário da recepção |

Os dados ficam em dois volumes: `banco_ajuvet` (PostgreSQL) e `arquivos_ajuvet` (anexos de exames
e e-mails salvos quando o SMTP não está configurado). Portas, senha do banco e SMTP se ajustam
no `.env`. Se o sistema for publicado com HTTPS, use `COOKIE_SEGURO=true`.

> A porta 3000 é a mesma do `npm run dev`. Para usar os dois ao mesmo tempo, mude
> `PORTA_FRONTEND` e `URL_FRONTEND` no `.env`. O mesmo vale para a porta 5433, se o banco local
> (`banco_local.ps1`) estiver rodando.

## Como executar sem Docker (desenvolvimento)

### Pré-requisitos

- Python 3.11 ou mais recente
- Node.js 20 ou mais recente
- PostgreSQL 15 instalado ([download](https://www.postgresql.org/download/windows/)) **ou** Docker

### 1. Backend e banco

No terminal, dentro da pasta do projeto:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt
copy .env.example .env
```

No Linux ou macOS, use `source venv/bin/activate` e `cp .env.example .env`.

Gere um segredo para os tokens de login e cole em `JWT_SEGREDO` no `backend/.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Suba o banco local. Ele fica na porta 5433, numa pasta só do projeto, sem mexer em outro
PostgreSQL da máquina:

```bash
powershell -ExecutionPolicy Bypass -File scripts\banco_local.ps1 iniciar
```

Se preferir o banco em Docker, suba só ele com `docker compose up -d banco` e use
`DATABASE_URL=postgresql://postgres:ajuvet@localhost:5433/ajuvet` no `backend/.env`.

Crie as tabelas e carregue os dados de exemplo:

```bash
python -m scripts.migrar --seed
```

Suba a API:

```bash
uvicorn app.main:app --reload --port 8000
```

A API fica em http://localhost:8000 e a documentação interativa em http://localhost:8000/docs.

### 2. Frontend

Em **outro terminal**, com o backend ainda rodando:

```bash
cd frontend
npm install
```

```bash
copy .env.example .env.local
```

No Linux ou macOS, use `cp .env.example .env.local`. O valor padrão já aponta para o backend local.

```bash
npm run dev
```

Abra http://localhost:3000 e entre com um dos usuários de exemplo (senha `ajuvet123`):

| E-mail | Perfil |
|--------|--------|
| `recepcao@ajuvet.local` | Recepção |
| `mariana.costa@ajuvet.local` | Veterinária |

Veterinários e o acesso deles são cadastrados pela tela **Veterinários** (menu da recepção). Para
criar usuários da recepção, veja o [README do backend](./backend/README.md#criar-usuários).

### No dia a dia

Depois da primeira vez, basta:

1. `backend\scripts\banco_local.ps1 iniciar` (se o computador foi reiniciado)
2. `python -m scripts.migrar` dentro de `backend`, se alguém adicionou migrations novas
3. `uvicorn app.main:app --reload --port 8000` dentro de `backend`, com a venv ativa
4. `npm run dev` dentro de `frontend`

Os e-mails ao tutor (receita e lembretes) não saem para a internet enquanto o SMTP não for
configurado: eles ficam como arquivos `.eml` em `backend/.arquivos/emails`. Veja o
[README do backend](./backend/README.md#notificações-ao-tutor).

## Comandos úteis

| Onde        | Comando              | Para quê |
|-------------|----------------------|----------|
| `backend/`  | `python -m pytest`   | Roda os testes da API (os de integração usam o banco local) |
| `backend/`  | `python -m scripts.migrar` | Aplica migrations novas |
| `backend/`  | `python -m scripts.enviar_notificacoes` | Envia na hora as mensagens ao tutor que já passaram do horário |
| `backend/`  | `scripts\banco_local.ps1 parar` | Para o banco local |
| `frontend/` | `npm run lint`       | Verifica problemas no código |
| `frontend/` | `npm run build`      | Gera a versão de produção |

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| "Serviço indisponível" no login | Backend parado, ou banco parado (`banco_local.ps1 status`) |
| Erro 500 e `Configure JWT_SEGREDO` no terminal do backend | Falta preencher `JWT_SEGREDO` no `backend/.env` |
| "Usuário sem acesso ao sistema" | O veterinário está inativo (tela Veterinários) ou o login não tem linha na tabela `perfis` |
| Veterinário não aparece na agenda | Está inativo ou sem expediente; confira em Veterinários e em Agendamentos → Expediente |
| Agendamentos sem horários livres | O veterinário não tem expediente cadastrado; configure em Agendamentos → Expediente dos veterinários |
| Receita não chegou ao tutor | Veja a tela Notificações: sem e-mail no cadastro fica "Com falha"; sem SMTP configurado, o e-mail fica em `backend/.arquivos/emails` |
| `Another next dev server is already running` | Já existe um `npm run dev` aberto em outro terminal; feche-o ou use o que já está rodando |

## Documentação

Consulte a pasta [`/docs`](./docs/README.md) para arquitetura, modelo de dados e identidade visual.
