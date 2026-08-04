# Pesquisa de Satisfação ISV — CLAUDE.md

> Contexto para Claude Code. Leia antes de qualquer tarefa.

---

## Versão atual

**v1.0.12** — em produção desde 2026-06-12.

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
| `?action=dados` (padrão) | Retorna todas as respostas da aba **Respostas** |
| `?action=config` | Retorna equipamentos ativos da aba **Equipamentos** |
| `?action=configuracao` | Retorna config chave/valor da aba **Configuracao** (senha, etc.) |
| POST com `payload` | Salva nova resposta |

**Colunas da planilha Respostas:** `ID, Timestamp, Municipio, Unidade, NPS, Recepcao, Limpeza, Atendimento, Espera, Comentario`

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

> Última atualização: 2026-08-04

- **Versão:** v1.0.12 — **em produção** desde 2026-06-12 (primeira unidade: Caucaia). Branch `master`. Implantação em 4 unidades prevista para hoje (2026-08-04).
- **PWA estável e instalado** em tablets fixos nas unidades de saúde.
- **O que funciona hoje:**
  - Formulário multi-step do paciente (`pesquisa.html`): NPS → Recepção → Limpeza → Atendimento → Espera → Comentário → Obrigado, com botão Voltar em todas as perguntas.
  - **Offline-first:** envio POST ao Apps Script; se offline, enfileira em `localStorage` (`QUEUE_KEY`) com auto-sync ao reconectar, banner de aviso e contador de pendências.
  - Dashboard administrativo (`dashboard.html`) protegido por senha (vinda da planilha, aba **Configuracao**), com filtros por município/unidade, NPS, gráficos Chart.js e comentários; auto-refresh a cada 30s. Instalável como PWA separado.
  - Tablet configurado por município + unidade via overlay protegido por senha.
- **Backend Apps Script** com endpoints `?action=dados | config | configuracao` e POST de respostas, gravando na aba **Respostas**.

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

1. **Expandir para novas unidades/municípios** além de Caucaia (configuração via aba **Equipamentos** da planilha; assets de município em `assets/municipios/`).
2. Acompanhar a operação em produção e coletar feedback da equipe interna sobre o dashboard.
3. Possíveis evoluções: novos cortes de métricas no dashboard, exportação de relatórios.
4. Lembrar de **bumpar o Service Worker** a cada release de CSS/JS para propagar nos tablets.
