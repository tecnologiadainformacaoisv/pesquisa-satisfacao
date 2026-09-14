/**
 * GERAÇÃO DE FORMS LEGADO (Paciente + Colaborador) PARA UNIDADES NOVAS
 * ======================================================================
 * NÃO faz parte do clasp/projeto principal (codigo.js). É standalone, pra
 * colar manualmente no MESMO projeto Apps Script que já roda a sincronização
 * diária de Interno/Colaborador (script.new criado pela conta
 * admin@institutosaovicente.com.br) — ver CLAUDE.md, seção "Fase 2" e
 * appscript/sincronizacaoLegado.js pro contexto de por que precisa ser essa
 * conta (bloqueio de Workspace pra apps de terceiros nas planilhas de
 * origem/destino que não são dessa conta).
 *
 * NÃO SOBE PRO GIT (mesmo padrão do script de sync real: cola no editor do
 * Apps Script, não versiona). Este arquivo aqui em docs/ é só a cópia de
 * referência do que foi colado lá.
 *
 * -------------------------------------------------------------------
 * COMO USAR (2 fases, de propósito — não dispara nada em massa sozinho):
 *
 * FASE 1 — dry run, zero Forms criados:
 *   1. Rodar `fase1_gerarCandidatos()`.
 *   2. Abre a aba nova "Índice (nova)" na planilha índice
 *      (1Q8m8CmPYaH3rwJaHkk45J716EM8Y6qC4fcsE_Ivp17k) com as linhas
 *      candidatas (Município/Unidade/Tipo Unidade/Tipo Pesquisa), status
 *      "REVISAR". A aba original (Página1/gid=0) NÃO é tocada.
 *   3. Revisar cada linha à mão: apagar as que na verdade já têm Form
 *      (renomeadas — ex.: "UPA Centro"→"UPA Luiz Nerys" já está tratado no
 *      ALIAS_MAP abaixo, mas Guaraciaba do Norte teve unidades removidas na
 *      atualização de Setembro/2026, então pode ter falso positivo/negativo
 *      ali — checar contra CLAUDE.md).
 *   4. Nas linhas que sobrarem e você confirmar que precisam de Form
 *      mesmo, trocar Status de "REVISAR" pra "APROVADO".
 *
 * FASE 2 — cria de fato, só o que foi aprovado:
 *   5. Rodar `fase2_gerarFormsAprovados()`. Processa em lotes (ver
 *      BATCH_SIZE) pra não estourar o tempo de execução do Apps Script
 *      (limite ~6 min) — rodar de novo quantas vezes precisar até não sobrar
 *      linha "APROVADO".
 *   6. Cada linha aprovada vira: 1 cópia do Form Colaborador-template + 1
 *      cópia do Form Paciente-template, cada uma com planilha de resposta
 *      própria nova, título ajustado, e a linha na aba "Índice (nova)"
 *      atualizada com os links reais e Status "OK".
 *
 * FASE 3 — só depois de conferir que a Fase 2 gerou tudo certo:
 *   7. Rodar `fase3_mesclarNoIndiceOriginal()`. O script real de sincronização
 *      diária (o que lê ${INDICE_SHEET_ID}, função migrarHistoricoComoAdmin)
 *      usa `indice.getSheets()[0]` — ou seja, lê a planilha índice PELA
 *      POSIÇÃO da aba (a primeira), não pelo nome. Enquanto as linhas novas
 *      ficarem só na aba "Índice (nova)" (que não é a posição 0), o sync NÃO
 *      as enxerga, mesmo com Status "OK". Esta fase copia só as linhas já
 *      "OK" da aba nova pro final da aba original — sem apagar/alterar nada
 *      que já existia lá — pra elas efetivamente entrarem no sync diário e
 *      alimentarem Respostas_Internas/Respostas_Colaboradores.
 * -------------------------------------------------------------------
 */

// ============================== CONFIG ==============================

