# Pesquisa de Satisfação ISV — CLAUDE.md

> Contexto para Claude Code. Leia antes de qualquer tarefa.

---

## Versão atual

**v1.1.18** — em produção desde 2026-06-12.

---

## ⚠️ Modo de operação (a partir de setembro/2026): produção plena, só manutenção

A implantação **acabou** — a partir de setembro/2026 os 4 tablets estão rodando
**100% em uso real** nas unidades de Caucaia, coletando dados de pacientes de
verdade o tempo todo. Não é mais fase de piloto/teste: **os totens já estão lá
e não há como buscá-los de volta com facilidade** se algo quebrar.

Isso muda a postura esperada em qualquer tarefa daqui pra frente:

- **Toda mudança em `pesquisa.html`, `sw.js` ou `appscript/codigo.js` é
  potencialmente arriscada** — quebrar o formulário do paciente ou o envio de
  dados agora significa uma unidade de saúde sem conseguir coletar pesquisa,
  não um ambiente de teste.
- **Preferir o menor diff possível** que resolve o problema relatado, em vez
  de aproveitar pra reestruturar/otimizar código adjacente "já que estou aqui".
- **Rodar o revisor em toda mudança, sem exceção** (já é prática desta sessão,
  mas agora é regra dura — não só para o formulário/backend, para qualquer
  arquivo).
- **Testar contra o endpoint real antes de considerar concluído** quando a
  mudança tocar em envio/leitura de dados (como já vem sendo feito).
- **Sempre bumpar o Service Worker** em toda mudança de CSS/JS, mesmo pequena
  — sem isso o tablet não recebe o fix.
- Evoluções maiores de arquitetura (paginação, mudança de datastore, Fase 2 de
  escala) continuam válidas para planejar, mas não devem ser misturadas com
  correções de manutenção — tratar como projetos separados, com mais tempo de
  validação antes de ir para os tablets em produção.

Resumindo: a partir de agora, o objetivo de qualquer tarefa aqui é **não
quebrar o que já está rodando**, não "melhorar mais rápido".

---

## Visão geral

PWA de pesquisa de satisfação de pacientes do **Instituto São Vicente (ISV)**, instalada em tablets fixos nas unidades de saúde. Pacientes respondem ao formulário; os dados vão para uma planilha Google Sheets via Apps Script. Uma equipe interna acessa o dashboard para visualizar métricas.

**Objetivo:** coletar NPS e avaliações por estrelas (recepção, limpeza, atendimento, espera) + comentário opcional, funcionando offline e sincronizando quando a conexão retorna.

**Stack:**
- Frontend: HTML/CSS/JS puro (sem framework), PWA com Service Worker
- Backend: Google Apps Script (doGet / doPost)
- Dados: Google Sheets (planilha `1b-QuMPD99jZm36JqC3A1tSzhkAaRfjKPvhqalnw_jmw`)
- Deploy: GitHub Pages — URL base `/pesquisa-satisfacao/`
- Gráficos: Chart.js (dashboard)

---

## Ecossistema ISV / Desenvolvimento

Projeto na pasta `Desenvolvimento/`. Padrões globais em:

- **Comandos e agentes:** `~/.claude/` — `/atualizar`, `/encerrar`, agente `revisor`
- **Assets/estilos compartilhados:** `../shared/`
- **Referência de comandos:** `../COMANDOS-CLAUDE.md`

> **NÃO ler** outras pastas de projeto (`projeto-*`, `pessoal-*`) a menos que explicitamente solicitado.

---

## Estrutura de arquivos

```
projeto-pesquisa-satisfacao/
├── README.md               ← visão geral e instruções
├── CHANGELOG.md            ← histórico de versões
├── CLAUDE.md               ← este arquivo
├── index.html              ← tela inicial (links para pesquisa e dashboard)
├── pesquisa.html           ← formulário multi-step (paciente)
├── dashboard.html          ← painel administrativo (senha protegido)
├── sw.js                   ← Service Worker (cache-first + fila offline) — raiz por escopo
├── manifest.json           ← PWA manifest (start_url: pesquisa.html)
├── manifest-dashboard.json ← PWA manifest do dashboard
├── .clasp.json             ← config clasp (rootDir: appscript) — raiz
├── assets/                 ← imagens locais do projeto
│   ├── logo-72.png / logo-192.png / logo-512.png / Logo-isv.svg
│   └── municipios/caucaia.png
├── css/
│   └── instituto.css       ← estilos base do ISV
├── appscript/              ← backend Google Apps Script
│   ├── codigo.js           ← Apps Script (doGet, doPost, endpoints)
│   ├── appsscript.json
│   └── deploy.ps1
└── docs/                   ← documentos e referências
    ├── Comparativo-Pesquisa-Satisfacao.pdf
    └── codigo-apps-script-LEGADO.gs   ← versão antiga do GAS (referência/instruções)
```

