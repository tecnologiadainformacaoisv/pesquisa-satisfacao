const SPREADSHEET_ID  = '1b-QuMPD99jZm36JqC3A1tSzhkAaRfjKPvhqalnw_jmw';
const SHEET_NAME      = 'Respostas_Externas';
const SHEET_ANTIGAS   = 'Respostas_Antigas';
const SHEET_CONFIG    = 'Equipamentos';
const SHEET_CFG       = 'Configuracao';
const HEADERS         = ['ID', 'Timestamp', 'Municipio', 'Unidade', 'NPS', 'Recepcao', 'Limpeza', 'Atendimento', 'Espera', 'Comentario'];
// Formulario antigo (Google Forms) — preserva Enfermagem e ServicoSocial, que nao
// existem no formulario novo; nao tem Espera, que so existe no novo.
const HEADERS_ANTIGAS = ['ID', 'Timestamp', 'Municipio', 'Unidade', 'NPS', 'Recepcao', 'Enfermagem', 'Atendimento', 'ServicoSocial', 'Limpeza', 'Comentario'];
const HEADERS_CONFIG  = ['Municipio', 'Unidade', 'Ativo'];
const HEADERS_CFG     = ['Chave', 'Valor'];
const DEDUP_JANELA    = 2000; // linhas mais recentes verificadas no dedup do doPost
// POSTs aceitos por janela. Generoso de propósito: o cliente (pesquisa.html)
// não consegue distinguir uma resposta de erro do doPost de uma de sucesso
// (envio via iframe só olha se "carregou", nunca lê o corpo) — um rate limit
// apertado demais faria respostas de paciente sumirem da fila sem aviso sob
// uso legítimo (várias unidades resincronizando ao mesmo tempo após queda de
// rede: retry a cada 800ms por tablet, dezenas de tablets numa expansão futura
// pode somar bem mais que 100/60s). 1000/60s ainda barra flood malicioso de
// verdade sem chegar perto do pico legítimo esperado. Ver CLAUDE.md.
const RATE_LIMIT_MAX  = 1000;
const RATE_LIMIT_JANELA_SEG = 60;

// Token exigido pra ler dados de pacientes (?action=dados / dadosAntigos).
// PROPOSITALMENTE não fica na aba Configuracao: aquela aba é lida pelo
// próprio endpoint público ?action=configuracao (os tablets precisam dela
// sem senha nenhuma), então guardar o token lá o exporia pelo mesmo buraco
// que ele deveria tampar. Fica hardcoded aqui E em dashboard.html — pra
// trocar, editar os dois e reimplantar (frontend + `deploy.ps1`).
// Isso NÃO é controle de acesso robusto (o token fica visível pra quem ler
// o código-fonte de dashboard.html) — é uma barreira de esforço deliberado,
// não uma trava real. Ver CLAUDE.md, seção "Decisão de segurança pendente".
const DADOS_TOKEN = '14e74bc81d4d799b2c42881f204ca5979840234b32b119f9';

// Evita que um comentário começando com =, +, -, @ seja interpretado como
// fórmula quando um humano abrir a planilha (spreadsheet formula injection).
// Prefixar com apóstrofo força o Sheets/Excel a tratar como texto puro.
function sanitizarTexto(v) {
  const s = String(v || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    const header = sheet.getRange(1, 1, 1, HEADERS.length);
    header.setValues([HEADERS]);
    header.setFontWeight('bold').setBackground('#0a3d62').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,  160);
    sheet.setColumnWidth(2,  200);
    sheet.setColumnWidth(3,  140);
    sheet.setColumnWidth(4,  160);
    sheet.setColumnWidth(10, 320);
  }

  return sheet;
}

function getOrCreateEquipamentosSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_CONFIG);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONFIG);
    const header = sheet.getRange(1, 1, 1, HEADERS_CONFIG.length);
    header.setValues([HEADERS_CONFIG]);
    header.setFontWeight('bold').setBackground('#1a6b4a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 220);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 80);
  }

  return sheet;
}

// Limite de taxa simples via CacheService — o endpoint de POST é público e
// anônimo (obrigatório, paciente não loga em nada), então fica exposto a
// flood. Não dá pra limitar por IP (Apps Script não expõe o IP do chamador
// em web apps), então é um limite GLOBAL por janela de tempo — não é preciso
// (contagem pode perder incrementos sob concorrência real), só precisa ser
// generoso o bastante pra nunca incomodar o uso real e barrar um flood óbvio.
function dentroDoLimiteDeTaxa() {
  const cache = CacheService.getScriptCache();
  const chave = 'ratelimit_post';
  const atual = Number(cache.get(chave) || 0);
  if (atual >= RATE_LIMIT_MAX) return false;
  cache.put(chave, String(atual + 1), RATE_LIMIT_JANELA_SEG);
  return true;
}