// Planilha índice legada (Município/Unidade/Tipo Unidade/Tipo Pesquisa/links)
const INDICE_SHEET_ID = '1Q8m8CmPYaH3rwJaHkk45J716EM8Y6qC4fcsE_Ivp17k';
const INDICE_ABA_ORIGINAL = 'Índice'; // não usado mais pra leitura (ver buscarUnidadesNoIndice_) — getSheetByName deu null, provável acento/espaço; lendo por posição agora, igual ao script de sync real
const INDICE_ABA_NOVA = 'Índice (nova)';

// Endpoint público do sistema novo (?action=config) — lista de equipamentos ativos
const CONFIG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwK--quEUwdbc2tvEBiC3UfazOcX0pu9wWGep-0oM3T-s0yZaJ2PYAs9-jv7UpN6Y9O3Q/exec?action=config';

// Forms-modelo reais (Hospital de Iguatu), confirmados com a estrutura certa
const TEMPLATE_FORM_COLABORADOR_ID = '1_M0YJgNYUp6o4_vbMPLHViuFhstl9XaTBDNQCTltOs0';
const TEMPLATE_FORM_PACIENTE_ID   = '11QKWS-a1dzZakiRE0Hs5fmRcPOD6SZ-Z-4OGuUjH24Y';

// Pasta raiz onde já ficam os Forms/planilhas dos 80 antigos, com subpasta
// por município — confirmada nos scripts "Acesso aos Formulários" e
// "Pesquisa de Satisfação" (mesmo nome citado nos dois, independentemente).
// Os Forms novos entram na subpasta do município correspondente, criando-a
// se ainda não existir (ex.: Maracanaú, Massapé são municípios novos que
// não têm subpasta ainda).
const NOME_PASTA_RAIZ = 'Pesquisas de Satisfação ISV 2026';

// Quantas linhas "APROVADO" processar por execução da Fase 2 (evitar timeout)
const BATCH_SIZE = 15;

// Unidade na planilha índice antiga -> nome atual na aba Equipamentos
// (evita gerar Form duplicado pra unidade que só foi renomeada)
const ALIAS_MAP = {
  'Caucaia|UPA Centro': 'Caucaia|UPA Luiz Nerys',
  'Caucaia|Hospital Municipal Abelardo Gadelha da Rocha': 'Caucaia|Hospital Municipal Abelardo Gadelha',
  'Caucaia|Hospital e Maternidade Santa Terezinha': 'Caucaia|Maternidade Santa Terezinha',
};

// Invertido (nome atual -> nome antigo) — é o sentido em que o filtro da
// Fase 1 precisa consultar, já que ele parte do nome ATUAL (vindo do
// ?action=config) e precisa achar se existe uma entrada com o nome ANTIGO
// no índice legado. (Bug corrigido em 2026-09-10: a consulta original usava
// ALIAS_MAP[chave] com `chave` já no formato atual, que nunca batia — as 3
// unidades de Caucaia renomeadas apareciam como candidatas por engano.)
const ALIAS_MAP_INVERTIDO = Object.fromEntries(
  Object.entries(ALIAS_MAP).map(([antigo, atual]) => [atual, antigo])
);

// ============================== FASE 1 ==============================

function fase1_gerarCandidatos() {
  const equipamentos = buscarEquipamentosAtivos_(); // [{municipio, unidade}]
  const existentes = buscarUnidadesNoIndice_();      // Set('Municipio|Unidade')

  const candidatos = equipamentos.filter(eq => {
    const chave = eq.municipio + '|' + eq.unidade;
    const chaveNomeAntigo = ALIAS_MAP_INVERTIDO[chave]; // nome como está no índice legado, se for renomeada
    return !existentes.has(chave) && !(chaveNomeAntigo && existentes.has(chaveNomeAntigo));
  });

  const aba = obterOuCriarAbaNova_();
  aba.clearContents();
  aba.appendRow(['Município', 'Unidade', 'Tipo Unidade', 'Tipo Pesquisa',
    'Link Preenchimento', 'Link Edição', 'Planilha de Respostas', 'Status']);

  candidatos.forEach(eq => {
    ['Colaborador', 'Paciente'].forEach(tipo => {
      aba.appendRow([eq.municipio, eq.unidade, eq.tipoUnidade || '', tipo, '', '', '', 'REVISAR']);
    });
  });

  Logger.log('Fase 1 concluída: %s unidades candidatas (%s linhas) escritas em "%s". Revisar antes da Fase 2.',
    candidatos.length, candidatos.length * 2, INDICE_ABA_NOVA);
}

