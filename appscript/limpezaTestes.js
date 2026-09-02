// Remove linhas de teste (QA_TESTE, TESTE_ETAPA3, TESTE_ETAPA4, testes de
// toque via puppeteer etc.) das 3 abas de produção. Todo teste feito nesta
// sessão teve o marcador "pode apagar" no comentário — usa isso como filtro
// em vez de depender de nome de município específico, então cobre qualquer
// teste anterior de uma vez só. Roda 1x, manual, sob demanda.

// Função (não constante de topo) — SHEET_INTERNOS/HEADERS_INTERNOS/etc vêm
// de sincronizacaoLegado.js, outro arquivo do mesmo projeto. Uma const de
// topo avaliada na hora do carregamento do script pode rodar antes desse
// outro arquivo ter sido processado (ordem alfabética de arquivo), dando
// ReferenceError — dentro de função só avalia quando chamada, depois de
// tudo já carregado.
function _abasParaLimpar() {
  return [
    { nome: SHEET_NAME,          headers: HEADERS },
    { nome: SHEET_INTERNOS,      headers: HEADERS_INTERNOS },
    { nome: SHEET_COLABORADORES, headers: HEADERS_COLABORADORES }
  ];
}

// Acha as linhas candidatas em todas as abas, sem apagar nada — só monta a
// lista com ID/Municipio/Unidade/Comentario pra conferência manual antes de
// rodar a exclusão de verdade.
function _linhasCandidatas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const candidatas = []; // { nome, linha (1-based), id, municipio, unidade, comentario }

  _abasParaLimpar().forEach(({ nome, headers }) => {
    const sheet = ss.getSheetByName(nome);
    if (!sheet || sheet.getLastRow() <= 1) return;

    const colComentario = headers.indexOf('Comentario') + 1;
    const colId = headers.indexOf('ID') + 1;
    const colMunicipio = headers.indexOf('Municipio') + 1;
    const colUnidade = headers.indexOf('Unidade') + 1;
    if (colComentario === 0) {
      Logger.log(`PULANDO ${nome}: coluna Comentario não encontrada no schema esperado.`);
      return;
    }

    const values = sheet.getDataRange().getValues();
    for (let i = values.length - 1; i >= 1; i--) {
      const comentario = String(values[i][colComentario - 1] || '');
      if (comentario.toLowerCase().includes('pode apagar')) {
        candidatas.push({
          nome,
          linha: i + 1,
          id: values[i][colId - 1],
          municipio: values[i][colMunicipio - 1],
          unidade: values[i][colUnidade - 1],
          comentario
        });
      }
    }
  });

  return candidatas;
}

// PASSO 1 — rodar primeiro. Só loga o que SERIA apagado, não apaga nada.
// Confira a lista linha por linha antes de rodar limparLinhasDeTesteConfirmado().
function limparLinhasDeTesteDryRun() {
  const candidatas = _linhasCandidatas();
  if (candidatas.length === 0) {
    Logger.log('Nenhuma linha candidata encontrada.');
    return;
  }
  candidatas.forEach(c =>
    Logger.log(`[SERIA APAGADA] ${c.nome} linha ${c.linha} | ID=${c.id} | ${c.municipio} / ${c.unidade} | "${c.comentario}"`)
  );
  Logger.log(`Total: ${candidatas.length} linha(s) candidata(s). Nada foi apagado — rode limparLinhasDeTesteConfirmado() depois de conferir a lista acima.`);
}

// PASSO 2 — só rodar depois de conferir o log do dry-run. Apaga de verdade.
function limparLinhasDeTesteConfirmado() {
  const candidatas = _linhasCandidatas();
  if (candidatas.length === 0) {
    Logger.log('Nenhuma linha candidata encontrada — nada a fazer.');
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  // Agrupa por aba e ordena linha decrescente — apagar de baixo pra cima
  // dentro de cada aba, senão o índice das linhas seguintes desloca.
  const porAba = {};
  candidatas.forEach(c => { (porAba[c.nome] = porAba[c.nome] || []).push(c); });

  let total = 0;
  Object.keys(porAba).forEach(nome => {
    const sheet = ss.getSheetByName(nome);
    const linhas = porAba[nome].map(c => c.linha).sort((a, b) => b - a);
    linhas.forEach(linha => sheet.deleteRow(linha));
    Logger.log(`${nome}: ${linhas.length} linha(s) removida(s).`);
    total += linhas.length;
  });

  Logger.log(`Total geral: ${total} linha(s) removida(s).`);
}
