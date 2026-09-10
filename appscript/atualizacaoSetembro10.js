// Atualização de cadastro conforme "Relação Unidades atualizadas set2026.pdf"
// (documento oficial consolidado, confirmado pelo analista de qualidade em
// 2026-09-10 como a fonte correta, substituindo o documento anterior de
// mesmo nome). Três mudanças:
//
// 1. Correção de nome: "UBS Batalha" (Lavras da Mangabeira) tinha erro de
//    digitação — CNES 0995134 é na verdade "UBS Barbalha". Mesma unidade
//    física, só corrige o texto (não desativa, não duplica).
// 2. Desativação: Orós (10 UBS) e Guaraciaba do Norte (9 unidades) saíram
//    da relação consolidada — decisão confirmada pelo gestor de tratar
//    isso como saída real do escopo/contrato, não erro do documento.
//    Desativa (Ativo=false), não apaga — reversível e preserva histórico
//    de respostas já recebidas dessas unidades.
// 3. Massapé: nomenclatura de "CSF <apelido>" trocada pela nomenclatura
//    oficial completa (ex.: "CSF Tangente" → "CSF do Tangente Cícero
//    Jacinto de Oliveira"). Desativa os nomes antigos, cadastra os novos.
//    Os "Anexo X (CSF Y)" NÃO mudam — a referência entre parênteses é só
//    geográfica, não é o nome da própria unidade.
// 4. Tabuleiro do Norte: "UBS Alcides Monteiro Chaves" é unidade nova, sem
//    ambiguidade com nada já cadastrado — inclusa direto.

function normalizarParaComparacaoSet10_(s) {
  return String(s || '').trim().toLowerCase().normalize('NFC');
}

// --- 1. Correção de nome (Lavras da Mangabeira) ---
function corrigirNomeUbsBarbalha() {
  const sheet = getOrCreateEquipamentosSheet();
  const values = sheet.getDataRange().getValues();
  let corrigidas = 0;

  for (let i = 1; i < values.length; i++) {
    const municipio = String(values[i][0]).trim();
    const unidade = String(values[i][1]).trim();
    if (normalizarParaComparacaoSet10_(municipio) === 'lavras da mangabeira' &&
        normalizarParaComparacaoSet10_(unidade) === 'ubs batalha') {
      sheet.getRange(i + 1, 2).setValue('UBS Barbalha');
      corrigidas++;
    }
  }
  Logger.log(`UBS Batalha → UBS Barbalha: ${corrigidas} linha(s) corrigida(s) (esperado: 1).`);
}

// --- 2. Desativação (Orós + Guaraciaba do Norte) ---
const UNIDADES_FORA_DO_ESCOPO = [
  // Orós (10)
  ['Orós', 'UBS Palestina'],
  ['Orós', 'UBS Santarem'],
  ['Orós', 'UBS São Geraldo'],
  ['Orós', 'UBS Cabeça de Negro Pai Antônio'],
  ['Orós', 'UBS Pão de Açúcar'],
  ['Orós', 'UBS Pedregulho'],
  ['Orós', 'UBS Pereiro dos Pedros'],
  ['Orós', 'UBS Rochedo'],
  ['Orós', 'UBS Sítio Jardim'],
  ['Orós', 'UBS Isaac Cândido'],
  // Guaraciaba do Norte (9)
  ['Guaraciaba do Norte', 'Centro de Saúde I e II'],
  ['Guaraciaba do Norte', 'ESF Campestre'],
  ['Guaraciaba do Norte', 'Garrancho'],
  ['Guaraciaba do Norte', 'UBS Lagoinha'],
  ['Guaraciaba do Norte', 'UBS Morrinhos'],
  ['Guaraciaba do Norte', 'UBS Santo Antônio'],
  ['Guaraciaba do Norte', 'UBS Sussuanha'],
  ['Guaraciaba do Norte', 'UBS São Félix'],
  ['Guaraciaba do Norte', 'UBSF Centro de Nutrição'],
  // Massapé — nomes antigos de CSF, substituídos pelos oficiais completos (item 3)
  ['Massapé', 'CSF Mirim'],
  ['Massapé', 'CSF Mumbaba de Baixo'],
  ['Massapé', 'CSF Mumbaba de Cima'],
  ['Massapé', 'CSF Padre Linhares'],
  ['Massapé', 'CSF Pé da Serra'],
  ['Massapé', 'CSF Salgadinho'],
  ['Massapé', 'CSF Sede I'],
  ['Massapé', 'CSF Sede II'],
  ['Massapé', 'CSF Sede III'],
  ['Massapé', 'CSF Sede IV'],
  ['Massapé', 'CSF Tangente'],
  ['Massapé', 'CSF Tuína'],
];

