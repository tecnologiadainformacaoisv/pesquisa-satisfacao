// Complemento da Etapa 1 (Fase 2): unidades que faltavam nos 10 municípios já
// cadastrados + as primeiras unidades de Massapé (município 11 que ainda não
// tinha nenhuma unidade cadastrada). Comparação feita contra a planilha
// índice mestre mais completa enviada pelo gestor em 2026-09-09 (relação de
// 124 unidades) x aba Equipamentos em produção (41 linhas ativas na época).
//
// MESMO padrão de popularEquipamentosFase2() em expansaoEquipamentos.js:
// idempotente (pula o que já existe), não mexe em nada além de inserir linha
// nova na aba Equipamentos — não afeta pesquisa.html/dashboard.html/doGet.
//
// Unidades da lista mestre que pareciam nome alternativo de algo já
// cadastrado (mesma lição do "UPA Centro" vs "UPA Luiz Nerys" na Etapa 1)
// foram DELIBERADAMENTE deixadas de fora daqui — ver seção "NÃO incluídas"
// no fim do arquivo e o relatório entregue ao gestor em 09/2026. Cadastrar
// só depois de confirmar com quem mandou a planilha se é unidade nova ou
// nome mais completo de uma unidade que já existe.

const UNIDADES_FASE2B = [
  // Forquilha (10 novas)
  ['Forquilha', 'Centro de Parto Normal Francisco Eliezer X. Rodrigues'],
  ['Forquilha', 'UBS Francisco Rufino de Sousa'],
  ['Forquilha', 'UBS Maria das Dores Rodrigues Custódio'],
  ['Forquilha', 'UBS Otília Lopes de Sousa'],
  ['Forquilha', 'UBS Domingos Gomes de Jesus'],
  ['Forquilha', 'UBS Adauto Araújo'],
  ['Forquilha', 'UBS Antônio Faustino de Loiola'],
  ['Forquilha', 'UBS Gerardo Ananias Guimarães'],
  ['Forquilha', 'UBS Sebastião Rodrigues Monção'],
  ['Forquilha', 'UBS Antero Mendes'],

  // Guaraciaba do Norte (3 novas)
  ['Guaraciaba do Norte', "UBS Buraco D'Água"],
  ['Guaraciaba do Norte', 'UBS Descoberta'],
  ['Guaraciaba do Norte', 'UBS Alegre'],

  // Lavras da Mangabeira (10 novas)
  ['Lavras da Mangabeira', 'UBS Batalha'],
  ['Lavras da Mangabeira', 'UBS Arrojado'],
  ['Lavras da Mangabeira', 'UBS Iborepi'],
  ['Lavras da Mangabeira', 'UBS Ouro Branco'],
  ['Lavras da Mangabeira', 'UBS Quitaius I'],
  ['Lavras da Mangabeira', 'UBS Quitaius II'],
  ['Lavras da Mangabeira', 'UBS Baixio'],
  ['Lavras da Mangabeira', 'UBS Cuandu'],
  ['Lavras da Mangabeira', 'NIA'],
  ['Lavras da Mangabeira', 'NAIA'],

  // Maracanaú (1 nova)
  ['Maracanaú', 'Hospital da Mulher e da Criança Eneida Soares Pessoa'],

  // Massapé (32 novas — município inteiro, primeiro cadastro)
  ['Massapé', 'Anexo Baixio (CSF Aiuá)'],
  ['Massapé', 'Anexo Cachoeirinha (CSF Tangente)'],
  ['Massapé', 'Anexo Cacimba Velha de Baixo (CSF Tangente)'],
  ['Massapé', 'Anexo Cacimba Velha de Cima (CSF Tangente)'],
  ['Massapé', 'Anexo Cacimbinha (CSF Tangente)'],
  ['Massapé', 'Anexo Gregório (CSF Mirim)'],
  ['Massapé', 'Anexo Lagoa Grande (CSF Tuína)'],
  ['Massapé', 'Anexo Meruoquinha (CSF Mumbaba de Cima)'],
  ['Massapé', 'Anexo Morgado (CSF Salgadinho)'],
  ['Massapé', 'Anexo Paus Brancos (CSF Padre Linhares)'],
  ['Massapé', 'Anexo Riacho Fundo (CSF Pé da Serra)'],
  ['Massapé', 'Anexo São Damião (CSF Pé da Serra)'],
  ['Massapé', 'Anexo Sítio Recife (CSF Padre Linhares)'],
  ['Massapé', 'Anexo Sítio Socorro (CSF Pé da Serra)'],
  ['Massapé', 'Anexo Tapera Baixa (CSF Tuína)'],
  ['Massapé', 'CAPS'],
  ['Massapé', 'CEO – Centro de Especialidades Odontológicas'],
  ['Massapé', 'CES'],
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
  ['Massapé', 'Espaço Acolher'],
  ['Massapé', 'Hospital Municipal / Hospital Senador Ozires Pontes'],

  // Orós (19 novas)
  ['Orós', 'CEO Francisco Gabimar Bezerra'],
  ['Orós', 'UBS Barra'],
  ['Orós', 'UBS Caatinga'],
  ['Orós', 'UBS Carnaubinha'],
  ['Orós', 'UBS Jurema'],
  ['Orós', 'UBS Caraúbas'],
  ['Orós', 'UBS Caro Custou'],
  ['Orós', 'UBS Guassusse'],
  ['Orós', 'UBS Igaroi'],
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
  ['Orós', 'UBS Maria José Nunes'],

  // Tabuleiro do Norte (4 novas)
  ['Tabuleiro do Norte', 'CAPS'],
  ['Tabuleiro do Norte', 'Centro de Reabilitação'],
  ['Tabuleiro do Norte', 'Melhor em Casa'],
  ['Tabuleiro do Norte', 'Centro de Epidemiologia'],

  // Várzea Alegre (14 novas)
  ['Várzea Alegre', 'UBS Calabaça'],
  ['Várzea Alegre', 'UBS Canindezinho'],
  ['Várzea Alegre', 'UBS Dep. Figueiredo Correia'],
  ['Várzea Alegre', 'UBS Francisco Rolim de Morais'],
  ['Várzea Alegre', 'UBS Juazeirinho'],
  ['Várzea Alegre', 'UBS Naraniú'],
  ['Várzea Alegre', 'UBS Patos'],
  ['Várzea Alegre', 'UBS Quatro Bocas'],
  ['Várzea Alegre', 'UBS Varjota'],
  ['Várzea Alegre', 'UBS CAIS'],
  ['Várzea Alegre', 'UBS Riachinho'],
  ['Várzea Alegre', 'UBS Riacho Verde'],
  ['Várzea Alegre', 'CAPS'],
  ['Várzea Alegre', 'CAIS / Centro de Especialidades']
];

