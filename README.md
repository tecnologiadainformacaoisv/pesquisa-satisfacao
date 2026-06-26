# Pesquisa de Satisfação — ISV

PWA de **pesquisa de satisfação de pacientes** do **Instituto São Vicente (ISV)**, instalada em tablets fixos nas unidades de saúde. Os pacientes respondem ao formulário (NPS + avaliações por estrelas + comentário); os dados vão para uma planilha Google Sheets via Apps Script. Uma equipe interna acessa o **dashboard** para visualizar as métricas.

Funciona **offline** (fila local) e sincroniza ao reconectar.

**Stack:** HTML/CSS/JS vanilla · Service Worker · Google Apps Script + Google Sheets · Chart.js (dashboard) · deploy via GitHub Pages em `/pesquisa-satisfacao/`.

## Estrutura

```
projeto-pesquisa-satisfacao/
├── README.md / CHANGELOG.md / CLAUDE.md
├── index.html              ← tela inicial
├── pesquisa.html           ← formulário do paciente (kiosque)
├── dashboard.html          ← painel administrativo (protegido por senha)
├── sw.js                   ← Service Worker (escopo /pesquisa-satisfacao/)
├── manifest.json / manifest-dashboard.json
├── .clasp.json             ← config clasp (rootDir: appscript)
├── assets/                 ← logos e imagens de município
├── css/instituto.css       ← estilos base do ISV
├── appscript/              ← backend Google Apps Script (deploy via deploy.ps1)
└── docs/                   ← PDF comparativo + versão legada do GAS
```

> Entrypoints, `sw.js`, manifests e `.clasp.json` ficam na **raiz** por exigência do escopo do Service Worker, do GitHub Pages e do `rootDir` do clasp.

## Desenvolvimento

Servir a partir de um path que reproduza `/pesquisa-satisfacao/` (o SW usa escopo absoluto). Em produção é GitHub Pages.

**Backend (Apps Script):** editar `appscript/codigo.js` e publicar com `appscript/deploy.ps1` (clasp). Endpoints:

| Requisição | Ação |
|---|---|
| `?action=dados` (padrão) | respostas da aba **Respostas** |
| `?action=config` | equipamentos ativos (aba **Equipamentos**) |
| `?action=configuracao` | config chave/valor (aba **Configuracao**) |
| `POST payload` | salva nova resposta |

## Versionamento

[Semantic Versioning](https://semver.org/lang/pt-BR/) — `MAJOR=1` desde o primeiro deploy (2026-06-12). Ao mudar CSS/JS, **bumpar o `APP_VERSION` do `sw.js`** (força atualização do cache nos tablets) e sincronizar `<meta app-version>`, manifests e `CHANGELOG.md`.
