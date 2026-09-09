# Controle de acesso — Supabase (projeto separado, ver CLAUDE.md)

> **Status: Etapa A (desenho) — ainda não implementado no dashboard/tablets.**
> Nada aqui afeta produção até a Etapa E ser feita e testada.

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
- [ ] **Etapa B** — trocar login do dashboard pra Supabase Auth
- [ ] **Etapa C** — Edge Function como proxy (esconde o token do Apps Script do navegador)
- [ ] **Etapa D** — painel de administração (lista de usuários, convite, log)
- [ ] **Etapa E** — travar overlay de configuração do tablet só para admin + gravar log de configuração

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