> ⚠️ `index.html`, `pesquisa.html`, `dashboard.html`, `sw.js`, manifests e `.clasp.json`
> **permanecem na raiz**: escopo do Service Worker (`/pesquisa-satisfacao/`), GitHub Pages e
> `rootDir` do clasp dependem disso.

---

## Fluxo do sistema

### Formulário (`pesquisa.html`)
1. Tablet configurado com município + unidade (overlay protegido por senha da aba **Configuracao**)
2. 7 steps: NPS → Recepção → Limpeza → Atendimento → Espera → Comentário → Obrigado
3. Suporte a voltar entre steps (botão ←)
4. Envio: POST para Apps Script com payload JSON. Se offline → enfileira em `localStorage` (`QUEUE_KEY`)
5. Auto-sync ao reconectar + banner laranja de aviso offline + contador de pendências

### Dashboard (`dashboard.html`)
- Protegido por senha (overlay de login obrigatório)
- Filtra por município/unidade, exibe NPS, gráficos (Chart.js), comentários
- Auto-refresh a cada 30s; botão de atualização manual
- Instalável como PWA separado via `manifest-dashboard.json`

### Apps Script (`appscript/codigo.js`)
| Endpoint | Ação |
|---|---|
| `?action=dados` (padrão) | Retorna todas as respostas da aba **Respostas_Externas** |
| `?action=dadosAntigos` | Retorna o histórico migrado do Google Forms (aba **Respostas_Antigas**) |
| `?action=dadosInternos` | Retorna as respostas de Paciente Interno (aba **Respostas_Internas**) |
| `?action=dadosColaboradores` | Retorna as respostas de Colaborador (aba **Respostas_Colaboradores**) |
| `?action=config` | Retorna equipamentos ativos da aba **Equipamentos** |
| `?action=configuracao` | Retorna config chave/valor da aba **Configuracao** (senha, etc.) |
| POST com `payload` | Salva nova resposta |

**Colunas da planilha Respostas:** `ID, Timestamp, Municipio, Unidade, NPS, Recepcao, Limpeza, Atendimento, Espera, Comentario`

**Colunas da planilha Respostas_Antigas:** `ID, Timestamp, Municipio, Unidade, NPS, Recepcao, Enfermagem, Atendimento, ServicoSocial, Limpeza, Comentario`
(formulário antigo — tinha Enfermagem e Serviço Social, não tinha Tempo de Espera)

### Bases separadas no dashboard
O dashboard tem um seletor **Pesquisa Nova × Pesquisa Antiga**. As bases **não devem ser somadas**:
o formulário mudou entre elas (perguntas removidas e criada), então misturar distorce as médias.
Um eventual modo "Mesclado" só deve ser feito se a gestão pedir e com os vazios explícitos.

---

## 🔐 Proteção de acesso aos dados (mitigação parcial — 2026-08-20)

Revisão de segurança (2026-08-20) confirmou: os endpoints `?action=dados` e
`?action=dadosAntigos` do Apps Script são **públicos e anônimos**
(`appsscript.json` → `"access": "ANYONE_ANONYMOUS"`, obrigatório porque os
tablets fazem POST sem login). Isso significava que qualquer pessoa com a
URL do Apps Script conseguia baixar todos os comentários e notas de
pacientes, sem nunca passar pela tela de senha do dashboard.

**Mitigação aplicada (v1.1.7, deploy @15):** `?action=dados` e
`?action=dadosAntigos` agora exigem um parâmetro `token` (`DADOS_TOKEN` em
`appscript/codigo.js`, igual em `dashboard.html`). `?action=config` e
`?action=configuracao` continuam públicos de propósito — os tablets
precisam deles sem senha nenhuma pra se autoconfigurar.

**Isso NÃO é controle de acesso robusto.** O token fica visível em texto
puro pra quem ler o código-fonte de `dashboard.html` (publicado no GitHub
Pages) — só sobe a régua de "qualquer um com a URL do Apps Script" pra
"quem especificamente ler o código do dashboard". Alguém com esse nível de
acesso ainda consegue extrair os dados. **Para trocar o token:** editar o
valor em `appscript/codigo.js` (`DADOS_TOKEN`) E em `dashboard.html`
(`DADOS_TOKEN`) — precisam ser idênticos — e reimplantar os dois
(`deploy.ps1` + commit/push do frontend).

**Opção "restringir por domínio Google Workspace" — descartada (2026-08-20),
não é só adiada.** Motivo definitivo, não técnico: o ISV só tem **uma** conta
de fato no domínio (`admin@institutosaovicente.com.br`, que é alias da conta
raiz `institutosaovicente@gmail.com`) — todos os demais colaboradores (quem
efetivamente usa o dashboard no dia a dia) têm e-mail **pessoal**, fora do
domínio. Restringir por domínio deixaria só essa conta única com acesso,
inviabilizando o uso real por qualquer outra pessoa da equipe. Não
reconsiderar essa opção a menos que o ISV passe a distribuir contas
Workspace de verdade pra toda a equipe que usa o dashboard (decisão
organizacional, não técnica) — nesse caso ela também resolveria melhor a
identidade de quem acessa em vez de só "sabe a senha/token".

