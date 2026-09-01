// Sincronização das pesquisas de Paciente Interno e Colaborador, hoje
// coletadas em 78 Google Forms/planilhas separados (um por unidade x tipo),
// listados na planilha índice mestre. Descontinuados assim que o PWA passar
// a atender Interno/Colaborador — até lá, os Forms continuam recebendo
// respostas ao vivo, então esta sincronização é INCREMENTAL e IDEMPOTENTE
// (roda todo dia, nunca duplica, nunca reprocessa o que já migrou).
//
// Arquivo separado de propósito: não toca em doPost/doGet, que atendem o
// PWA em produção (pesquisa.html/dashboard.html). Ver CLAUDE.md — Etapa 2
// da Fase 2.

const INDICE_MESTRE_ID = '1Q8m8CmPYaH3rwJaHkk45J716EM8Y6qC4fcsE_Ivp17k';

const SHEET_SYNC_CONTROL  = 'SyncControl';
const SHEET_INTERNOS      = 'Respostas_Internas';
const SHEET_COLABORADORES = 'Respostas_Colaboradores';

const HEADERS_SYNC_CONTROL = [
  'SpreadsheetId', 'TipoPesquisa', 'Municipio', 'Unidade', 'TipoUnidade',
  'UltimaLinhaSincronizada', 'UltimoErro'
];

const HEADERS_INTERNOS = [
  'ID', 'Timestamp', 'Municipio', 'Unidade', 'TipoUnidade',
  'Recepcao', 'Enfermagem', 'Medico', 'ServicoSocial', 'Limpeza',
  'NPS', 'Comentario'
];

const HEADERS_COLABORADORES = [
  'ID', 'Timestamp', 'Municipio', 'Unidade', 'TipoUnidade',
  'Instalacoes', 'Higiene', 'Seguranca', 'MeiosTrabalho',
  'ConfortoBemEstar', 'ReconhecimentoLideres', 'ReconhecimentoColegas',
  'Alimentacao', 'Comentario'
];

