// =============================================================
// Pesquisa de Satisfação — Google Apps Script
//
// COMO USAR:
// 1. Abra a planilha no Google Sheets
// 2. Extensões > Apps Script
// 3. Cole este código, salve (Ctrl+S)
// 4. Clique em "Implantar" > "Nova implantação"
//    - Tipo: Aplicativo da Web
//    - Executar como: Eu (minha conta)
//    - Quem tem acesso: Qualquer pessoa
// 5. Clique em "Implantar" e copie a URL gerada
// 6. Cole a URL em pesquisa.html e dashboard.html
//    onde está escrito 'COLE_SUA_URL_AQUI'
// =============================================================

const SHEET_NAME = 'Respostas';
const HEADERS = ['ID', 'Timestamp', 'NPS', 'Recepcao', 'Limpeza', 'Atendimento', 'Espera', 'Comentario'];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0a3d62')
      .setFontColor('#ffffff');
    sheet.setColumnWidth(1, 160); // ID
    sheet.setColumnWidth(2, 180); // Timestamp
    sheet.setColumnWidth(8, 320); // Comentario
  }

  return sheet;
}

// Recebe respostas da pesquisa (POST via iframe)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = getOrCreateSheet();
    const data = JSON.parse(e.parameter.payload);

    sheet.appendRow([
      data.id        || Date.now(),
      data.timestamp || new Date().toISOString(),
      data.nps        != null ? data.nps        : '',
      data.recepcao   != null ? data.recepcao   : '',
      data.limpeza    != null ? data.limpeza    : '',
      data.atendimento != null ? data.atendimento : '',
      data.espera     != null ? data.espera     : '',
      data.comentario || ''
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

// Retorna todas as respostas como JSON (GET do dashboard)
function doGet() {
  try {
    const sheet = getOrCreateSheet();

    if (sheet.getLastRow() <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const rows = values.slice(1).map(row => {
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
