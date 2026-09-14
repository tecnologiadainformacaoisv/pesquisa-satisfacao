/**
 * ============================================================================
 * ISV — LIBERAR ACESSO DOS FORMULÁRIOS (script independente e mínimo)
 * ============================================================================
 * Baseado no projeto "Acesso aos Formulários" já existente — só troquei
 * EMAIL_ANALISTA_QUALIDADE (1 e-mail) por EMAILS_EDITORES (lista), pra
 * liberar vários e-mails de uma vez em `liberarEditorParaTodos()`.
 * Resto do script é idêntico ao original.
 * ============================================================================
 */

var NOME_PASTA_RAIZ = 'Pesquisas de Satisfação ISV 2026';
var NOME_PLANILHA_INDICE = 'ISV - Índice de Formulários de Satisfação';

// Lista de e-mails que devem virar editores da pasta inteira (Forms +
// planilhas de resposta + planilha-índice). Adicionar/remover e-mail aqui
// não afeta o "qualquer pessoa com o link" dos Forms (isso é liberarTodos).
var EMAILS_EDITORES = [
  'analista.qualidade.isv@gmail.com',
  'qualidade.isv@gmail.com',
  'tecnologiadainformacao.isv@gmail.com',
];

// ----------------------------------------------------------------------------
// TESTE — libera só 1 formulário, pra confirmar que está funcionando antes
// de rodar em todos
// ----------------------------------------------------------------------------
function testarUmFormulario() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  var formulario = buscarPrimeiroFormulario(pasta);
  if (!formulario) {
    Logger.log('Nenhum formulário (Google Forms) encontrado dentro de "' + NOME_PASTA_RAIZ + '". ' +
      'Confira se o nome da pasta está exatamente igual, ou se os formulários estão em outro lugar.');
    return;
  }

  Logger.log('Testando em: ' + formulario.getName());
  var resultado = liberarUmArquivo(formulario);
  if (resultado.ok) {
    Logger.log('✅ Deu certo! Pode rodar "liberarTodos" agora.');
  } else {
    Logger.log('❌ Não deu certo. Erro completo: ' + resultado.erro);
    Logger.log('Copia essa mensagem de erro e me manda.');
  }
}

// ----------------------------------------------------------------------------
// PRINCIPAL — libera todos os formulários da pasta (e subpastas de município)
// pra "qualquer pessoa com o link" preencher — necessário pra pacientes/
// colaboradores conseguirem abrir sem login.
// ----------------------------------------------------------------------------
function liberarTodos() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  var liberados = 0;
  var falhas = 0;
  var primeiroErro = '';

  percorrerPastas(pasta, function (arquivo) {
    if (arquivo.getMimeType() === MimeType.GOOGLE_FORMS) {
      var resultado = liberarUmArquivo(arquivo);
      if (resultado.ok) {
        liberados++;
      } else {
        falhas++;
        if (!primeiroErro) primeiroErro = resultado.erro;
      }
    }
  });

  Logger.log('=== RESULTADO ===');
  Logger.log('Liberados com sucesso: ' + liberados);
  Logger.log('Falhas: ' + falhas);
  if (falhas > 0) {
    Logger.log('Erro de exemplo (primeira falha encontrada): ' + primeiroErro);
    Logger.log('Se esse erro se repetir em todos, é bloqueio de política do Admin Console — ' +
      'veja as instruções no topo do script.');
  } else if (liberados > 0) {
    Logger.log('✅ Todos liberados! Teste um link de formulário numa aba anônima do navegador para confirmar.');
  }
}

// ----------------------------------------------------------------------------
// ACESSO DE EDITOR PARA VÁRIOS E-MAILS — dá permissão de editor a todos os
// e-mails de EMAILS_EDITORES em: a pasta raiz, todos os formulários, todas
// as planilhas de resposta, e a planilha-índice. Isso é ALÉM do "qualquer
// pessoa com o link" (que continua só como visualização/resposta).
// ----------------------------------------------------------------------------
function liberarEditorParaTodos() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  var liberados = 0;
  var falhas = 0;

  EMAILS_EDITORES.forEach(function (email) {
    var resultadoPasta = adicionarEditor(pasta, email);
    if (resultadoPasta.ok) liberados++; else falhas++;

    percorrerPastas(pasta, function (arquivo) {
      var resultado = adicionarEditor(arquivo, email);
      if (resultado.ok) liberados++; else falhas++;
    });

    var indices = DriveApp.getFilesByName(NOME_PLANILHA_INDICE);
    if (indices.hasNext()) {
      var resultadoIndice = adicionarEditor(indices.next(), email);
      if (resultadoIndice.ok) liberados++; else falhas++;
    }
  });

  Logger.log('=== RESULTADO — ACESSO DE EDITOR PARA %s E-MAIL(S) ==='.replace('%s', EMAILS_EDITORES.length));
  Logger.log('Concedido com sucesso: ' + liberados + ' item(ns)');
  Logger.log('Falhas: ' + falhas);
}

