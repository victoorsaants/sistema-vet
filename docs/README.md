# Documentação — AjuVet+

Documentos do projeto de consultório veterinário.

## Índice

- [Arquitetura](./arquitetura.md)
- [Identidade visual](./identidade-visual.md)
- [Modelo de dados](./modelo-dados.md)
- [Backend](../backend/README.md)
- [Frontend](../frontend/README.md)

## Visão geral

O **Sistema Vet** é uma aplicação web para gestão de consultório veterinário, composta por:

| Camada    | Tecnologia        | Pasta       |
|-----------|-------------------|-------------|
| Frontend  | React + Next.js   | `/frontend` |
| Backend   | Python + FastAPI  | `/backend`  |
| Banco     | PostgreSQL (local; Supabase depois) | `/supabase` |

## Próximos passos

1. ~~Banco de dados~~ — PostgreSQL local; migrar para o Supabase depois (ver [Modelo de dados](./modelo-dados.md#supabase-futuro))
2. ~~Definir modelos de dados~~ — feito
3. ~~Implementar autenticação~~ — feito (ver [Arquitetura](./arquitetura.md#autenticação-rf01))
4. ~~Cadastro de tutores e animais (RF04)~~ — feito
5. ~~Agendamentos e expediente dos veterinários (RF05)~~ — feito
6. ~~Atendimentos, prescrição e histórico clínico (RF02)~~ — feito
7. ~~Notificações ao tutor: receita e lembretes (restante do RF03)~~ — feito, por e-mail (ver [Backend](../backend/README.md#notificações-ao-tutor))
8. ~~Controle financeiro (RF06)~~ — feito
9. Migrar para o Supabase (banco e arquivos)
10. WhatsApp como segundo canal de notificação (a tabela já aceita `whatsapp` e `sms`)
