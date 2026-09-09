// Correção pontual (2026-09-09): a Fase 2b cadastrou "Maracanaú" (com acento,
// vindo do documento oficial) na aba Equipamentos, mas a unidade que já
// existia desde antes da Fase 2 estava gravada como "Maracanau" (sem
// acento) — a checagem de duplicata só normaliza caixa/espaço, não acento,
// então virou município duplicado por engano: "Maracanau" (1 unidade
// antiga) e "Maracanaú" (2 unidades novas) apareciam como cidades
// diferentes no dropdown do tablet e no filtro do dashboard.
//
// Esta função unifica tudo em "Maracanaú" (grafia correta em português),
// tanto na aba Equipamentos quanto nas abas de respostas (caso alguma
// resposta real já tenha sido gravada com "Maracanau" sem acento — não
// deveria haver nenhuma, já que não há tablet físico configurado lá, mas
// confere por garantia em vez de assumir). Idempotente: rodar de novo não
// duplica nem quebra nada, só não encontra mais nada pra corrigir.

const MARACANAU_SEM_ACENTO = 'Maracanau';
const MARACANAU_COM_ACENTO = 'Maracanaú';

function corrigirAcentoMaracanau() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Outra execução em andamento — abortando esta.');
    return;
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let totalCorrigido = 0;

    // 1) Aba Equipamentos (coluna 1 = Municipio)
    const eqSheet = getOrCreateEquipamentosSheet();
    totalCorrigido += corrigirColunaMunicipio_(eqSheet, 1, 'Equipamentos');

    // 2) Abas de respostas — Municipio é a coluna 3 em todas (ID, Timestamp, Municipio, ...)
    [SHEET_NAME, SHEET_ANTIGAS, SHEET_INTERNOS, SHEET_COLABORADORES].forEach(nomeAba => {
      const sheet = ss.getSheetByName(nomeAba);
      if (sheet) {
        totalCorrigido += corrigirColunaMunicipio_(sheet, 3, nomeAba);
      }
    });

    Logger.log(`Correção de acento "Maracanau" → "Maracanaú": ${totalCorrigido} linha(s) corrigida(s) no total.`);

  } finally {
    lock.releaseLock();
  }
}

function corrigirColunaMunicipio_(sheet, coluna, nomeAbaParaLog) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const range = sheet.getRange(2, coluna, lastRow - 1, 1);
  const valores = range.getValues();
  let corrigidas = 0;

  const novos = valores.map(([v]) => {
    if (String(v).trim() === MARACANAU_SEM_ACENTO) {
      corrigidas++;
      return [MARACANAU_COM_ACENTO];
    }
    return [v];
  });

  if (corrigidas > 0) {
    range.setValues(novos);
    Logger.log(`${nomeAbaParaLog}: ${corrigidas} linha(s) corrigida(s).`);
  }

  return corrigidas;
}
