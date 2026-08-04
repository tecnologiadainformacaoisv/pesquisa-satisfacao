# Changelog — Pesquisa de Satisfação ISV

Todas as versões seguem [Semantic Versioning](https://semver.org/lang/pt-BR/):  
`MAJOR.MINOR.PATCH` — MAJOR permanece 0 enquanto pré-produção; 1.0.0 no primeiro deploy real.

---

## [1.0.11] — 2026-08-04
### Corrigido
- Revertido para o emoji `⭐` (formato arredondado/com relevo aprovado pela diretoria) em vez do glifo de texto `★` da v1.0.10
- Estrela não selecionada agora usa **o mesmo emoji `⭐`**, só com `filter: grayscale(1) opacity(0.4)` (cinza/apagada) — ao selecionar, o filtro vira brilho dourado (`drop-shadow`). Isso garante a mesma forma exata nos dois estados, resolvendo em definitivo a inconsistência visual entre "antes" e "depois" de tocar a estrela

---

## [1.0.10] — 2026-08-04
### Corrigido
- Estrela preenchida trocada do emoji `⭐` (ícone colorido/glossy do sistema) para o glifo de texto `★`, colorido via CSS — antes ficava visualmente muito diferente da estrela vazia (`☆`, glifo de texto simples), já que emoji e texto usam fontes/estilos completamente distintos

---

## [1.0.9] — 2026-08-04
### Removido
- Botão "Enviar sem comentário" removido do step de comentário — era redundante com "Enviar Pesquisa" (ambos chamavam `salvarResposta()` sem nenhuma distinção; os dois já enviavam com o campo vazio se não preenchido)

---

## [1.0.8] — 2026-08-04
### Ajuste
- Logo do município (`pesquisa.html`) aumentada: 52px → 72px de altura no desktop, 30px → 42px no mobile (≤480px) — estava pequena demais no header

---

## [1.0.7] — 2026-08-04
### Alterado
- `assets/municipios/caucaia.png` substituído pela logo oficial da Prefeitura de Caucaia, enviada pelo setor de marketing (a versão anterior era placeholder)

---

## [1.0.6] — 2026-08-03
### Corrigido
- `pesquisa.html`: rodapé fixo (`position:fixed; bottom:10px`) sobrepunha a borda inferior do card em telas sem espaço sobrando, já que o card podia crescer até quase 100dvh (`max-height: calc(100dvh - 24px)`) — reservado espaço no layout (`padding-bottom` no body + `max-height` do card ajustado) em vez de flutuar por cima

---

## [1.0.5] — 2026-08-03
### Corrigido
- Auto-atualização do PWA nos tablets: como o kiosque nunca recarrega a página sozinho, o navegador podia levar até 24h para notar uma nova versão do `sw.js` — e mesmo aí, a página já aberta continuava rodando a versão antiga, exigindo que o TI limpasse o cache manualmente
- `pesquisa.html` e `dashboard.html` agora chamam `registration.update()` a cada 5 minutos, acelerando a detecção de nova versão
- `pesquisa.html`: reload automático ao ativar novo Service Worker, mas **só na tela inicial (NPS)** — nunca interrompe um paciente no meio da resposta; se a atualização chega durante o preenchimento, o reload é adiado e aplicado ao voltar para a tela de espera
- `dashboard.html`: mantido o reload automático já existente (desde v0.3.2), agora com detecção mais rápida

---

## [1.0.4] — 2026-06-26
### Alterado
- Padronização da estrutura de pastas (padrão internacional):
  - pasta local `shared/` renomeada → `assets/` (imagens) + `css/` (estilos)
  - PDF comparativo movido para `docs/`
  - versão antiga do Apps Script movida para `docs/codigo-apps-script-LEGADO.gs`
- Referências de assets/estilos atualizadas em HTMLs, manifests e `sw.js`
- `appscript/deploy.log` removido do versionamento (agora no `.gitignore`)
- Adicionados `README.md` e `.gitignore`
- Entrypoints, `sw.js`, manifests e `.clasp.json` mantidos na raiz

> Sem mudança funcional — apenas reorganização. SW bumped para forçar atualização do cache nos tablets.

---

## [1.0.3] — 2026-06-17
### Corrigido
- Dashboard não carregava: overlay de login estava com `display:none` fixo no HTML, impedindo a tela de senha de aparecer e `iniciar()` de ser chamado

---

## [1.0.2] — 2026-06-12
### Ajuste
- Ícones PWA corrigidos: 3 tamanhos (72×72, 192×192, 512×512) com proporções corretas
- Manifests atualizados para referenciar todos os tamanhos (paridade com Formulários de Visita Técnica)

---

## [1.0.1] — 2026-06-12
### Ajuste
- Emoji 👋 da tela inicial animado com aceno periódico (CSS `@keyframes`, sem JavaScript)

---

## [1.0.0] — 2026-06-12 🚀 Primeiro deploy em produção
### Segurança
- Login do dashboard reativado — overlay de senha obrigatório para acessar dados
- Hint `"Senha padrão: hospital123"` removido do HTML público
- Versão do dashboard.html corrigida e sincronizada com os demais arquivos

---

## [0.4.1] — 2026-06-12
### Corrigido
- Página travada em `100dvh` (body `overflow: hidden`) — sem scroll externo em nenhum dispositivo
- Card com `max-height` e scroll interno invisível (sem barra) como fallback
- Media query mobile com espaçamentos e fontes mais compactos para caber na tela sem rolar

---

## [0.4.0] — 2026-06-12
### Adicionado
- Botão "← Voltar" em todas as perguntas (steps 2–7), permitindo corrigir respostas anteriores
- `prevStep()` — navegação regressiva preservando seleções já feitas
### Corrigido
- "Prefiro não avaliar" agora zera visualmente as estrelas ao ser clicado (estado consistente com o dado enviado)
### Ajuste
- Estilo do botão "← Voltar" padronizado com "Prefiro não avaliar" (borda, altura e fonte iguais)

---

## [0.3.12] — 2026-06-12
### Ajuste
- Botão flutuante ⚙ (canto inferior direito) removido — redundante com o botão "Configurar unidade"
- Rodapé de versão adicionado à tela de pesquisa (fixo, discreto, igual ao da tela principal)

---

## [0.3.11] — 2026-06-12
### Ajuste
- Media query `@media (max-width: 480px)` para responsividade mobile: logos menores, padding do card reduzido, fonte do título ajustada

---

## [0.3.10] — 2026-06-12
### Ajuste
- Header do formulário migrado de `flex` para `grid` (3 colunas `1fr auto 1fr`) para título sempre centralizado
- Logo ISV: `height: 60px`, `max-width: 200px` (corrigido `max-width` que impedia altura real de renderizar)
- Logo município: `margin-right: 12px` para simetria visual com a logo ISV

---

## [0.3.9] — 2026-06-12
### Ajuste
- Logo ISV levemente maior (`height: 64px`) para destaque visual em relação à logo do município (`52px`)

---

## [0.3.8] — 2026-06-12
### Ajuste
- Logos ISV e município com altura proporcional igual (`52px`) para equilíbrio visual no header

---

## [0.3.7] — 2026-06-12
### Ajuste
- Título principal "PESQUISA DE SATISFAÇÃO" restaurado com ícone 🏥 e formatação original

---

## [0.3.6] — 2026-06-12
### Adicionado
- Logo ISV vetorial (`Logo-isv.svg`) integrada ao header do formulário (substituindo ícone placeholder)
- Logo de Caucaia (`shared/assets/municipios/caucaia.png`) adicionada e cacheada no SW

---

## [0.3.5] — 2026-06-12
### Adicionado
- Header do formulário com logos bilaterais: ISV (esquerda, fixo) + município (direita, dinâmico)
- `MUNICIPIO_LOGOS` — mapeamento municipio → arquivo de logo em `shared/assets/municipios/`
- `aplicarConfig()` atualiza logo do município automaticamente ao configurar o tablet
- Pasta `shared/assets/municipios/` criada para logos municipais (adicionar `caucaia.png` manualmente)

---

## [0.3.4] — 2026-06-10
### Adicionado
- `manifest-dashboard.json` — manifest separado para o dashboard, `start_url` aponta para `dashboard.html`
- `dashboard.html` referencia `manifest-dashboard.json` — instalável como PWA independente ("Dashboard")
- SW atualizado para cachear `manifest-dashboard.json`

---

## [0.3.3] — 2026-06-10
### Corrigido
- `html` e `body` com `overflow-x: hidden; max-width: 100vw` — impede zoom-out do browser por overflow horizontal
- `canvas { max-width: 100% }` e `.chart-wrap { overflow: hidden }` — contém canvas do Chart.js dentro do viewport
- `renderizarGraficos()` envolto em `requestAnimationFrame` — garante que o layout está pronto antes dos gráficos renderizarem

---

## [0.3.2] — 2026-06-10
### Corrigido
- Dashboard: adiciona listener `controllerchange` — página recarrega automaticamente quando novo Service Worker ativa, eliminando a necessidade de refresh manual para ver CSS atualizado

---

## [0.3.1] — 2026-06-10
### Corrigido
- Header do dashboard em coluna (empilhado) em portrait ≤900px — elimina overflow que quebrava o layout
- Remove `.filters label { display: none }` que escondia rótulos dos filtros em portrait
- Selects menores em ≤700px para caber melhor em telas pequenas

---

## [0.3.0] — 2026-06-10
### Corrigido
- Dashboard: filtros reestruturados em 2 linhas (linha 1: seletores, linha 2: contagem + timestamp) — elimina overflow horizontal em landscape que causava zoom-out do browser
- `overflow-x: hidden` adicionado ao body como proteção contra overflow residual
- Breakpoint dos gráficos ampliado para 1400px — tablet em landscape sempre usa coluna única
- Botão "← Início" removido do dashboard — equipe assistencial não deve navegar para fora
- `white-space:nowrap` removido do timestamp de atualização

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