O token compartilhado (acima) continua sendo a mitigação vigente. A opção
mais robusta que sobra, se um dia quiserem ir além do token, é um backend
intermediário guardando segredo de verdade (fora do escopo por enquanto).

---

## Regras que não devem ser alteradas sem perguntar

- O formulário **não deve** ter botão "Início" — tablet do kiosque não pode sair do formulário
- O dashboard **não deve** ter botão "← Início" — equipe assistencial não deve navegar para fora
- A senha do overlay de configuração vem da planilha (`?action=configuracao`) — nunca hardcodada no HTML
- O campo `tipo_paciente` foi removido do escopo — não reintroduzir
- Service Worker deve ser bumped sempre que CSS/JS mudar (para forçar atualização nos tablets)
- Ícones PWA: 3 tamanhos obrigatórios (72, 192, 512px)

---

## Padrões de desenvolvimento

- Versionamento: **Semantic Versioning** (`MAJOR.MINOR.PATCH`)
  - `MAJOR = 1` desde o primeiro deploy em produção (2026-06-12)
  - Atualizar `app-version` no `<meta>` do HTML, `manifest.json` e `CHANGELOG.md`
- Commits: **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Sem framework JS — não introduzir dependências npm sem discussão
- CSS inline ou em `css/instituto.css` — sem bundler

---

## Contexto organizacional

- **Organização:** Instituto São Vicente (ISV)
- **Responsável de TI:** Henrique (TI — ISV)
- **Deploy:** GitHub Pages (branch `master`)
- **Planilha Google Sheets ID:** `1b-QuMPD99jZm36JqC3A1tSzhkAaRfjKPvhqalnw_jmw`
- **Deploy do Apps Script:** via `appscript/deploy.ps1` (clasp)
- **Configuração de unidades:** gerenciada diretamente na aba **Equipamentos** da planilha

---

## Estado atual do desenvolvimento

> Última atualização: 2026-08-28

- **Versão:** v1.1.18 — **em produção** desde 2026-06-12 (primeira unidade: Caucaia). Branch `master`. Implantada nas 4 unidades de Caucaia desde 2026-08-04/05.
- **PWA estável e instalado** em tablets fixos nas unidades de saúde.
- **O que funciona hoje:**
  - Formulário multi-step do paciente (`pesquisa.html`): NPS → Recepção → Limpeza → Atendimento → Espera → Comentário → Obrigado, com botão Voltar em todas as perguntas.
  - **Offline-first:** envio POST ao Apps Script via `fetch()` (form-urlencoded, sem preflight CORS — permite ler o status real da resposta do servidor), com fallback automático para o antigo `postDataComIframe` caso o `fetch` falhe em algum device; se offline, enfileira em `localStorage` (`QUEUE_KEY`) com auto-sync ao reconectar, banner de aviso e contador de pendências. Fila com retry periódico e lock anti-duplicação; `doPost` faz dedup por ID e usa `waitLock` real.
  - Dashboard administrativo (`dashboard.html`) protegido por senha (vinda da planilha, aba **Configuracao**), sessão persistida por 30 dias em `localStorage` — não pede login a cada refresh.
  - Dashboard tem seletor **Pesquisa Nova × Pesquisa Antiga** (ver seção "Bases separadas" acima), com filtros de Mês/Dia/Ano (inclusive "Total")/Município/Unidade que tentam persistir ao trocar de base.
  - Tablet configurado por município + unidade via overlay protegido por senha.
- **Backend Apps Script** com endpoints `?action=dados | dadosAntigos | config | configuracao` e POST de respostas, gravando na aba **Respostas_Externas** (renomeada de `Respostas` em 2026-08-31 para padronizar com `Respostas_Internas`/`Respostas_Colaboradores`).

---

## Fase 2 — expansão (em andamento desde 2026-08-31)

> Ver histórico de decisões completo na conversa de 2026-08-31/09-01. Resumo do que já foi feito:

- **Etapa 1 (concluída):** 39 unidades novas cadastradas na aba **Equipamentos**
  (10 municípios: Caucaia, Maracanaú, Forquilha, Guaraciaba do Norte, Iguatu,
  Lavras da Mangabeira, Orós, Pacatuba, Pedra Branca, Tabuleiro do Norte,
  Várzea Alegre) — subconjunto de uma planilha índice mestre fornecida pelo
  usuário, **não é ainda os 13 municípios completos do ISV**. Habilita só o
  formulário **Externo** (o único que existe no PWA hoje) nessas unidades via
  overlay de configuração — nenhum tablet físico foi instalado, é só cadastro.

