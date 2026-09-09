// Etapa B — login do dashboard via Supabase Auth (substitui a senha única
// compartilhada). NÃO está ligado a dashboard.html ainda — é o código
// pronto pra colar lá dentro assim que:
//   1) o projeto Supabase da Etapa A existir e tiver pelo menos 1 admin
//   2) SUPABASE_URL e SUPABASE_ANON_KEY abaixo forem preenchidos com os
//      valores reais (Project Settings → API, no painel do Supabase)
//   3) a Edge Function da Etapa C estiver publicada
//
// Como ligar em dashboard.html:
//   - trocar o <script> do overlay de senha atual por este arquivo
//   - adicionar no <head>:
//     <script src="https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.45.4/supabase.min.js"></script>
//   - troca de fetch: em vez de `fetch(SCRIPT_URL + '?action=dados&token=...')`,
//     usar `fetchViaSupabase('dados')` (função no fim deste arquivo)

// Projeto "Pesquisa Satisfacao - Controle de Acesso" (org ISV Summit),
// criado em 2026-09-09. A anon key é segura de deixar aqui — ela é feita
// pra ser pública, o RLS em supabase/schema.sql é quem protege os dados
// (bem diferente do service_role key ou do token de gerenciamento da
// conta, esses sim nunca devem ir pro código).
const SUPABASE_URL      = 'https://fgsxqiywncarflpbxxgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3hxaXl3bmNhcmZscGJ4eGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzgwODgsImV4cCI6MjEwNDU1NDA4OH0.IoY6OPJiPvmwLjOXzBnkO-FYVVm7GW5YSATmF_mFc18';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/dashboard-proxy`;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let sessaoAtual = null;

// ----------------------------------------------------------------------------
// Login
// ----------------------------------------------------------------------------
async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { ok: false, mensagem: 'E-mail ou senha incorretos.' };
  }
  sessaoAtual = data.session;

  // Log de auditoria — login (ver supabase/schema.sql, log_auditoria).
  // Não deixar passar em silêncio: se a policy de RLS rejeitar por algum
  // motivo (ex.: sessão ainda não "quente" no client), quem chama
  // fazerLogin() precisa saber que a auditoria falhou, mesmo que o login
  // em si tenha funcionado — evita perder rastro de acesso sem aviso.
  const { error: erroLog } = await supabase.from('log_auditoria').insert({
    usuario_id: data.user.id,
    acao: 'login',
    detalhes: {},
  });
  if (erroLog) {
    console.warn('Login ok, mas falhou ao registrar auditoria:', erroLog.message);
  }

  return { ok: true, avisoAuditoria: erroLog ? erroLog.message : null };
}

// Sessão persiste automaticamente via supabase-js (localStorage) — ao
// carregar a página, confere se já tem sessão válida antes de pedir login.
async function sessaoJaExiste() {
  const { data } = await supabase.auth.getSession();
  sessaoAtual = data.session;
  return !!sessaoAtual;
}

function fazerLogout() {
  supabase.auth.signOut();
  sessaoAtual = null;
}

// ----------------------------------------------------------------------------
// Papel do usuário logado — pra travar seções admin (ex.: convite de
// usuário, configuração de tablet) na UI.
// ----------------------------------------------------------------------------
async function papelDoUsuarioLogado() {
  if (!sessaoAtual) return null;
  const { data, error } = await supabase
    .from('perfis')
    .select('papel, nome, municipios')
    .eq('id', sessaoAtual.user.id)
    .single();
  if (error) return null;
  return data; // { papel: 'super_admin' | 'admin' | 'visualizador', nome, municipios }
}

// ----------------------------------------------------------------------------
// Substitui as chamadas atuais a SCRIPT_URL — passa pela Edge Function
// (Etapa C) em vez de ir direto no Apps Script, mandando o JWT da sessão.
// ----------------------------------------------------------------------------
async function fetchViaSupabase(action, paramsExtra = {}) {
  if (!sessaoAtual) throw new Error('Não autenticado.');

  const params = new URLSearchParams({ action, ...paramsExtra });
  const resp = await fetch(`${EDGE_FUNCTION_URL}?${params}`, {
    headers: { Authorization: `Bearer ${sessaoAtual.access_token}` },
  });

  if (resp.status === 401) {
    // Sessão expirou — força novo login em vez de mostrar dado incompleto.
    fazerLogout();
    throw new Error('Sessão expirada, faça login novamente.');
  }

  // A Edge Function normalmente repassa JSON do Apps Script, mas se o
  // Apps Script devolver algo inesperado (erro de rede, página de erro do
  // Google, etc.) o body pode não ser JSON válido — resp.json() lançaria
  // uma exceção genérica e confusa ("Unexpected token <") em vez de um erro
  // que dá pra mostrar pro usuário.
  const texto = await resp.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inesperada do servidor (status ${resp.status}). Tente novamente em alguns segundos.`);
  }
}