// Marca todas as linhas "REVISAR" da aba nova como "APROVADO" de uma vez —
// usar só depois de já ter conferido a lista (ver checagem por município
// feita em 2026-09-10: bate certinho, 106 unidades / 212 linhas esperadas
// após a correção do ALIAS_MAP). Não mexe em linhas que já estão "OK",
// "ERRO" ou qualquer outro status.
function aprovarTodosOsCandidatos() {
  const aba = obterOuCriarAbaNova_();
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colStatus = header.indexOf('Status');

  let aprovadas = 0;
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][colStatus] === 'REVISAR') {
      aba.getRange(i + 1, colStatus + 1).setValue('APROVADO');
      aprovadas++;
    }
  }

  Logger.log('%s linha(s) marcada(s) como APROVADO. Rodar fase2_gerarFormsAprovados() agora (repetir até não sobrar nenhuma).', aprovadas);
}

// ============================== FASE 2 ==============================

function fase2_gerarFormsAprovados() {
  const resultado = processarLoteAprovados_(BATCH_SIZE);
  Logger.log('Fase 2: %s linha(s) processada(s) nesta execução. Rodar de novo se ainda houver "APROVADO" pendente.', resultado.processadas);
}

// Botão único: reprocessa automaticamente qualquer linha "ERRO: ..." como
// "APROVADO" (erro de timeout do Drive é transitório — geralmente passa na
// segunda tentativa) e roda em loop contínuo, dentro da MESMA execução, até
// terminar tudo ou chegar perto do limite de ~6min do Apps Script (para em
// 5min30s por segurança e deixa o resto pra próxima chamada). Rodar essa
// função de novo quantas vezes o Log pedir — normalmente 1 a 3 vezes até
// zerar, bem menos cliques que rodar fase2_gerarFormsAprovados uma a uma.
function fase2_processarTudo() {
  const LIMITE_MS = 5.5 * 60 * 1000;
  const inicio = Date.now();

  reativarLinhasComErro_();

  let totalProcessadas = 0;
  while (Date.now() - inicio < LIMITE_MS) {
    const resultado = processarLoteAprovados_(BATCH_SIZE);
    totalProcessadas += resultado.processadas;
    if (resultado.aindaHaAprovadas === false) {
      Logger.log('✅ Fase 2 concluída: %s linha(s) processada(s) no total nesta execução. Nenhuma "APROVADO" pendente — pode rodar fase3_mesclarNoIndiceOriginal().', totalProcessadas);
      return;
    }
  }

  Logger.log('Fase 2 (parcial): %s linha(s) processada(s) até agora, chegando perto do limite de tempo desta execução. Rode fase2_processarTudo() de novo pra continuar de onde parou.', totalProcessadas);
}

// Muda toda linha "ERRO: ..." de volta pra "APROVADO", pra ser retentada.
function reativarLinhasComErro_() {
  const aba = obterOuCriarAbaNova_();
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colStatus = header.indexOf('Status');

  let reativadas = 0;
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][colStatus]).indexOf('ERRO') === 0) {
      aba.getRange(i + 1, colStatus + 1).setValue('APROVADO');
      reativadas++;
    }
  }
  if (reativadas > 0) Logger.log('%s linha(s) com erro anterior reativada(s) pra nova tentativa.', reativadas);
}

