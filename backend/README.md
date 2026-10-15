# Backend — AjuVet+

API REST em Python com FastAPI e PostgreSQL.

O banco roda localmente por enquanto. As migrations ficam em `supabase/migrations` e são
compatíveis com o Supabase: para migrar, basta aplicá-las lá e trocar a `DATABASE_URL`.

## Pré-requisitos

- Python 3.11+
- PostgreSQL 15 instalado ([download](https://www.postgresql.org/download/windows/)) **ou** Docker

## Configuração

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt
copy .env.example .env
```

No Linux/macOS, use `source venv/bin/activate` e `cp .env.example .env`.

Gere um segredo para os tokens de login e cole em `JWT_SEGREDO` no `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## Banco de dados local

O script cria um banco só do projeto em `.banco_local/` (ignorado pelo git), na porta
**5433**. Ele não mexe em outra instalação do PostgreSQL que exista na máquina.

```bash
powershell -ExecutionPolicy Bypass -File scripts\banco_local.ps1 iniciar
```

Também aceita `parar` e `status`. Quem preferir Docker pode usar `docker compose up -d banco` na
raiz do repositório, que sobe o mesmo banco na mesma porta (com senha: use
`postgresql://postgres:ajuvet@localhost:5433/ajuvet` na `DATABASE_URL`).

Para rodar a API inteira em container, veja [Como executar com Docker](../README.md#como-executar-com-docker).
O container aplica as migrations ao subir e, com `CARREGAR_DADOS_EXEMPLO=true`, carrega os dados
de exemplo se o banco estiver vazio (`python -m scripts.migrar --seed-se-vazio`).

Crie as tabelas e carregue os dados de exemplo:

```bash
python -m scripts.migrar --seed
```

O `--seed` cria dois usuários de teste, ambos com a senha `ajuvet123`:

| E-mail | Perfil |
|--------|--------|
| `recepcao@ajuvet.local` | Recepção |
| `mariana.costa@ajuvet.local` | Veterinária (Dra. Mariana Costa) |

Sem `--seed`, o script só aplica as migrations novas. Pode rodar quantas vezes quiser.

## Criar usuários

Veterinários e o login deles são cadastrados pela tela **Veterinários**, no menu da recepção.
O script abaixo continua útil para criar usuários da recepção.

Cada usuário tem login em `auth.users` (senha com bcrypt) e um perfil na tabela `perfis`. O
script cria os dois e pede a senha no terminal:

```bash
python -m scripts.criar_usuario --email ana@clinica.com --nome Ana --perfil recepcao
```

Para veterinários, informe o CRMV. Se ainda não houver veterinário com esse CRMV, ele é
cadastrado; se houver, o login é ligado a ele:

```bash
python -m scripts.criar_usuario --email paulo@clinica.com --nome "Dr. Paulo Henrique" --perfil veterinario --crmv "CRMV-SE 0002" --especialidade Dermatologia
```

## Executar

```bash
uvicorn app.main:app --reload --port 8000
```

## Testes

```bash
python -m pytest
```

Os testes em `tests/integracao` usam o banco local: criam a base `ajuvet_teste` do zero,
aplicam as migrations e desfazem tudo ao final de cada teste. Se o banco não estiver rodando,
eles são pulados.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/v1/health` | Health check, inclusive da conexão com o banco |
| POST   | `/api/v1/auth/login` | Login com e-mail e senha; devolve tokens e usuário |
| POST   | `/api/v1/auth/renovar` | Nova sessão a partir do `refresh_token` |
| GET    | `/api/v1/auth/me` | Usuário do token (`Authorization: Bearer`) |
| POST   | `/api/v1/auth/logout` | Encerra a sessão do token |
| GET    | `/api/v1/tutores` | Lista tutores (`busca`, `pagina`, `tamanho`). Só Recepção |
| POST   | `/api/v1/tutores` | Cadastra tutor. Só Recepção |
| GET    | `/api/v1/tutores/{id}` | Dados do tutor. Só Recepção |
| PUT    | `/api/v1/tutores/{id}` | Atualiza tutor. Só Recepção |
| GET    | `/api/v1/animais` | Lista animais (`busca`, `tutor_id`, `pagina`, `tamanho`). Recepção e Veterinário |
| POST   | `/api/v1/animais` | Cadastra animal. Só Recepção |
| GET    | `/api/v1/animais/{id}` | Ficha do animal com o tutor. Recepção e Veterinário |
| PUT    | `/api/v1/animais/{id}` | Atualiza animal (inclusive trocar o tutor). Só Recepção |
| GET    | `/api/v1/veterinarios` | Veterinários ativos. Recepção e Veterinário |
| GET    | `/api/v1/veterinarios/cadastros` | Todos os veterinários, com acesso e agendamentos futuros. Só Recepção |
| POST   | `/api/v1/veterinarios` | Cadastra veterinário, com ou sem login (`email_login`, `senha_login`). Só Recepção |
| GET/PUT | `/api/v1/veterinarios/{id}` | Consulta ou edita dados e situação (`ativo`). Só Recepção |
| PUT    | `/api/v1/veterinarios/{id}/acesso` | Cria o login ou troca e-mail/senha. Só Recepção |
| GET/PUT | `/api/v1/veterinarios/{id}/expediente` | Horário semanal do veterinário. Só Recepção |
| GET/POST | `/api/v1/veterinarios/{id}/folgas` | Folgas e férias futuras. Só Recepção |
| DELETE | `/api/v1/veterinarios/{id}/folgas/{folga_id}` | Remove uma folga. Só Recepção |
| GET    | `/api/v1/veterinarios/{id}/agenda?inicio=AAAA-MM-DD&dias=7` | Horários de cada dia, livres ou não |
| GET    | `/api/v1/agendamentos` | Agendamentos a partir de agora (`de`, `ate`, `veterinario_id`, `status`). O veterinário só vê os dele |
| POST   | `/api/v1/agendamentos` | Agenda um horário da grade. Só Recepção |
| GET    | `/api/v1/agendamentos/{id}` | Dados do agendamento |
| PATCH  | `/api/v1/agendamentos/{id}/status` | Confirmar, cancelar ou registrar falta. Só Recepção |
| GET    | `/api/v1/atendimentos` | Atendimentos (`status`, `animal_id`, `meus=true` para os do veterinário logado) |
| POST   | `/api/v1/atendimentos` | Inicia atendimento a partir de um agendamento ou avulso (`animal_id` + `tipo`). Só Veterinário |
| GET    | `/api/v1/atendimentos/{id}` | Atendimento completo: sinais vitais, exames, vacinas, prescrição e anexos |
| PUT    | `/api/v1/atendimentos/{id}` | Salva o registro clínico (rascunho). Só o veterinário responsável |
| POST   | `/api/v1/atendimentos/{id}/finalizar` | Finaliza: trava a edição, conclui o agendamento, atualiza o peso do animal e programa a receita e os lembretes |
| POST   | `/api/v1/atendimentos/{id}/anexos` | Envia um resultado de exame (`multipart/form-data`, campo `arquivo`) |
| DELETE | `/api/v1/atendimentos/{id}/anexos/{anexo_id}` | Remove um anexo enquanto o atendimento está em andamento |
| GET    | `/api/v1/anexos/{id}/arquivo` | Abre o arquivo anexado |
| GET    | `/api/v1/animais/{id}/historico` | Linha do tempo e resumo clínico (`tipo`, `de`, `ate`, `pagina`, `tamanho`) |
| GET    | `/api/v1/notificacoes` | Fila de mensagens ao tutor (`status`, `tipo`, `atendimento_id`, `busca`, `pagina`, `tamanho`) |
| GET    | `/api/v1/notificacoes/resumo` | Quantas estão atrasadas, programadas e com falha. Só Recepção |
| POST   | `/api/v1/notificacoes/enviar` | Envia agora as mensagens que já passaram do horário. Só Recepção |
| POST   | `/api/v1/notificacoes/{id}/reenviar` | Coloca de volta na fila uma mensagem enviada, com falha ou cancelada |
| POST   | `/api/v1/notificacoes/{id}/cancelar` | Cancela uma mensagem que ainda não saiu |
| GET    | `/api/v1/financeiro/categorias` | Categorias de receita e despesa (`tipo`). Só Recepção |
| GET    | `/api/v1/financeiro/resumo?mes=AAAA-MM-DD` | Painel do mês: totais, comparação com o mês anterior, fluxo de 6 meses, despesas por categoria. Só Recepção |
| GET    | `/api/v1/financeiro/lancamentos` | Extrato com totais (`tipo`, `status`, `categoria_id`, `atendimento_id`, `de`, `ate`, `busca`). Só Recepção |
| POST   | `/api/v1/financeiro/lancamentos` | Registra receita ou despesa, já paga ou pendente. Só Recepção |
| GET/PUT | `/api/v1/financeiro/lancamentos/{id}` | Consulta ou edita um lançamento pendente. Só Recepção |
| POST   | `/api/v1/financeiro/lancamentos/{id}/pagar` | Registra o recebimento/pagamento (`forma_pagamento`). Só Recepção |
| POST   | `/api/v1/financeiro/lancamentos/{id}/cancelar` | Cancela o lançamento (pendente ou pago). Só Recepção |
| GET    | `/api/v1/financeiro/relatorio` | Relatório CSV (separado por `;`, abre no Excel) com os mesmos filtros do extrato. Só Recepção |

Erros de validação voltam com status 422 e a mensagem de cada campo em português:

```json
{
  "detail": "Verifique os campos destacados.",
  "campos": { "cpf": "CPF inválido.", "cep": "Campo obrigatório." }
}
```

CPF ou microchip repetidos, e horários que acabaram de ser ocupados, voltam com status 409.

### Regras da agenda

- Os horários saem do expediente: cada faixa (ex.: 08:00–12:00) é dividida pela duração
  escolhida (ex.: 30 min).
- Um horário fica indisponível se já passou, se cai numa folga ou se já tem agendamento ativo.
  Cancelar ou registrar falta libera o horário.
- Só dá para agendar exatamente um horário da grade. O banco também impede dois agendamentos
  ativos do mesmo veterinário no mesmo período, mesmo com duas pessoas agendando ao mesmo tempo.
- Status: `agendado` → `confirmado`, `cancelado` ou `faltou`; `confirmado` → `cancelado` ou `faltou`.
- O fuso horário da clínica é `FUSO_HORARIO` no `.env` (padrão `America/Maceio`).

### Regras dos atendimentos

- Só o veterinário cujo login está ligado ao cadastro de veterinário pode iniciar, editar e
  finalizar. A recepção consulta, mas não altera dados clínicos.
- Iniciar a partir de um agendamento muda o status dele para `em_atendimento`; finalizar muda
  para `concluido`. Abrir de novo o mesmo agendamento retoma o atendimento existente.
- Cada salvamento substitui exames, vacinas e prescrição pelo que foi enviado. Depois de
  finalizado, o atendimento não pode mais ser alterado.
- O intervalo de cada medicamento (ex.: "2 vezes ao dia" → 12 h) é calculado e guardado em
  `itens_prescricao.intervalo_horas`; é ele que define os horários dos lembretes de remédio.
- Anexos: PDF, JPG, PNG ou WEBP de até `TAMANHO_MAXIMO_ANEXO_MB` (padrão 10). O tipo é
  conferido pelo conteúdo do arquivo, não pela extensão. Os arquivos ficam em `backend/.arquivos`
  (configurável em `PASTA_ARQUIVOS`), fora do git; na migração vão para o bucket `anexos` do
  Supabase Storage.

### Regras dos veterinários

- O CRMV é gravado em maiúsculas e não pode se repetir; o e-mail de login também é único.
- A senha precisa ter pelo menos 8 caracteres. Trocar a senha desconecta o veterinário.
- Desativar tira o veterinário da agenda e bloqueia o login na hora. Não é permitido enquanto
  houver agendamentos futuros dele; os atendimentos antigos continuam no histórico.

### Notificações ao tutor

As mensagens vão por e-mail para o endereço do cadastro do tutor e ficam na tabela
`notificacoes`, que funciona como fila:

| Quando | Mensagem | Sai em |
|--------|----------|--------|
| Atendimento finalizado com prescrição | Receita (medicamentos, orientações e retorno) | Na hora |
| Medicamento com frequência e duração | Lembrete de remédio, um por horário de dose | A partir da hora cheia seguinte à finalização, no intervalo do medicamento (até 90 por receita) |
| Atendimento com data de retorno | Lembrete de retorno | Às 9h da véspera |
| Vacina com próxima dose | Lembrete de vacina | Às 9h, 3 dias antes |
| Agendamento criado | Lembrete de consulta | 24 h antes (ou na hora, se faltar menos) |

- Cancelar um agendamento ou registrar falta cancela o lembrete que ainda não saiu.
- O backend envia sozinho, a cada `INTERVALO_ENVIO_SEGUNDOS` (padrão 60). Para desligar, use
  `ENVIO_AUTOMATICO_NOTIFICACOES=false` e rode `python -m scripts.enviar_notificacoes` num
  agendador de tarefas.
- O endereço é lido na hora do envio. Tutor sem e-mail deixa a mensagem "com falha"; depois de
  corrigir o cadastro, a recepção usa "Reenviar". Erros do servidor de e-mail são tentados de
  novo mais duas vezes, com 5 e 10 minutos de intervalo.
- Sem `SMTP_HOST` no `.env`, nada sai para a internet: cada e-mail vira um arquivo `.eml` em
  `backend/.arquivos/emails` (abre no Outlook ou no Thunderbird). Para enviar de verdade,
  preencha `SMTP_HOST`, `SMTP_PORTA`, `SMTP_USUARIO`, `SMTP_SENHA` e `EMAIL_REMETENTE`.
- `NOME_CLINICA` e `CONTATO_CLINICA` aparecem no fim de cada mensagem.

### Regras do financeiro

- Todo lançamento tem tipo (receita ou despesa), categoria do mesmo tipo, valor com até duas
  casas decimais e data. Pode ser registrado já pago (exige forma de pagamento) ou pendente,
  com vencimento opcional.
- Só lançamentos pendentes podem ser editados. Pago ou pendente pode ser cancelado; cancelados
  não entram nos totais.
- No painel do mês, receitas, despesas e saldo somam só o que foi pago, pela data do
  lançamento. Os pendentes aparecem como "a receber" e "a pagar".
- Uma receita pode ser ligada a um atendimento; se o tutor não for informado, vem do animal.

Para proteger uma rota por perfil, use a dependência `exigir_perfis`:

```python
@router.get("/financeiro/resumo")
def resumo(usuario: UsuarioLogado = Depends(exigir_perfis(PerfilUsuario.RECEPCAO))):
    ...
```