function getOrCreateSheetGenerico_(nome, headers, corFundo) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(nome);

  if (!sheet) {
    sheet = ss.insertSheet(nome);
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setFontWeight('bold').setBackground(corFundo).setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function extrairIdDaUrl_(url) {
  const m = String(url || '').match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Roda UMA VEZ para popular o SyncControl a partir da planilha índice mestre.
// Idempotente: pula linhas cujo SpreadsheetId já está cadastrado, então é
// seguro rodar de novo se a lista de unidades crescer (Etapa 1 em andamento).
function popularSyncControl() {
  const indice = SpreadsheetApp.openById(INDICE_MESTRE_ID).getSheets()[0];
  const linhas = indice.getDataRange().getValues().slice(1); // pula cabeçalho

  const sheet = getOrCreateSheetGenerico_(SHEET_SYNC_CONTROL, HEADERS_SYNC_CONTROL, '#5c3d99');
  const existentes = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat()
    : [];

  let adicionados = 0;

  linhas.forEach(row => {
    const [municipio, unidade, tipoUnidade, tipoPesquisa, , , planilhaRespostas, status] = row;
    if (!municipio || status !== 'OK') return;

    const spreadsheetId = extrairIdDaUrl_(planilhaRespostas);
    if (!spreadsheetId || existentes.includes(spreadsheetId)) return;

    sheet.appendRow([spreadsheetId, tipoPesquisa, municipio, unidade, tipoUnidade, 0, '']);
    adicionados++;
  });

  Logger.log(`SyncControl: ${adicionados} planilha(s) nova(s) cadastrada(s).`);
}

function mapearLinhaInterno_(row, id, municipio, unidade, tipoUnidade) {
  // origem: Timestamp, Recepcao, Enfermagem, Medico, ServicoSocial, Limpeza, NPS, Comentario
  return [
    id, row[0], municipio, unidade, tipoUnidade,
    row[1], row[2], row[3], row[4], row[5], row[6],
    sanitizarTexto(row[7])
  ];
}

function mapearLinhaColaborador_(row, id, municipio, unidade, tipoUnidade) {
  // origem: Timestamp, Instalacoes, Higiene, Seguranca, MeiosTrabalho,
  // ConfortoBemEstar, ReconhecimentoLideres, ReconhecimentoColegas, Alimentacao, Comentario
  return [
    id, row[0], municipio, unidade, tipoUnidade,
    row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8],
    sanitizarTexto(row[9])
  ];
}

// Número mínimo de colunas esperado em cada tipo de planilha de origem —
// protege contra um Form legado com coluna a menos/reordenada mapeando
// silenciosamente valor errado pro campo errado (ex.: NPS indo pra Comentario).
const MIN_COLUNAS_INTERNO      = 8;  // Timestamp + 6 perguntas + Comentario
const MIN_COLUNAS_COLABORADOR  = 10; // Timestamp + 8 perguntas + Comentario

function carregarIdsExistentes_(sheet) {
  if (sheet.getLastRow() <= 1) return new Set();
  return new Set(sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat());
}

// Função principal — agendada para rodar 1x por dia (ver instalarTriggerDiario).
// Usa LockService (mesmo padrão de doPost em codigo.js) porque o trigger
// diário e uma execução manual não podem rodar ao mesmo tempo sobre o mesmo
// SyncControl/abas de destino sem risco de duplicar linhas.
function sincronizarPesquisasLegado() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Sincronização já em andamento em outra execução — abortando esta.');
    return;
  }

  try {
    const controle = getOrCreateSheetGenerico_(SHEET_SYNC_CONTROL, HEADERS_SYNC_CONTROL, '#5c3d99');
    if (controle.getLastRow() <= 1) {
      Logger.log('SyncControl vazio — rode popularSyncControl() primeiro.');
      return;
    }

    const destinoInternos      = getOrCreateSheetGenerico_(SHEET_INTERNOS, HEADERS_INTERNOS, '#0a3d62');
    const destinoColaboradores = getOrCreateSheetGenerico_(SHEET_COLABORADORES, HEADERS_COLABORADORES, '#1a6b4a');

    // Rede de segurança contra duplicação: carrega os IDs já gravados nos
    // destinos ANTES de escrever nada — mesmo que o checkpoint de uma
    // planilha específica não tenha avançado por uma falha anterior, uma
    // linha já migrada nunca é reinserida.
    const idsInternos      = carregarIdsExistentes_(destinoInternos);
    const idsColaboradores = carregarIdsExistentes_(destinoColaboradores);

    const linhasControle = controle.getDataRange().getValues();
    let novasNoTotal = 0;

    for (let i = 1; i < linhasControle.length; i++) {
      const [spreadsheetId, tipoPesquisa, municipio, unidade, tipoUnidade, ultimaLinha] = linhasControle[i];
      const linhaControleIndex = i + 1; // 1-based na planilha real

      try {
        // Assume que a 1ª aba é a de respostas do Form (convenção padrão do
        // Google Forms). Risco conhecido: se alguém reordenar as abas de uma
        // das 78 planilhas legadas manualmente, isso lê a aba errada.
        const origem = SpreadsheetApp.openById(spreadsheetId).getSheets()[0];
        const lastRow = origem.getLastRow();

        if (lastRow <= Math.max(ultimaLinha, 1)) continue; // nada novo (1 = só cabeçalho)

        const numColunas = origem.getLastColumn();
        const minEsperado = tipoPesquisa === 'Colaborador' ? MIN_COLUNAS_COLABORADOR : MIN_COLUNAS_INTERNO;
        if (numColunas < minEsperado) {
          throw new Error(`planilha com ${numColunas} coluna(s), esperado no mínimo ${minEsperado} — schema pode ter mudado, pulando`);
        }

        const primeiraLinhaNova = Math.max(ultimaLinha, 1) + 1;
        const qtdNovas = lastRow - primeiraLinhaNova + 1;
        const linhasNovas = origem.getRange(primeiraLinhaNova, 1, qtdNovas, numColunas).getValues();

        const destino   = tipoPesquisa === 'Colaborador' ? destinoColaboradores : destinoInternos;
        const idsDestino = tipoPesquisa === 'Colaborador' ? idsColaboradores : idsInternos;
        const mapear     = tipoPesquisa === 'Colaborador' ? mapearLinhaColaborador_ : mapearLinhaInterno_;

        // Escrita em lote (não appendRow por linha) — mais rápido e menos
        // sujeito a estourar o limite de 6min de execução do Apps Script
        // na carga inicial de backfill com 78 origens.
        const linhasParaGravar = [];
        linhasNovas.forEach((row, idx) => {
          const numeroLinhaOrigem = primeiraLinhaNova + idx;
          const id = `${spreadsheetId}_${numeroLinhaOrigem}`;
          if (idsDestino.has(id)) return; // já migrada em execução anterior interrompida
          linhasParaGravar.push(mapear(row, id, municipio, unidade, tipoUnidade));
          idsDestino.add(id);
        });

        if (linhasParaGravar.length > 0) {
          destino.getRange(destino.getLastRow() + 1, 1, linhasParaGravar.length, linhasParaGravar[0].length)
            .setValues(linhasParaGravar);
        }

        controle.getRange(linhaControleIndex, 6).setValue(lastRow); // UltimaLinhaSincronizada
        controle.getRange(linhaControleIndex, 7).setValue('');      // limpa UltimoErro
        novasNoTotal += linhasParaGravar.length;

      } catch (err) {
        controle.getRange(linhaControleIndex, 7).setValue(String(err.message));
        Logger.log(`Erro sincronizando ${spreadsheetId} (${municipio} / ${unidade} / ${tipoPesquisa}): ${err.message}`);
      }
    }

    Logger.log(`Sincronização concluída: ${novasNoTotal} resposta(s) nova(s) migrada(s).`);

  } finally {
    lock.releaseLock();
  }
}

// Roda UMA VEZ para instalar o trigger diário (não é recriado a cada deploy —
// clasp push não mexe em triggers). Rodando de novo remove o trigger antigo
// antes de recriar, pra nunca duplicar execução.
function instalarTriggerDiario() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sincronizarPesquisasLegado')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('sincronizarPesquisasLegado')
    .timeBased()
    .everyDays(1)
    .atHour(4) // madrugada, baixo uso
    .create();

  Logger.log('Trigger diário instalado (04h).');
}
