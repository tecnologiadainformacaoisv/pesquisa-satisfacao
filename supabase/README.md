# Controle de acesso — Supabase (projeto separado, ver CLAUDE.md)

> **Status (2026-09-09): projeto Supabase criado e schema aplicado.**
> Nada aqui afeta produção até a Etapa E ser feita e testada — dashboard.html
> continua com a senha compartilhada de sempre por enquanto.
>
> - Projeto: **"Pesquisa Satisfacao - Controle de Acesso"** (org ISV Summit,
>   ref `fgsxqiywncarflpbxxgm`, região `sa-east-1`)
> - Schema aplicado (tabelas `perfis` e `log_auditoria`, RLS ativo)
> - Autocadastro desativado, só provider de e-mail ativo
> - Primeiro admin convidado: **`tecnologiadainformacao@institutosaovicente.com.br`**
>   (institucional — todo acesso admin fica atrelado ao Instituto, não a
>   e-mail pessoal) — checar essa caixa de entrada (e spam) pra confirmar o
>   convite e definir a senha

## Por quê

Hoje (v1.1.19) o dashboard usa **senha única compartilhada** (vinda da aba
`Configuracao`), sem identidade por pessoa — qualquer um com a senha acessa,
e o token de leitura dos dados fica visível no código-fonte de
`dashboard.html`. Ver seção "Proteção de acesso aos dados" no `CLAUDE.md`
principal.

Decidido em 2026-09 (conversa com o Henrique): trocar por login individual
via **Supabase Auth**, com convite (sem autocadastro), 2 papéis (admin /
visualizador), e log de quem configurou qual tablet — pra detectar, por
exemplo, um supervisor de Pedra Branca configurando um equipamento de outro
município por engano.

## Etapas do projeto

- [x] **Etapa A** — desenho do schema (`schema.sql`), papéis e auditoria
- [x] **Etapa B (código pronto, não conectado)** — `etapa-b-login-dashboard.js`: login via Supabase Auth, log de auditoria, leitura de papel
- [x] **Etapa C (código pronto, não conectado)** — `functions/dashboard-proxy/index.ts`: Edge Function que esconde o token do Apps Script do navegador
- [ ] **Etapa D** — painel de administração (lista de usuários, convite, log)
- [ ] **Etapa E** — travar overlay de configuração do tablet só para admin + gravar log de configuração

### Etapas B/C — como ativar (depois que o projeto Supabase existir)

1. Preencher `SUPABASE_URL`/`SUPABASE_ANON_KEY` em `etapa-b-login-dashboard.js`
2. `supabase functions deploy dashboard-proxy` (ver instruções no topo do `index.ts`)
3. Configurar os secrets `APPS_SCRIPT_URL`/`APPS_SCRIPT_TOKEN`/`SUPABASE_URL`/`SUPABASE_ANON_KEY` da function
4. Só então trocar o login de `dashboard.html` — nunca antes, senão a equipe perde acesso (ninguém tem conta Supabase ainda)

## Como criar o projeto Supabase (manual, feito por você — não tenho acesso à sua conta)

1. Ir em https://supabase.com → criar projeto novo (plano free serve)
2. **Authentication → Providers**: deixar só "Email" ativo (desativar os outros)
3. **Authentication → Settings**: desativar "Allow new users to sign up" — ninguém cria conta própria, só admin convida
4. **SQL Editor**: colar o conteúdo de `schema.sql` inteiro → Run
5. **Authentication → Users → Invite user**: convidar você mesmo (ou o Henrique) primeiro
6. Rodar o UPDATE comentado no fim do `schema.sql`, trocando o e-mail, pra virar o primeiro admin
7. Me avisar quando tiver feito — sigo com a Etapa B (troca do login do dashboard)

## Papéis

| Papel | Pode |
|---|---|
| `admin` | Configurar tablets, convidar usuários, ver dashboard completo, ver log de auditoria |
| `visualizador` | Só ver o dashboard |

## O que fica registrado

- **Convite**: quem convidou, quando, e-mail convidado, papel atribuído
- **Login**: quem entrou, quando
- **Configuração de tablet**: quem configurou, município/unidade escolhidos, comparação com o município/unidade esperado do usuário (`divergente: true/false`)