function processarLoteAprovados_(tamanhoLote) {
  const aba = obterOuCriarAbaNova_();
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colStatus = header.indexOf('Status');
  const colLinkPreench = header.indexOf('Link Preenchimento');
  const colLinkEdicao = header.indexOf('Link Edição');
  const colPlanilha = header.indexOf('Planilha de Respostas');

  let processadas = 0;
  let aindaHaAprovadas = false;
  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    if (linha[colStatus] !== 'APROVADO') continue;
    if (processadas >= tamanhoLote) { aindaHaAprovadas = true; break; }

    const municipio = linha[0];
    const unidade = linha[1];
    const tipo = linha[3]; // 'Colaborador' | 'Paciente'

    try {
      const resultado = criarFormParaUnidade_(municipio, unidade, tipo);
      aba.getRange(i + 1, colLinkPreench + 1).setValue(resultado.linkPreenchimento);
      aba.getRange(i + 1, colLinkEdicao + 1).setValue(resultado.linkEdicao);
      aba.getRange(i + 1, colPlanilha + 1).setValue(resultado.linkPlanilha);
      aba.getRange(i + 1, colStatus + 1).setValue('OK');
      processadas++;
    } catch (e) {
      aba.getRange(i + 1, colStatus + 1).setValue('ERRO: ' + e.message);
      Logger.log('Erro em %s / %s / %s: %s', municipio, unidade, tipo, e.message);
      processadas++; // conta como processada (falhou, mas não trava o lote)
    }
  }

  return { processadas, aindaHaAprovadas };
}

function criarFormParaUnidade_(municipio, unidade, tipo) {
  const templateId = tipo === 'Colaborador' ? TEMPLATE_FORM_COLABORADOR_ID : TEMPLATE_FORM_PACIENTE_ID;
  const pasta = obterOuCriarSubpastaMunicipio_(municipio);

  const nomeForm = `Pesquisa de Satisfação - ${tipo} - ${unidade}`;
  const copia = DriveApp.getFileById(templateId).makeCopy(nomeForm, pasta);
  const form = FormApp.openById(copia.getId());
  form.setTitle(nomeForm);
  // Forms novos (cópia) nascem em modo rascunho — sem isso o link de
  // preenchimento dá "Desculpe, não foi possível publicar o documento".
  if (!form.isPublished()) form.setPublished(true);

  const planilha = SpreadsheetApp.create(`Respostas - ${nomeForm}`);
  DriveApp.getFileById(planilha.getId()).moveTo(pasta);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  return {
    linkPreenchimento: form.getPublishedUrl(),
    linkEdicao: form.getEditUrl(),
    linkPlanilha: planilha.getUrl(),
  };
}

// Reaproveita a subpasta do município se já existir (mesmo padrão dos 80
// antigos); cria se for município novo (ex.: Maracanaú, Massapé).
function obterOuCriarSubpastaMunicipio_(municipio) {
  const raizes = DriveApp.getFoldersByName(NOME_PASTA_RAIZ);
  if (!raizes.hasNext()) {
    throw new Error(`Pasta raiz "${NOME_PASTA_RAIZ}" não encontrada no Drive desta conta.`);
  }
  const raiz = raizes.next();

  const subpastas = raiz.getFoldersByName(municipio);
  if (subpastas.hasNext()) return subpastas.next();

  return raiz.createFolder(municipio);
}

// ============================== FASE 3 ==============================

// Copia pro final da aba ORIGINAL (posição 0 — a que o sync diário lê via
// getSheets()[0]) só as linhas da aba nova que já estão com Status "OK".
// Não apaga nem sobrescreve nada da aba original. Idempotente: marca cada
// linha copiada com "OK (mesclada)" na aba nova pra não duplicar se rodar
// de novo.
function fase3_mesclarNoIndiceOriginal() {
  const ss = SpreadsheetApp.openById(INDICE_SHEET_ID);
  const abaOriginal = ss.getSheets()[0]; // mesma leitura por posição que o sync usa
  const abaNova = ss.getSheetByName(INDICE_ABA_NOVA);
  if (!abaNova) {
    Logger.log('Aba "%s" não encontrada — nada a mesclar.', INDICE_ABA_NOVA);
    return;
  }

  const dados = abaNova.getDataRange().getValues();
  const header = dados[0];
  const colStatus = header.indexOf('Status');

  const linhasParaMesclar = [];
  const indicesParaMarcar = [];
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][colStatus] === 'OK') {
      linhasParaMesclar.push(dados[i]);
      indicesParaMarcar.push(i + 1); // linha real na planilha (1-indexed + header)
    }
  }

  if (linhasParaMesclar.length === 0) {
    Logger.log('Nenhuma linha "OK" pendente de mesclagem.');
    return;
  }

  abaOriginal.getRange(abaOriginal.getLastRow() + 1, 1, linhasParaMesclar.length, linhasParaMesclar[0].length)
    .setValues(linhasParaMesclar);

  indicesParaMarcar.forEach(linha => {
    abaNova.getRange(linha, colStatus + 1).setValue('OK (mesclada)');
  });

  Logger.log('Fase 3: %s linha(s) mesclada(s) na aba original. O sync diário já vai enxergar na próxima execução (04h).', linhasParaMesclar.length);
}

