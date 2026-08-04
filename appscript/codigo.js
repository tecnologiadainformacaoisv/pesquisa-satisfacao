const SPREADSHEET_ID  = '1b-QuMPD99jZm36JqC3A1tSzhkAaRfjKPvhqalnw_jmw';
const SHEET_NAME      = 'Respostas';
const SHEET_CONFIG    = 'Equipamentos';
const SHEET_CFG       = 'Configuracao';
const HEADERS         = ['ID', 'Timestamp', 'Municipio', 'Unidade', 'NPS', 'Recepcao', 'Limpeza', 'Atendimento', 'Espera', 'Comentario'];
const HEADERS_CONFIG  = ['Municipio', 'Unidade', 'Ativo'];
const HEADERS_CFG     = ['Chave', 'Valor'];

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

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sheet = getOrCreateSheet();
    const data  = JSON.parse(e.parameter.payload);
    const id    = data.id || Date.now();

    if (sheet.getLastRow() > 1) {
      const idsExistentes = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
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
      data.comentario  || ''
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

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'dados';
  try {
    if (action === 'config')        return getEquipamentos();
    if (action === 'configuracao')  return getConfiguracao();
    return getDados();
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
