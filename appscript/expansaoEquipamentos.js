// Cadastro das unidades novas da Fase 2 (Paciente Externo) na aba
// Equipamentos — mesma aba que já alimenta o overlay de configuração do
// tablet (pesquisa.html) e o filtro de Município/Unidade do dashboard via
// ?action=config. Nenhuma mudança em pesquisa.html/dashboard.html/doGet:
// os dois já leem essa aba, só falta ela ter as linhas novas.
//
// Roda 1x (idempotente — pula unidades já cadastradas, então é seguro rodar
// de novo se a lista crescer). Ver CLAUDE.md — Etapa 1 da Fase 2.

const UNIDADES_FASE2 = [
  ['Caucaia', 'Hospital Municipal Abelardo Gadelha da Rocha'],
  ['Caucaia', 'Hospital e Maternidade Santa Terezinha'],
  ['Caucaia', 'UPA Centro'],
  ['Caucaia', 'UPA Jurema'],
  ['Forquilha', 'CAPS Almir Rufino de Souza'],
  ['Forquilha', 'CEO Municipal de Forquilha'],
  ['Forquilha', 'José Valmir Araújo'],
  ['Guaraciaba do Norte', 'CEO Guaraciaba do Norte'],
  ['Guaraciaba do Norte', 'Centro de Atenção Psicossocial'],
  ['Guaraciaba do Norte', 'Centro de Saúde I e II'],
  ['Guaraciaba do Norte', 'ESF Campestre'],
  ['Guaraciaba do Norte', 'Garrancho'],
  ['Guaraciaba do Norte', 'Guarani'],
  ['Guaraciaba do Norte', 'Hospital e Maternidade São José'],
  ['Guaraciaba do Norte', 'Limoeiro'],
  ['Guaraciaba do Norte', 'Mocambo'],
  ['Guaraciaba do Norte', 'Passagem das Pedras'],
  ['Guaraciaba do Norte', 'UBS Bela Vista'],
  ['Guaraciaba do Norte', 'UBS Estivas'],
  ['Guaraciaba do Norte', 'UBS Lagoa dos Silvanos'],
  ['Guaraciaba do Norte', 'UBS Lagoinha'],
  ['Guaraciaba do Norte', 'UBS Martislândia'],
  ['Guaraciaba do Norte', 'UBS Morrinhos'],
  ['Guaraciaba do Norte', 'UBS Santo Antônio'],
  ['Guaraciaba do Norte', 'UBS Sussuanha'],
  ['Guaraciaba do Norte', 'UBS São Félix'],
  ['Guaraciaba do Norte', 'UBS Várzea Redonda'],
  ['Guaraciaba do Norte', 'UBS Várzea dos Espinhos'],
  ['Guaraciaba do Norte', 'UBSF Centro de Nutrição'],
  ['Iguatu', 'Hospital de Iguatu'],
  ['Lavras da Mangabeira', 'Hospital São Vicente Ferrer'],
  ['Lavras da Mangabeira', 'UBS Lavras da Mangabeira'],
  ['Orós', 'CAPS Orós'],
  ['Orós', 'Hospital e Maternidade Luiza Teodoro da Costa'],
  ['Orós', 'UBS Orós'],
  ['Pacatuba', 'Raimundo Célio Rodrigues'],
  ['Pedra Branca', 'Hospital Municipal São Sebastião'],
  ['Tabuleiro do Norte', 'Ana Rita Bezerra Maia Moreira'],
  ['Várzea Alegre', 'Núcleo Azul'],
  ['Várzea Alegre', 'UBS Juremal']
];

// Normaliza pra comparação de duplicata tolerar diferença de acentuação
// (NFC/NFD), maiúsculas/minúsculas e espaços — evita cadastrar a mesma
// unidade duas vezes só porque foi digitada de forma levemente diferente
// na planilha (ex.: "São Félix" com acento composto vs decomposto).
function normalizarParaComparacao_(s) {
  return String(s || '').trim().toLowerCase().normalize('NFC');
}

function popularEquipamentosFase2() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Outra execução em andamento — abortando esta.');
    return;
  }

  try {
    const sheet = getOrCreateEquipamentosSheet();

    const existentes = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues()
          .map(r => `${normalizarParaComparacao_(r[0])}||${normalizarParaComparacao_(r[1])}`)
      : [];

    const puladas = [];
    const novas = UNIDADES_FASE2
      .filter(([municipio, unidade]) => {
        const jaExiste = existentes.includes(`${normalizarParaComparacao_(municipio)}||${normalizarParaComparacao_(unidade)}`);
        if (jaExiste) puladas.push(`${municipio} / ${unidade}`);
        return !jaExiste;
      })
      .map(([municipio, unidade]) => [municipio, unidade, true]);

    if (novas.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, novas.length, 3).setValues(novas);
    }

    Logger.log(`Equipamentos: ${novas.length} unidade(s) nova(s) cadastrada(s) (${puladas.length} já existiam: ${puladas.join('; ') || '—'}).`);

  } finally {
    lock.releaseLock();
  }
}