// Marca visualmente, na aba ORIGINAL, quais das 291 linhas são as 212
// novas — usando uma coluna extra "Novo" (H+1), NÃO mudando o texto da
// coluna Status. Importante: o script de sync real (migrarHistoricoComoAdmin,
// função `PULANDO linha do índice (status="${status}"...)`) checa
// `status !== 'OK'` com igualdade EXATA — se eu tivesse escrito
// "OK (novo)" ali, o sync ignoraria essas 212 linhas silenciosamente.
// Por isso a identificação visual vai numa coluna à parte, que o sync nem
// olha. Usa a aba "Índice (nova)" (linhas "OK (mesclada)") como referência
// de quais são novas, casando por Município+Unidade+Tipo Pesquisa.
function marcarNovosNoIndiceOriginal() {
  const ss = SpreadsheetApp.openById(INDICE_SHEET_ID);
  const abaOriginal = ss.getSheets()[0];
  const abaNova = ss.getSheetByName(INDICE_ABA_NOVA);
  if (!abaNova) {
    Logger.log('Aba "%s" não encontrada.', INDICE_ABA_NOVA);
    return;
  }

  const dadosNova = abaNova.getDataRange().getValues();
  const headerNova = dadosNova[0];
  const colStatusNova = headerNova.indexOf('Status');

  const chavesNovas = new Set();
  for (let i = 1; i < dadosNova.length; i++) {
    if (dadosNova[i][colStatusNova] === 'OK (mesclada)') {
      chavesNovas.add(dadosNova[i][0] + '|' + dadosNova[i][1] + '|' + dadosNova[i][3]); // Município|Unidade|Tipo Pesquisa
    }
  }

  const dadosOriginal = abaOriginal.getDataRange().getValues();
  const headerOriginal = dadosOriginal[0];
  const colStatusOriginal = headerOriginal.indexOf('Status');
  let colNovo = headerOriginal.indexOf('Novo');
  if (colNovo === -1) {
    colNovo = headerOriginal.length;
    abaOriginal.getRange(1, colNovo + 1).setValue('Novo');
  }

  let marcadas = 0;
  for (let i = 1; i < dadosOriginal.length; i++) {
    const linha = dadosOriginal[i];
    if (linha[colStatusOriginal] !== 'OK') continue; // Status continua intocado
    const chave = linha[0] + '|' + linha[1] + '|' + linha[3];
    if (chavesNovas.has(chave)) {
      abaOriginal.getRange(i + 1, colNovo + 1).setValue('Sim');
      marcadas++;
    }
  }

  Logger.log('%s linha(s) marcada(s) com "Sim" na coluna Novo (adicionada como última coluna). Status original não foi alterado — sync não é afetado.', marcadas);
}

// ============================== CORREÇÃO TIPO UNIDADE ==============================

