# Controle de acesso — Supabase (projeto separado, ver CLAUDE.md)

> **Status (2026-09-09): Etapas A-D concluídas e em produção no dashboard.**
> Só falta a Etapa E-2 parte 2 (travar config do tablet em `pesquisa.html`).
>
> - Projeto: **"Pesquisa Satisfacao - Controle de Acesso"** (org ISV Summit,
>   ref `fgsxqiywncarflpbxxgm`, região `sa-east-1`)
> - Schema aplicado (tabelas `perfis` e `log_auditoria`, RLS ativo) + migration
>   0002/0003 (papel `super_admin`, `perfis.municipios` como lista)
> - Autocadastro desativado, só provider de e-mail ativo
> - Super admin: **`tecnologiadainformacao@institutosaovicente.com.br`**
>   (institucional — vê/gerencia tudo)
> - `dashboard.html` já usa Supabase Auth pra login e a Edge Function
>   `dashboard-proxy` pra dados (token não fica mais no código-fonte)
> - Painel de administração em `admin.html` (convite de gestores, lista de
>   usuários, log de auditoria) — só super_admin acessa

## Por quê

Antes (v1.1.19), o dashboard usava **senha única compartilhada** (vinda da
aba `Configuracao`), sem identidade por pessoa — qualquer um com a senha
acessava, e o token de leitura dos dados ficava visível no código-fonte de
`dashboard.html`. Ver seção "Proteção de acesso aos dados" no `CLAUDE.md`
principal.

Trocado por login individual via **Supabase Auth** (convite, sem
autocadastro) + log de quem configurou qual tablet — pra detectar, por
exemplo, um supervisor de Pedra Branca configurando um equipamento de outro
município por engano.

**Atualização (2026-09-09, decisão do gestor):** gestores e visualizadores
não veem outros municípios além do(s) próprio(s) — só o super_admin (TI) vê
tudo. Uma pessoa pode estar ligada a mais de 1 município (supervisor
regional). Ver seção "Papéis" abaixo.

## Etapas do projeto

- [x] **Etapa A** — schema (`schema.sql` + migrations 0002/0003), papéis, auditoria
- [x] **Etapa B** — login do dashboard via Supabase Auth
- [x] **Etapa C** — Edge Function `dashboard-proxy` (token escondido, filtro por município)
- [x] **Etapa D** — painel de administração (`admin.html`), Edge Function `admin-convidar`
- [ ] **Etapa E-2 (parte 2)** — travar overlay de configuração do tablet em `pesquisa.html` só para admin/super_admin + gravar log de `config_tablet`. Ainda não feita de propósito — é o arquivo mais sensível de produção (4 tablets ao vivo).

## Papéis

| Papel | Escopo | Pode |
|---|---|---|
| `super_admin` | Tudo | Ver/gerenciar todos os municípios, convidar usuários (`admin.html`), configurar qualquer tablet, ver log de auditoria completo |
| `admin` (gestor) | `perfis.municipios` (lista) | Configurar tablet e ver dashboard só do(s) próprio(s) município(s). **Não** gerencia outros usuários |
| `visualizador` | `perfis.municipios` (lista) | Só ver o dashboard do(s) próprio(s) município(s) |

## Convidar um gestor/visualizador novo

1. Logar em `admin.html` como super_admin
2. Preencher e-mail, papel, e os municípios (separados por vírgula se for mais de 1)
3. A pessoa recebe o convite por e-mail e define a própria senha em `aceitar-convite.html`

## O que fica registrado (log_auditoria)

- **Convite**: quem convidou, quando, e-mail convidado, papel e municípios atribuídos
- **Login**: quem entrou, quando
- **Configuração de tablet** (ainda não implementado — Etapa E-2 parte 2): quem configurou, município/unidade escolhidos, comparação com os municípios esperados do usuário (`divergente: true/false`)

## Notas de infraestrutura (bugs reais já corrigidos, pra não repetir)

- **CORS**: toda Edge Function chamada do navegador (não só server-to-server) precisa responder o preflight `OPTIONS` e mandar `Access-Control-Allow-*` em toda resposta — sem isso o navegador bloqueia mesmo com o servidor respondendo 200.
- **`verify_jwt`**: por padrão a plataforma Supabase exige JWT válido antes do código da function rodar — isso bloqueia o preflight `OPTIONS` (sem header de auth). Functions que fazem sua própria verificação de JWT internamente (ambas as deste projeto) precisam de `verify_jwt = false` em `supabase/config.toml`.
- **User-Agent no fetch pro Apps Script**: o fetch do Deno sem UA explícito às vezes faz o Google devolver uma página de erro do Drive em vez de seguir o redirect até o JSON real — `dashboard-proxy` manda um UA de navegador explícito por causa disso.
- **Rate limit do plano free**: testes muito seguidos no mesmo dia podem devolver `WORKER_RESOURCE_LIMIT` temporário — não é bug de código, passa depois de uma pausa curta.
