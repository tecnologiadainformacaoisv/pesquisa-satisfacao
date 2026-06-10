# Changelog — Pesquisa de Satisfação ISV

Todas as versões seguem [Semantic Versioning](https://semver.org/lang/pt-BR/):  
`MAJOR.MINOR.PATCH` — MAJOR permanece 0 enquanto pré-produção; 1.0.0 no primeiro deploy real.

---

## [0.2.9] — 2026-06-10
### Corrigido
- Dashboard responsivo em modo paisagem: gráficos em coluna única até 1100px (cobre tablet portrait e landscape)
- Header do dashboard compacto em telas ≤ 1024px (botões menores, título reduzido)
- Cards de métricas em 2 colunas em telas ≤ 700px; value e padding reduzidos
- `manifest.json`: `orientation` alterado de `"portrait"` para `"any"` — permite uso do PWA em paisagem

---

## [0.2.8] — 2026-06-10
### Alterado
- Botão "← Início" removido do `pesquisa.html` — tablet do kiosque não deve navegar para fora do formulário
- `start_url` do `manifest.json` corrigido para `/pesquisa-satisfacao/pesquisa.html` — PWA instalado abre direto no formulário

---

## [0.2.7] — 2026-06-09
### Removido
- Campo `tipo_paciente` removido do escopo do projeto (formulário, payload, planilha e dashboard)
- CSS e função `selectTipo` removidos do `pesquisa.html`
- Coluna `TipoPaciente` removida do `HEADERS` do Apps Script (novas planilhas não terão a coluna)

---

## [0.2.6] — 2026-06-09
### Adicionado
- Banner laranja fixo no topo da tela quando o tablet fica sem conexão
- Contador de respostas pendentes (`📦 X pendente(s)`) no canto inferior esquerdo
- Toast de feedback durante sincronização (`🔄 Sincronizando 1 de 3...`)
- Resultado ao final do sync: sucesso (`✅`) ou pendências restantes (`⚠`)
- `updateOnlineStatus()` centraliza detecção online/offline e disparo do sync
- `refreshQueueInfo()` atualiza o contador sempre que a fila é modificada
- Contador carregado no init — se houver pendentes ao reabrir o app, aparece imediatamente

---

## [0.2.5] — 2026-06-09
### Adicionado
- Senha do overlay de configuração (`pesquisa.html`) carregada da aba **Configuracao** da planilha
- Fetch da senha iniciado no carregamento da página (`configSenhaPromise`) para evitar atraso no login
- `autenticarConfig()` aguarda o fetch antes de validar (`await configSenhaPromise`)

### Corrigido
- Case-sensitivity: chave `Senha` normalizada para lowercase em `getConfiguracao()` no Apps Script
- Timing: senha buscada assincronamente antes da primeira interação do usuário

---

## [0.2.4] — 2026-06-09
### Adicionado
- Overlay de configuração do tablet com dropdowns **Município → Unidade** (cascateado)
- Municípios e unidades carregados da aba **Equipamentos** da planilha Google Sheets
- Cache local dos equipamentos em `localStorage` para funcionamento offline
- Aba **Equipamentos** auto-criada no Apps Script (`getOrCreateEquipamentosSheet`)
- Aba **Configuracao** auto-criada com linha padrão `Senha | hospital123`
- Endpoint `?action=config` retorna equipamentos ativos
- Endpoint `?action=configuracao` retorna configurações chave/valor (keys em lowercase)
- Botão Salvar habilitado somente quando município e unidade estão selecionados

---

## [0.2.3] — 2026-06-09
### Adicionado
- Dashboard: auto-refresh a cada 30 segundos sem recarregar a página
- Botão manual de atualização no cabeçalho do dashboard
- Timestamp "Última atualização" exibido na linha de filtros
- `recarregarDados()` preserva os filtros de município/unidade selecionados durante o refresh

---

## [0.2.2] — 2026-06-08
### Corrigido
- Filtros município/unidade no dashboard migrados para `addEventListener` (compatibilidade Chrome + SW)
- Bump do Service Worker para invalidar cache

---

## [0.2.1] — 2026-06-08
### Alterado
- Tipo de paciente fixado em **ambulatorial** (tipo Internação removido temporariamente)
- Tela de obrigado exibida imediatamente após resposta; envio ao Sheets ocorre em background

---

## [0.2.0] — 2026-06-08
### Adicionado
- Estrutura de municípios e unidades de saúde (configurável por tablet)
- Overlay de configuração protegido por senha
- Campo tipo de paciente (Internação / Ambulatorial)
- Fila offline completa: `QUEUE_KEY`, `trySyncQueue()`, auto-sync ao reconectar
- Apps Script migrado para standalone (`openById`)

---

## [0.1.2] — 2026-06-07
### Corrigido
- Senha do dashboard removida temporariamente para testes internos

---

## [0.1.1] — 2026-06-07
### Adicionado
- Página inicial (`index.html`) com acesso ao formulário e ao dashboard
- Service Worker v0.1.1 (cache-first)

### Corrigido
- Versão corrigida para padrão semântico pré-produção (0.x.x)

---

## [0.1.0] — 2026-06-06
### Adicionado
- Setup inicial da PWA Pesquisa de Satisfação
- Formulário de 5 perguntas (NPS + 4 avaliações por estrelas + comentário)
- Envio para Google Sheets via Apps Script (`doPost`)
- Service Worker com cache-first para funcionamento offline
- Manifest PWA (instalável em Android/iOS)
- Dashboard com gráficos (Chart.js), filtros e indicadores NPS