function adicionarEditor(arquivoOuPasta, email) {
  try {
    arquivoOuPasta.addEditor(email);
    Logger.log('OK (editor adicionado, ' + email + '): ' + arquivoOuPasta.getName());
    return { ok: true };
  } catch (e) {
    Logger.log('ERRO ao adicionar ' + email + ' em "' + arquivoOuPasta.getName() + '": ' + e.message);
    return { ok: false, erro: e.message };
  }
}

// ----------------------------------------------------------------------------
// CORREÇÃO — os Forms continuam pedindo login mesmo depois de liberarTodos().
// Hipótese: form.setRequireLogin(false) dentro de liberarUmArquivo() está
// num try/catch que engole erro silenciosamente — se falhou nos Forms novos
// (ex.: race condition logo após makeCopy(), Drive ainda indexando), nunca
// aparecia no Log. Esta função repete SÓ esse passo, sem esconder erro.
// ----------------------------------------------------------------------------
function corrigirRequireLoginTodos() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  var corrigidos = 0;
  var falhas = 0;
  var jaEstavamPublicados = 0;
  var publicadosAgora = 0;

  percorrerPastas(pasta, function (arquivo) {
    if (arquivo.getMimeType() !== MimeType.GOOGLE_FORMS) return;
    try {
      var form = FormApp.openById(arquivo.getId());
      form.setRequireLogin(false);
      form.setCollectEmail(false);

      // A causa real do "Desculpe, não foi possível publicar o documento":
      // Forms novos (cópias) nascem em modo rascunho — precisam ser
      // publicados explicitamente antes do link de preenchimento funcionar.
      if (form.isPublished()) {
        jaEstavamPublicados++;
      } else {
        form.setPublished(true);
        publicadosAgora++;
      }

      Logger.log('OK: ' + arquivo.getName());
      corrigidos++;
    } catch (e) {
      Logger.log('❌ ERRO real em "' + arquivo.getName() + '": ' + e.message);
      falhas++;
    }
  });

  Logger.log('=== RESULTADO — CORREÇÃO setRequireLogin + PUBLICAÇÃO ===');
  Logger.log('Corrigidos: ' + corrigidos);
  Logger.log('Já estavam publicados: ' + jaEstavamPublicados);
  Logger.log('Publicados agora: ' + publicadosAgora);
  Logger.log('Falhas: ' + falhas);
  if (falhas > 0) {
    Logger.log('Copia a(s) mensagem(ns) de ERRO real acima e manda — agora não tem mais try/catch escondendo o motivo verdadeiro.');
  }
}

// ----------------------------------------------------------------------------
// LIMPEZA — cópias órfãs deixadas por timeout na criação (Fase 2 do script
// de geração): o makeCopy() criou o arquivo, mas o passo seguinte (vincular
// planilha de resposta) falhou por timeout antes do setTitle "pegar" —
// ficou com o nome padrão do Drive ("Cópia de ..."). A linha do índice já
// tem o Form bom (criado na nova tentativa); esses são sobra, sem vínculo
// válido. Rodar SEMPRE `listarCopiasOrfas` primeiro pra conferir a lista
// antes de `moverCopiasOrfasParaLixeira` (que manda pra lixeira — recuperável
// por 30 dias, não apaga de vez).
// ----------------------------------------------------------------------------
// Diagnóstico: por que não consigo lixeirar as cópias órfãs? Mostra dono,
// quem está rodando o script, e se o acesso é editor de verdade.
function diagnosticarCopiasOrfas() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  var euMesmo = Session.getEffectiveUser().getEmail();
  Logger.log('Rodando como: ' + euMesmo);

  percorrerPastas(pasta, function (arquivo) {
    if (arquivo.getMimeType() === MimeType.GOOGLE_FORMS && arquivo.getName().indexOf('Cópia de') === 0) {
      var dono = 'desconhecido';
      try { dono = arquivo.getOwner().getEmail(); } catch (e) { dono = '(erro ao ler dono: ' + e.message + ')'; }
      var acesso = 'desconhecido';
      try { acesso = arquivo.getAccess(euMesmo); } catch (e) { acesso = '(erro ao ler acesso: ' + e.message + ')'; }
      Logger.log('Arquivo: ' + arquivo.getName());
      Logger.log('  Dono: ' + dono);
      Logger.log('  Meu nível de acesso: ' + acesso);
      Logger.log('  URL: ' + arquivo.getUrl());
    }
  });
}