function doPost(e) {
  if (!dentroDoLimiteDeTaxa()) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'muitas requisições, tente novamente em instantes' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const data  = JSON.parse(e.parameter.payload);
    const id    = data.id || Date.now();

    // tipo 'interno'/'colaborador' são casos especiais — ausência do campo
    // (todo tablet de Caucaia hoje) cai no comportamento de sempre, sem
    // nenhuma mudança.
    if (data.tipo === 'interno')     return doPostInterno(data, id);
    if (data.tipo === 'colaborador') return doPostColaborador(data, id);

    const sheet = getOrCreateSheet();

    if (sheet.getLastRow() > 1) {
      // Só checa as últimas DEDUP_JANELA linhas: uma duplicata legítima só pode
      // vir de um reenvio recente (retry de minutos), nunca de meses atrás.
      // Sem esse limite, o scan cresce com o tamanho da planilha e cada POST
      // fica mais lento à medida que o histórico acumula — testado ao vivo:
      // com ~700 linhas, 25 envios concorrentes já bastam pra um deles estourar
      // os 30s do lock esperando os anteriores terminarem o scan.
      const totalLinhas = sheet.getLastRow() - 1;
      const linhasParaChecar = Math.min(totalLinhas, DEDUP_JANELA);
      const startRow = sheet.getLastRow() - linhasParaChecar + 1;
      const idsExistentes = sheet.getRange(startRow, 1, linhasParaChecar, 1).getValues().flat();
      if (idsExistentes.includes(id)) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok', duplicado: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    sheet.appendRow([
      id,
      data.timestamp     || new Date().toISOString(),
      data.municipio     || '',
      data.unidade       || '',
      data.nps         != null ? data.nps         : '',
      data.recepcao    != null ? data.recepcao    : '',
      data.limpeza     != null ? data.limpeza     : '',
      data.atendimento != null ? data.atendimento : '',
      data.espera      != null ? data.espera      : '',
      sanitizarTexto(data.comentario)
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Grava resposta de Paciente Interno (pesquisa-interno.html) em Respostas_Internas.
// Chamada de dentro do lock já adquirido por doPost — não adquire lock próprio.
// Reaproveita SHEET_INTERNOS/HEADERS_INTERNOS/getOrCreateSheetGenerico_, que
// vivem em sincronizacaoLegado.js (mesmo projeto Apps Script, mesmo escopo
// global) — se esse arquivo for removido do projeto, isso quebra também.
function doPostInterno(data, id) {
  const sheet = getOrCreateSheetGenerico_(SHEET_INTERNOS, HEADERS_INTERNOS, '#0a3d62');

  if (sheet.getLastRow() > 1) {
    const totalLinhas = sheet.getLastRow() - 1;
    const linhasParaChecar = Math.min(totalLinhas, DEDUP_JANELA);
    const startRow = sheet.getLastRow() - linhasParaChecar + 1;
    const idsExistentes = sheet.getRange(startRow, 1, linhasParaChecar, 1).getValues().flat();
    if (idsExistentes.includes(id)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', duplicado: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Ordem = HEADERS_INTERNOS: ID, Timestamp, Municipio, Unidade, TipoUnidade,
  // Recepcao, Enfermagem, Medico, ServicoSocial, Limpeza, NPS, Comentario.
  // TipoUnidade fica vazio — a aba Equipamentos não guarda esse dado hoje.
  sheet.appendRow([
    id,
    data.timestamp      || new Date().toISOString(),
    data.municipio       || '',
    data.unidade         || '',
    '',
    data.recepcao      != null ? data.recepcao      : '',
    data.enfermagem    != null ? data.enfermagem    : '',
    data.medico        != null ? data.medico        : '',
    data.servicoSocial != null ? data.servicoSocial : '',
    data.higiene       != null ? data.higiene       : '',
    data.nps           != null ? data.nps           : '',
    sanitizarTexto(data.comentario)
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Grava resposta de Colaborador (pesquisa-colaborador.html) em Respostas_Colaboradores.
// Chamada de dentro do lock já adquirido por doPost — não adquire lock próprio.
// Reaproveita SHEET_COLABORADORES/HEADERS_COLABORADORES/getOrCreateSheetGenerico_,
// que vivem em sincronizacaoLegado.js (mesmo projeto Apps Script, mesmo escopo
// global) — se esse arquivo for removido do projeto, isso quebra também.
function doPostColaborador(data, id) {
  const sheet = getOrCreateSheetGenerico_(SHEET_COLABORADORES, HEADERS_COLABORADORES, '#1a6b4a');

  if (sheet.getLastRow() > 1) {
    const totalLinhas = sheet.getLastRow() - 1;
    const linhasParaChecar = Math.min(totalLinhas, DEDUP_JANELA);
    const startRow = sheet.getLastRow() - linhasParaChecar + 1;
    const idsExistentes = sheet.getRange(startRow, 1, linhasParaChecar, 1).getValues().flat();
    if (idsExistentes.includes(id)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', duplicado: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Ordem = HEADERS_COLABORADORES: ID, Timestamp, Municipio, Unidade, TipoUnidade,
  // Instalacoes, Higiene, Seguranca, MeiosTrabalho, ConfortoBemEstar,
  // ReconhecimentoLideres, ReconhecimentoColegas, Alimentacao, Comentario.
  // TipoUnidade fica vazio — a aba Equipamentos não guarda esse dado hoje.
  sheet.appendRow([
    id,
    data.timestamp              || new Date().toISOString(),
    data.municipio               || '',
    data.unidade                 || '',
    '',
    data.instalacoes           != null ? data.instalacoes           : '',
    data.higiene                != null ? data.higiene                : '',
    data.seguranca              != null ? data.seguranca              : '',
    data.meiosTrabalho          != null ? data.meiosTrabalho          : '',
    data.confortoBemEstar       != null ? data.confortoBemEstar       : '',
    data.reconhecimentoLideres  != null ? data.reconhecimentoLideres  : '',
    data.reconhecimentoColegas  != null ? data.reconhecimentoColegas  : '',
    data.alimentacao            != null ? data.alimentacao            : '',
    sanitizarTexto(data.comentario)
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateConfiguracaoSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_CFG);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CFG);
    const header = sheet.getRange(1, 1, 1, HEADERS_CFG.length);
    header.setValues([HEADERS_CFG]);
    header.setFontWeight('bold').setBackground('#2c3e50').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 250);
    sheet.appendRow(['Senha', 'hospital123']);
  }

  return sheet;
}

function getConfiguracao() {
  const sheet  = getOrCreateConfiguracaoSheet();
  const config = {};

  if (sheet.getLastRow() > 1) {
    sheet.getDataRange().getValues().slice(1).forEach(r => {
      if (r[0]) config[String(r[0]).trim().toLowerCase()] = String(r[1]).trim();
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify(config))
    .setMimeType(ContentService.MimeType.JSON);
}

function respostaNaoAutorizada() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'não autorizado' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'dados';
  const token  = (e && e.parameter && e.parameter.token) || '';
  try {
    // config/configuracao continuam públicos: os tablets precisam deles sem
    // login nenhum (autoconfiguração do kiosque). dados/dadosAntigos contêm
    // comentário e nota de paciente — exige o token do dashboard.
    if (action === 'config')        return getEquipamentos();
    if (action === 'configuracao')  return getConfiguracao();

    if (token !== DADOS_TOKEN) return respostaNaoAutorizada();
    if (action === 'dadosAntigos')  return getDadosAntigos();
    return getDados();
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Confere se a linha de cabeçalho da aba bate com o schema esperado — se
// alguém editar uma célula de header sem querer, é melhor um erro claro do
// que campos virando undefined/NaN silenciosamente no dashboard.
function cabecalhoValido(headers, esperado) {
  return esperado.every((h, i) => String(headers[i] || '').trim() === h);
}

function erroCabecalho(nomeAba) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: `Cabeçalho da aba ${nomeAba} não confere com o esperado — confira se alguma célula foi editada.` }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDados() {
  const sheet = getOrCreateSheet();

  if (sheet.getLastRow() <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const values  = sheet.getDataRange().getValues();
  const headers = values[0];
  if (!cabecalhoValido(headers, HEADERS)) return erroCabecalho(SHEET_NAME);

  const rows    = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDadosAntigos() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ANTIGAS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const values  = sheet.getDataRange().getValues();
  const headers = values[0];
  if (!cabecalhoValido(headers, HEADERS_ANTIGAS)) return erroCabecalho(SHEET_ANTIGAS);

  const rows    = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function getEquipamentos() {
  const sheet = getOrCreateEquipamentosSheet();

  if (sheet.getLastRow() <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1)
    .filter(r => {
      const ativo = String(r[2]).toUpperCase();
      return r[0] !== '' && ativo !== 'FALSE' && ativo !== 'FALSO' && r[2] !== false;
    })
    .map(r => ({ municipio: String(r[0]).trim(), unidade: String(r[1]).trim() }));

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}