function desativarUnidadesForaDoEscopoSet10() {
  const sheet = getOrCreateEquipamentosSheet();
  const values = sheet.getDataRange().getValues();
  const alvo = UNIDADES_FORA_DO_ESCOPO.map(([m, u]) =>
    `${normalizarParaComparacaoSet10_(m)}||${normalizarParaComparacaoSet10_(u)}`);
  let desativadas = 0;
  const naoEncontradas = new Set(alvo);

  for (let i = 1; i < values.length; i++) {
    const municipio = String(values[i][0]).trim();
    const unidade = String(values[i][1]).trim();
    const chave = `${normalizarParaComparacaoSet10_(municipio)}||${normalizarParaComparacaoSet10_(unidade)}`;
    if (alvo.includes(chave)) {
      sheet.getRange(i + 1, 3).setValue(false); // coluna Ativo
      desativadas++;
      naoEncontradas.delete(chave);
      Logger.log(`Desativada: ${municipio} / ${unidade}`);
    }
  }

  Logger.log(`Total desativadas: ${desativadas} (esperado: ${UNIDADES_FORA_DO_ESCOPO.length})`);
  if (naoEncontradas.size > 0) {
    Logger.log(`⚠️ Não encontradas pra desativar (conferir nome manualmente): ${[...naoEncontradas].join('; ')}`);
  }
}

// --- 3. Novos nomes oficiais de Massapé + Tabuleiro do Norte ---
const UNIDADES_NOVAS_SET10 = [
  ['Massapé', 'Centro de Saúde da Família da Rodagem'],
  ['Massapé', 'Centro de Saúde da Família da Tuína'],
  ['Massapé', 'Centro de Saúde da Família de Massapê'],
  ['Massapé', 'Centro de Saúde da Família do Aiúa'],
  ['Massapé', 'Centro de Saúde da Família do Mumbaba'],
  ['Massapé', 'Centro de Saúde da Família do Salgadinho'],
  ['Massapé', 'Centro de Saúde da Família Sede V'],
  ['Massapé', 'CSF de Padre Linhares Manoel Joviniano Cunha'],
  ['Massapé', 'CSF do Alto da Boa Vista'],
  ['Massapé', 'CSF do Ipaguassu Mirim Antônio Bispo Filho'],
  ['Massapé', 'CSF do Pé da Serra Manoel Clarindo Lopes'],
  ['Massapé', 'CSF do Tangente Cícero Jacinto de Oliveira'],
  ['Massapé', 'CSF José Isaac Pontes Filho'],
  ['Tabuleiro do Norte', 'UBS Alcides Monteiro Chaves'],
];

function cadastrarUnidadesNovasSet10() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Outra execução em andamento — abortando esta.');
    return;
  }
  try {
    const sheet = getOrCreateEquipamentosSheet();
    const existentes = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues()
          .map(r => `${normalizarParaComparacaoSet10_(r[0])}||${normalizarParaComparacaoSet10_(r[1])}`)
      : [];

    const puladas = [];
    const novas = UNIDADES_NOVAS_SET10
      .filter(([municipio, unidade]) => {
        const jaExiste = existentes.includes(`${normalizarParaComparacaoSet10_(municipio)}||${normalizarParaComparacaoSet10_(unidade)}`);
        if (jaExiste) puladas.push(`${municipio} / ${unidade}`);
        return !jaExiste;
      })
      .map(([municipio, unidade]) => [municipio, unidade, true]);

    if (novas.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, novas.length, 3).setValues(novas);
    }
    Logger.log(`Cadastro Set/10: ${novas.length} unidade(s) nova(s) (${puladas.length} já existiam: ${puladas.join('; ') || '—'}).`);
  } finally {
    lock.releaseLock();
  }
}

// --- Executa as 3 etapas em sequência (chamar esta função sozinha basta) ---
function atualizacaoCompletaSet10_2026() {
  corrigirNomeUbsBarbalha();
  desativarUnidadesForaDoEscopoSet10();
  cadastrarUnidadesNovasSet10();
  Logger.log('Atualização de Setembro/2026 concluída.');
}