// A aba Equipamentos (fonte do ?action=config) nunca guardou o campo Tipo
// Unidade (ver appscript/codigo.js, comentário "TipoUnidade fica vazio — a
// aba Equipamentos não guarda esse dado hoje") — por isso as 212 linhas
// novas nasceram com essa coluna em branco. Preenche por inferência de
// prefixo do nome, só quando confiante; deixa em branco (e loga) os casos
// ambíguos pra revisão manual, em vez de arriscar classificar errado.
// Roda na aba ORIGINAL (posição 0), já que as linhas novas foram mescladas
// lá na Fase 3.
const REGRAS_TIPO_UNIDADE = [
  [/^hospital|^maternidade/i, 'Hospital'],
  [/^ubsf|^ubs\b/i, 'UBS'],
  [/^caps\b|^centro de atenção psicossocial/i, 'CAPS'],
  [/^ceo\b/i, 'CEO'],
  [/^upa\b/i, 'UPA'],
  [/^vigilância epidemiológica/i, 'Vigilância Epidemiológica'],
  [/^nasf\b/i, 'NASF'],
  // Massapé usa nomenclatura própria: CSF = Centro de Saúde da Família,
  // equivalente funcional de UBS (inclusive "Anexo ... (CSF ...)").
  [/csf|centro de saúde da família/i, 'UBS'],
];

function preencherTipoUnidadeInferido() {
  const ss = SpreadsheetApp.openById(INDICE_SHEET_ID);
  const aba = ss.getSheets()[0];
  const dados = aba.getDataRange().getValues();
  const header = dados[0];
  const colUnidade = header.indexOf('Unidade');
  const colTipo = header.indexOf('Tipo Unidade');

  let preenchidas = 0;
  const ambiguas = [];

  for (let i = 1; i < dados.length; i++) {
    const tipoAtual = dados[i][colTipo];
    if (tipoAtual) continue; // já tem, não mexe

    const unidade = dados[i][colUnidade];
    const regra = REGRAS_TIPO_UNIDADE.find(([re]) => re.test(unidade));

    if (regra) {
      aba.getRange(i + 1, colTipo + 1).setValue(regra[1]);
      preenchidas++;
    } else {
      ambiguas.push(unidade);
    }
  }

  Logger.log('Tipo Unidade preenchido em %s linha(s).', preenchidas);
  const ambiguasUnicas = [...new Set(ambiguas)];
  if (ambiguasUnicas.length > 0) {
    Logger.log('%s unidade(s) ambígua(s), deixadas em branco pra revisão manual:', ambiguasUnicas.length);
    ambiguasUnicas.forEach(u => Logger.log('  - ' + u));
  }
}

// ============================== HELPERS ==============================

function buscarEquipamentosAtivos_() {
  const resp = UrlFetchApp.fetch(CONFIG_ENDPOINT);
  const json = JSON.parse(resp.getContentText());
  // Formato real confirmado: array de {municipio, unidade} — sem tipoUnidade.
  // ⚠️ Endpoint retornou 169 registros num teste (2026-09-10), mais que as
  // 137 unidades "ativas" registradas antes — pode ter duplicata ou incluir
  // inativa. O dedupe abaixo cobre duplicata exata; item inativo/indevido
  // não tem como ser filtrado aqui (o endpoint não expõe status) — revisar
  // a lista final na aba "Índice (nova)" antes de aprovar qualquer linha.
  const vistos = new Set();
  const unicos = [];
  json.forEach(item => {
    const municipio = item.municipio;
    const unidade = item.unidade;
    const chave = municipio + '|' + unidade;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      unicos.push({ municipio, unidade, tipoUnidade: '' });
    }
  });
  return unicos;
}

function buscarUnidadesNoIndice_() {
  const ss = SpreadsheetApp.openById(INDICE_SHEET_ID);
  const aba = ss.getSheets()[0]; // primeira aba por posição — mesma leitura do script de sync real
  const dados = aba.getDataRange().getValues();
  const set = new Set();
  for (let i = 1; i < dados.length; i++) {
    const municipio = dados[i][0];
    const unidade = dados[i][1];
    if (municipio && unidade) set.add(municipio + '|' + unidade);
  }
  return set;
}

function obterOuCriarAbaNova_() {
  const ss = SpreadsheetApp.openById(INDICE_SHEET_ID);
  let aba = ss.getSheetByName(INDICE_ABA_NOVA);
  if (!aba) aba = ss.insertSheet(INDICE_ABA_NOVA);
  return aba;
}
