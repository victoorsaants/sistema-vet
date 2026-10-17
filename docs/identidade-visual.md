# Identidade visual — AjuVet+

Logo e paleta extraídas do protótipo (`AjuVet PDF_261013_100350.pdf`).

## Logo

Arquivos em [`frontend/public/brand`](../frontend/public/brand):

| Arquivo                    | Uso                                                        |
|----------------------------|------------------------------------------------------------|
| `ajuvet-logo.png`          | Logo completa (símbolo + nome + slogan), fundo transparente |
| `ajuvet-simbolo.png`       | Só o símbolo (cão, gato, estetoscópio e cruz), fundo transparente — favicon, avatar, telas pequenas |
| `ajuvet-logo-original.jpg` | Imagem original do PDF (1254×1254, fundo branco)           |

A logo transparente foi pensada para **fundos claros**. Em fundo escuro (ex.: a sidebar azul-marinho do protótipo) o azul-marinho some — o protótipo usa uma versão "negativa" (cão e "Aju" em branco), que ainda não existe como arquivo e precisa ser redesenhada, de preferência em SVG.

## Cores da marca

| Nome            | Hex       | Onde aparece                                |
|-----------------|-----------|---------------------------------------------|
| Azul-marinho    | `#073256` | Cão e "Aju" da logo, sidebar, títulos       |
| Azul AjuVet     | `#057FCF` | Cruz, estetoscópio e "Vet" da logo, destaques |

## Interface

Valores amostrados das telas do protótipo. Por serem imagens JPEG, considere uma margem de ±2 a 3 tons.

### Estrutura

| Token                 | Hex       | Uso                                         |
|-----------------------|-----------|---------------------------------------------|
| `sidebar`             | `#013253` | Fundo do menu lateral                       |
| `titlebar`            | `#00406E` | Barra superior da janela                    |
| `primary`             | `#0A4571` | Botão principal ("Entrar")                  |
| `menu-active`         | `#0789D6` | Item de menu selecionado, botões de ação, paginação |
| `background`          | `#F3FBFE` | Fundo da área de conteúdo                   |
| `background-login`    | `#F7F8FC` | Fundo da tela de login                      |
| `surface`             | `#FFFFFF` | Cards, tabelas, formulários                 |
| `border`              | `#E0E1E5` | Bordas de inputs e cards                    |
| `accent-soft`         | `#E3F5FC` | Botão de seta nos cards, "Ações rápidas"    |
| `accent-softer`       | `#D6F2FE` | Onda decorativa do cabeçalho                |
| `paw`                 | `#D2E4F9` | Patinhas decorativas                        |

### Texto

| Token            | Hex (aprox.) | Uso                                   |
|------------------|--------------|---------------------------------------|
| `text-heading`   | `#0B3D78`    | Títulos das páginas e dos cards       |
| `text-subtitle`  | `#2A72B5`    | Subtítulos                            |
| `text-body`      | `#6E99BF`    | Descrições em azul claro              |
| `text-muted`     | `#7790AE`    | Legendas, rodapé                      |
| `text-table`     | `#4F6A8C`    | Texto das tabelas                     |
| `placeholder`    | `#979DA6`    | Placeholder de inputs                 |

### Módulos (ícones do painel inicial)

| Módulo              | Hex       |
|---------------------|-----------|
| Tutores / Clientes  | `#2697E4` |
| Animais             | `#2CA558` |
| Atendimentos        | `#9C89CA` |
| Agendamentos        | `#FBAC32` |
| Histórico           | `#38BBC1` |
| Controle Financeiro | `#DA68A4` |

### Perfis de acesso (tela de login)

| Perfil       | Fundo     | Ícone / texto |
|--------------|-----------|---------------|
| Recepção     | `#DBECFC` | `#0574C5`     |
| Veterinário  | `#E0F2F0` | `#126E6E`     |

### Financeiro e status

| Token              | Fundo     | Texto / ícone |
|--------------------|-----------|---------------|
| Receita / Recebido | `#D0F8F1` | `#0B8979`     |
| Despesa / Pago     | `#FFE0ED` | `#EB5B78` (ícone), `#AA3268` (texto) |
| Saldo              | —         | `#118ED6`     |
| Total              | —         | `#9970C1`     |

## Variáveis CSS

```css
:root {
  --brand-navy: #073256;
  --brand-blue: #057fcf;

  --sidebar: #013253;
  --titlebar: #00406e;
  --primary: #0a4571;
  --menu-active: #0789d6;
  --background: #f3fbfe;
  --background-login: #f7f8fc;
  --surface: #ffffff;
  --border: #e0e1e5;
  --accent-soft: #e3f5fc;
  --accent-softer: #d6f2fe;

  --text-heading: #0b3d78;
  --text-subtitle: #2a72b5;
  --text-body: #6e99bf;
  --text-muted: #7790ae;

  --module-tutores: #2697e4;
  --module-animais: #2ca558;
  --module-atendimentos: #9c89ca;
  --module-agendamentos: #fbac32;
  --module-historico: #38bbc1;
  --module-financeiro: #da68a4;

  --success: #0b8979;
  --success-soft: #d0f8f1;
  --danger: #eb5b78;
  --danger-text: #aa3268;
  --danger-soft: #ffe0ed;
}
```