- **Etapa 2 (concluída):** migração do histórico de **Paciente Interno**
  (internado) e **Colaborador**, hoje coletados via 80 Google Forms/planilhas
  separados (39 unidades × 2 tipos), pras abas **Respostas_Internas** e
  **Respostas_Colaboradores** da planilha de produção. Volume real migrado:
  65 respostas em Internas, 81 em Colaboradores (a maioria das 80 unidades
  ainda não tem ninguém respondendo — não é bug, é rollout real).

  **⚠️ Detalhe de infraestrutura não óbvio, importante pra quem mexer nisso depois:**
  o script de sincronização diária **não roda no projeto Apps Script principal**
  (o vinculado a esta planilha, de propriedade de `qualidade.isv@gmail.com`).
  Esse projeto, por ter sido criado por uma conta pessoal fora do domínio
  `institutosaovicente.com.br`, esbarra numa restrição do Google Workspace
  ("apps de terceiros não configurados") que bloqueia `SpreadsheetApp.openById()`
  pra arquivos de outras contas — mesmo com compartilhamento e autorização
  concedidos. Afetava 74 das 80 planilhas de origem.

  A solução foi criar um **projeto Apps Script standalone separado**, pela
  conta **admin@institutosaovicente.com.br** (via `script.new`, não vinculado
  a nenhuma planilha), que hoje é quem roda a sincronização diária (trigger
  às 4h) de verdade. O arquivo `appscript/sincronizacaoLegado.js` deste
  repositório **continua no código como referência/histórico, mas seu
  trigger foi desativado** — não é mais ele quem sincroniza em produção.
  Esse projeto standalone não está versionado no git (foi colado direto no
  editor do Apps Script); se precisar recriá-lo ou entender a lógica, o
  código é praticamente idêntico a `appscript/sincronizacaoLegado.js`, só
  que autocontido (sem depender de `codigo.js`) e sem `SyncControl`/checkpoint
  incremental — usa checagem de ID já existente no destino pra idempotência.

- **Etapa 3 (concluída):** formulário de Paciente Interno no PWA
  (`pesquisa-interno.html`), arquivo separado (mesmo padrão de
  `dashboard.html`), gravando em `Respostas_Internas` via `doPost` com
  `tipo: 'interno'` — aditivo, sem alterar o fluxo Externo.
- **Etapa 4 (concluída):** formulário de Colaborador (`pesquisa-colaborador.html`),
  mesmo padrão, gravando em `Respostas_Colaboradores` via `tipo: 'colaborador'`.
- **Etapa 5 (concluída):** dashboard (`dashboard.html`) ganha bases **Paciente
  Interno** e **Colaborador** no seletor, ao lado de Nova/Antiga.

  Decisão já tomada: Interno/Colaborador rodam **avulsos** (link/QR — modelo
  ainda a definir, por ora simulando via tablet/celular configurado igual o
  Externo, já que não há previsão de totens dedicados pra essas unidades).

---

## Decisões técnicas tomadas

- **`MAJOR = 1` desde o primeiro deploy** (2026-06-12) — projeto já está em produção real.
- **Frontend vanilla, sem framework/bundler**; Chart.js apenas no dashboard.
- **Backend em Google Apps Script + Google Sheets** (sem banco dedicado); deploy via clasp (`appscript/deploy.ps1`).
- **Senha do overlay de configuração vem da planilha** (`?action=configuracao`), nunca hardcoded no HTML.
- **`tipo_paciente` removido do escopo** (causava desalinhamento de colunas) — não reintroduzir.
- **Kiosque sem saída:** formulário não tem botão "Início" e dashboard não tem "← Início" — usuários não devem navegar para fora.
- **Service Worker deve ser bumped** sempre que CSS/JS mudar, para forçar atualização nos tablets.
- **Versão sincronizada em 3 lugares:** `<meta app-version>`, `manifest.json` e `CHANGELOG.md`.

## Próximos passos

> A partir de setembro/2026 o projeto está em **modo manutenção** (ver seção
> "Modo de operação" acima) — os itens abaixo são evoluções futuras, não
> trabalho ativo. Só avançar quando o usuário pedir explicitamente.

1. **Expandir para novas unidades/municípios** além de Caucaia (configuração via aba **Equipamentos** da planilha; assets de município em `assets/municipios/`) — aguardando o número de equipamentos da Fase 2.
2. Acompanhar a operação em produção e coletar feedback da equipe interna sobre o dashboard.
3. Possíveis evoluções: novos cortes de métricas no dashboard, exportação de relatórios.
4. Lembrar de **bumpar o Service Worker** a cada release de CSS/JS para propagar nos tablets — vale mesmo em modo manutenção.