function listarCopiasOrfas() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  var encontradas = [];
  percorrerPastas(pasta, function (arquivo) {
    if (arquivo.getMimeType() === MimeType.GOOGLE_FORMS && arquivo.getName().indexOf('Cópia de') === 0) {
      encontradas.push(arquivo.getName() + ' — ' + arquivo.getUrl());
    }
  });

  Logger.log('=== CÓPIAS ÓRFÃS ENCONTRADAS: ' + encontradas.length + ' ===');
  encontradas.forEach(function (linha) { Logger.log(linha); });
  if (encontradas.length === 0) Logger.log('Nenhuma encontrada — nada a limpar.');
}

function moverCopiasOrfasParaLixeira() {
  var pasta = buscarPastaRaiz();
  if (!pasta) return;

  // Passada 1: só coleta os IDs, sem modificar nada (evita quebrar o
  // iterador do Drive ao trashear no meio de uma varredura em andamento —
  // foi isso que deu "Access denied: DriveApp" na execução anterior).
  var idsParaMover = [];
  var nomesPorId = {};
  percorrerPastas(pasta, function (arquivo) {
    if (arquivo.getMimeType() === MimeType.GOOGLE_FORMS && arquivo.getName().indexOf('Cópia de') === 0) {
      idsParaMover.push(arquivo.getId());
      nomesPorId[arquivo.getId()] = arquivo.getName();
    }
  });

  Logger.log('Encontradas ' + idsParaMover.length + ' cópia(s) órfã(s). Movendo uma por uma...');

  // Passada 2: agora sim move pra lixeira, uma de cada vez, com try/catch
  // individual pra um erro não travar as outras.
  var movidas = 0;
  var falhas = 0;
  idsParaMover.forEach(function (id) {
    try {
      var arquivo = DriveApp.getFileById(id);
      arquivo.setTrashed(true);
      Logger.log('OK, movida pra lixeira: ' + nomesPorId[id]);
      movidas++;
    } catch (e) {
      Logger.log('❌ ERRO ao mover "' + nomesPorId[id] + '": ' + e.message);
      falhas++;
    }
  });

  Logger.log('=== RESULTADO — LIMPEZA ===');
  Logger.log('Movidas pra lixeira: ' + movidas);
  Logger.log('Falhas: ' + falhas);
}

// ----------------------------------------------------------------------------
// FUNÇÕES INTERNAS
// ----------------------------------------------------------------------------

function liberarUmArquivo(arquivo) {
  try {
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    try {
      var form = FormApp.openById(arquivo.getId());
      form.setRequireLogin(false);
      form.setCollectEmail(false);
      if (!form.isPublished()) form.setPublished(true);
    } catch (e2) {
      // não trava o processo se essa parte específica falhar
    }
    Logger.log('OK: ' + arquivo.getName());
    return { ok: true };
  } catch (e) {
    Logger.log('ERRO em "' + arquivo.getName() + '": ' + e.message);
    return { ok: false, erro: e.message };
  }
}

function buscarPastaRaiz() {
  var pastas = DriveApp.getFoldersByName(NOME_PASTA_RAIZ);
  if (!pastas.hasNext()) {
    Logger.log('❌ Não encontrei a pasta "' + NOME_PASTA_RAIZ + '" na raiz do Drive desta conta. ' +
      'Confira se está logado com a conta certa e se o nome da pasta bate exatamente.');
    return null;
  }
  return pastas.next();
}

function buscarPrimeiroFormulario(pasta) {
  var achado = null;
  percorrerPastas(pasta, function (arquivo) {
    if (!achado && arquivo.getMimeType() === MimeType.GOOGLE_FORMS) {
      achado = arquivo;
    }
  });
  return achado;
}

function percorrerPastas(pasta, callback) {
  var arquivos = pasta.getFiles();
  while (arquivos.hasNext()) {
    callback(arquivos.next());
  }
  var subpastas = pasta.getFolders();
  while (subpastas.hasNext()) {
    percorrerPastas(subpastas.next(), callback);
  }
}

// NOTA (segurança, ver conversa anterior): a função liberarPlanilhas() do
// script original — que deixava as planilhas de RESPOSTA (dados de paciente/
// colaborador) abertas a "qualquer pessoa com o link" — foi removida desta
// versão de propósito. Acesso às planilhas de resposta agora só é dado por
// e-mail nominal via liberarEditorParaTodos(), não público. Se precisar
// mesmo do modo público nas planilhas, avisar explicitamente antes de
// reintroduzir essa função.
