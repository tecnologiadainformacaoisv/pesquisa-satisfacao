// Complemento da Etapa 1 (Fase 2): unidades que faltavam nos 10 municípios já
// cadastrados + as primeiras unidades de Massapé (município 11 que ainda não
// tinha nenhuma unidade cadastrada). Comparação feita contra duas fontes do
// gestor, ambas de 2026-09-09: a planilha índice mestre (124 unidades) e,
// depois, o documento oficial "Relação Unidades atualizadas Setembro-2026"
// (com códigos CNES), que resolveu as pendências de duplicata/nome
// alternativo e revelou mais 17 unidades novas (Academia da Saúde em
// Forquilha, Vigilância Epidemiológica/EMAD II/NASF em Orós, Vigilância
// Epidemiológica em Massapé, Unidade de Atendimento 24hrs em Maracanaú, e as
// 10 UBS de Tabuleiro do Norte que antes só apareciam como item genérico
// "Unidades Básicas de Saúde") — tudo x aba Equipamentos em produção (41
// linhas ativas em 09/09).
//
// MESMO padrão de popularEquipamentosFase2() em expansaoEquipamentos.js:
// idempotente (pula o que já existe), não mexe em nada além de inserir linha
// nova na aba Equipamentos — não afeta pesquisa.html/dashboard.html/doGet.
//
// Unidades que pareciam nome alternativo de algo já cadastrado (mesma lição
// do "UPA Centro" vs "UPA Luiz Nerys" na Etapa 1) foram DELIBERADAMENTE
// deixadas de fora daqui — ver seção "NÃO incluídas" no fim do arquivo.

const UNIDADES_FASE2B = [
  // Forquilha (12 novas)
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
  ['Forquilha', 'Academia da Saúde - Unidade 1'],
  ['Forquilha', 'Academia da Saúde - Centro'],

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

  // Maracanaú (2 novas)
  ['Maracanaú', 'Hospital da Mulher e da Criança Eneida Soares Pessoa'],
  ['Maracanaú', 'Unidade de Atendimento 24hrs'],

  // Massapé (33 novas — município inteiro, primeiro cadastro)
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
  ['Massapé', 'Vigilância Epidemiológica'],

  // Orós (23 novas)
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
  ['Orós', 'Vigilância Epidemiológica'],
  ['Orós', 'Equipe de Atendimento Domiciliar - EMAD II'],
  ['Orós', 'NASF'],

  // Tabuleiro do Norte (14 novas — as 4 anteriores + as 10 UBS que só
  // apareciam como item genérico "Unidades Básicas de Saúde" na planilha
  // índice mestre, detalhadas no documento oficial com CNES)
  ['Tabuleiro do Norte', 'CAPS'],
  ['Tabuleiro do Norte', 'Centro de Reabilitação'],
  ['Tabuleiro do Norte', 'Melhor em Casa'],
  ['Tabuleiro do Norte', 'Centro de Epidemiologia'],
  ['Tabuleiro do Norte', 'UBS Peixe Gordo'],
  ['Tabuleiro do Norte', 'UBS Groelândia'],
  ['Tabuleiro do Norte', 'UBS Gangorrinha'],
  ['Tabuleiro do Norte', 'UBS José Mendes Sobrinho'],
  ['Tabuleiro do Norte', 'UBS Maria de Fátima Freitas'],
  ['Tabuleiro do Norte', 'UBS Alcides Monteiro Chaves'],
  ['Tabuleiro do Norte', 'UBS Hilário Domingos'],
  ['Tabuleiro do Norte', 'UBS Pedra Preta'],
  ['Tabuleiro do Norte', 'UBS Barra do Feijão'],
  ["Tabuleiro do Norte", "UBS Olho D'Água da Bica"],

  // Várzea Alegre (17 novas — decisão do gestor em 2026-09-09: cadastrar a
  // UNIÃO das duas fontes (mestre + PDF oficial) em vez de esperar a
  // confirmação, já que as 2 divergem entre si mas nenhuma contradiz a
  // outra (nenhuma diz "essa unidade não existe", só está incompleta cada
  // uma no seu jeito — o próprio PDF tem várias linhas de Várzea Alegre com
  // CNES "a confirmar"). Mais fácil remover depois se aparecer problema do
  // que deixar pesquisa de fora de unidade real. Inclui as 4 que só
  // estavam na planilha mestre + as 4 que só estavam no PDF oficial.
  ['Várzea Alegre', 'UBS Calabaça'],
  ['Várzea Alegre', 'UBS Canindezinho'],
  ['Várzea Alegre', 'UBS Naraniú'],
  ['Várzea Alegre', 'UBS Patos'],
  ['Várzea Alegre', 'UBS Varjota'],
  ['Várzea Alegre', 'UBS Riachinho'],
  ['Várzea Alegre', 'UBS Riacho Verde'],
  ['Várzea Alegre', 'CAPS'],
  ['Várzea Alegre', 'CAIS / Centro de Especialidades'],
  // só na planilha índice mestre:
  ['Várzea Alegre', 'UBS Dep. Figueiredo Correia'],
  ['Várzea Alegre', 'UBS Francisco Rolim de Morais'],
  ['Várzea Alegre', 'UBS Juazeirinho'],
  ['Várzea Alegre', 'UBS Quatro Bocas'],
  // só no PDF oficial:
  ['Várzea Alegre', 'UBS Grossos'],
  ['Várzea Alegre', 'UBS Praça Santo Antônio'],
  ['Várzea Alegre', 'UBS Sanharol'],
  ['Várzea Alegre', 'UBS Ibicatu']
];