// NÃO incluídas acima de propósito (nomes da planilha mestre que batem
// demais com algo já cadastrado, ou são ambíguos) — cadastrar só depois de
// confirmar com quem mandou a planilha:
//   - Forquilha: "CEO Jerônimo da Costa Filho" (pode ser nome oficial de
//     "CEO Municipal de Forquilha", já cadastrado)
//   - Guaraciaba do Norte: "CEO – Centro de Especialidades Odontológicas"
//     (pode ser "CEO Guaraciaba do Norte"); "UBS Martinslândia" (pode ser
//     "UBS Martislândia", só variação de grafia); "UBS Sítio Estivas" (pode
//     ser "UBS Estivas")
//   - Lavras da Mangabeira: "UBS Mangabeira" (pode ser "UBS Lavras da
//     Mangabeira")
//   - Orós: "CAPS Weber Lopes Pinheiro" (pode ser "CAPS Orós"); "UBS Centro"
//     (pode ser "UBS Orós")
//   - Tabuleiro do Norte: "Unidades Básicas de Saúde" — item genérico na
//     planilha mestre, não dá pra saber se é 1 unidade específica ou um
//     placeholder cobrindo várias UBS que precisam ser detalhadas

function normalizarParaComparacao2b_(s) {
  return String(s || '').trim().toLowerCase().normalize('NFC');
}

function popularEquipamentosFase2b() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Outra execução em andamento — abortando esta.');
    return;
  }

  try {
    const sheet = getOrCreateEquipamentosSheet();

    const existentes = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues()
          .map(r => `${normalizarParaComparacao2b_(r[0])}||${normalizarParaComparacao2b_(r[1])}`)
      : [];

    const puladas = [];
    const novas = UNIDADES_FASE2B
      .filter(([municipio, unidade]) => {
        const jaExiste = existentes.includes(`${normalizarParaComparacao2b_(municipio)}||${normalizarParaComparacao2b_(unidade)}`);
        if (jaExiste) puladas.push(`${municipio} / ${unidade}`);
        return !jaExiste;
      })
      .map(([municipio, unidade]) => [municipio, unidade, true]);

    if (novas.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, novas.length, 3).setValues(novas);
    }

    Logger.log(`Equipamentos (Fase 2b): ${novas.length} unidade(s) nova(s) cadastrada(s) de ${UNIDADES_FASE2B.length} na lista (${puladas.length} já existiam: ${puladas.join('; ') || '—'}).`);

  } finally {
    lock.releaseLock();
  }
}
