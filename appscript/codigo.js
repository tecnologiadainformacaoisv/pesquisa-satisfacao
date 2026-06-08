const SPREADSHEET_ID = '1b-QuMPD99jZm36JqC3A1tSzhkAaRfjKPvhqalnw_jmw';
const SHEET_NAME     = 'Respostas';
const HEADERS        = ['ID', 'Timestamp', 'TipoPaciente', 'Municipio', 'Unidade', 'NPS', 'Recepcao', 'Limpeza', 'Atendimento', 'Espera', 'Comentario'];

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0a3d62')
      .setFontColor('#ffffff');
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(8, 320);
  }

  return sheet;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = getOrCreateSheet();
    const data  = JSON.parse(e.parameter.payload);

    sheet.appendRow([
      data.id            || Date.now(),
      data.timestamp     || new Date().toISOString(),
      data.tipo_paciente || '',
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

function doGet() {
  try {
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

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