// RESOLVIDAS em 2026-09-09, com o documento oficial "Relação Unidades
// atualizadas Setembro-2026" (tem CNES): eram todas duplicata/nome
// alternativo de algo já cadastrado — confirmado que NÃO são unidades novas,
// não cadastrar:
//   - Forquilha: "CEO Jerônimo da Costa Filho" = "CEO Municipal de Forquilha"
//   - Guaraciaba do Norte: "CEO – Centro de Especialidades Odontológicas" =
//     "CEO Guaraciaba do Norte"; "UBS Martinslândia" = "UBS Martislândia"
//     (nosso cadastro tem um typo — nome oficial é "Martinslândia", com n;
//     vale corrigir a grafia na planilha, mas não é unidade nova); "UBS
//     Sítio Estivas" = "UBS Estivas"
//   - Lavras da Mangabeira: "UBS Mangabeira" = "UBS Lavras da Mangabeira"
//   - Orós: "CAPS Weber Lopes Pinheiro" = "CAPS Orós"; "UBS Centro" = "UBS
//     Orós"
//   - Tabuleiro do Norte: "Unidades Básicas de Saúde" era item genérico —
//     RESOLVIDO, virou as 10 UBS nomeadas já incluídas acima.
//
// AINDA PENDENTES (não cadastrar sem confirmar com o gestor):
//   - Guaraciaba do Norte: documento oficial cita "4 equipes adicionais de
//     Atenção Básica" sem CNES nem nome individualizado — mesmo problema do
//     item de Tabuleiro, ainda sem solução.
//   - Caririaçu (município 12, novo — nem estava nos 13 mapeados
//     anteriormente): todo o documento está "a confirmar", nenhuma unidade
//     nomeada ainda. Aguardando a lista completa do gestor antes de
//     cadastrar qualquer unidade (mesmo sem CNES).
//
// RESOLVIDO em 2026-09-09: a divergência de Várzea Alegre (planilha mestre
// tinha "UBS Dep. Figueiredo Correia", "UBS Francisco Rolim de Morais",
// "UBS Juazeirinho", "UBS Quatro Bocas" que o PDF oficial não tinha; o PDF
// oficial tinha "UBS Grossos", "UBS Praça Santo Antônio", "UBS Sanharol",
// "UBS Ibicatu" que a planilha mestre não tinha) foi decidida pelo gestor:
// cadastrar a união das duas listas em vez de escolher uma — já incluída
// no array acima. Se alguma dessas 8 se confirmar como duplicata/erro,
// desativar na aba Equipamentos (coluna Ativo) em vez de apagar a linha.

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
