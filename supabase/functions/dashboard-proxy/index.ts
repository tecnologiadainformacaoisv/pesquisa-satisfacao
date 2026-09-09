// Etapa C — proxy entre o dashboard e o Apps Script.
//
// Por quê existe: hoje dashboard.html chama o Apps Script direto do
// navegador, com o DADOS_TOKEN escrito no código-fonte (visível pra quem
// ler dashboard.html publicado no GitHub Pages). Essa Edge Function passa
// a ficar no meio: o navegador manda o JWT do Supabase (prova de quem
// logou), a função confirma que é um usuário válido e SÓ ENTÃO chama o
// Apps Script usando o token — que fica guardado como secret aqui, nunca
// no navegador.
//
// Deploy (depois que o projeto Supabase da Etapa A existir):
//   supabase functions deploy dashboard-proxy
//   supabase secrets set APPS_SCRIPT_URL=https://script.google.com/macros/s/XXX/exec
//   supabase secrets set APPS_SCRIPT_TOKEN=<o mesmo DADOS_TOKEN de appscript/codigo.js>
//
// Chamada esperada do dashboard.html (troca o fetch direto no Apps Script
// por isto, mandando o access_token da sessão Supabase no header):
//   fetch(`${SUPABASE_URL}/functions/v1/dashboard-proxy?action=dados`, {
//     headers: { Authorization: `Bearer ${session.access_token}` }
//   })

import { createClient } from 'jsr:@supabase/supabase-js@2';

const APPS_SCRIPT_URL   = Deno.env.get('APPS_SCRIPT_URL')!;
const APPS_SCRIPT_TOKEN = Deno.env.get('APPS_SCRIPT_TOKEN')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Ações que exigem login (dados de paciente) vs. públicas (config do
// tablet) — mesma distinção que já existe em appscript/codigo.js.
const ACOES_PUBLICAS = new Set(['config', 'configuracao']);

// CORS: dashboard.html roda em outro domínio (GitHub Pages) e manda um
// header customizado (Authorization) — isso obriga o navegador a mandar
// um preflight OPTIONS antes da chamada real. Sem responder esse
// preflight com os headers certos, o navegador BLOQUEIA a resposta antes
// mesmo dela chegar no JS — a chamada aparece como falha de rede no
// cliente mesmo que o servidor tenha respondido 200 (é exatamente o que
// aconteceu ao testar isto direto por curl: funcionou, porque curl não
// aplica regra de CORS — só o navegador aplica).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'dados';

  if (!ACOES_PUBLICAS.has(action)) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');

    if (!jwt) {
      return new Response(JSON.stringify({ erro: 'Não autenticado.' }), { status: 401, headers: CORS_HEADERS });
    }

    // Confirma que o JWT é de uma sessão Supabase válida — não decodifica
    // "na mão", deixa o próprio SDK validar assinatura/expiração.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error } = await supabase.auth.getUser(jwt);

    if (error || !userData?.user) {
      return new Response(JSON.stringify({ erro: 'Sessão inválida ou expirada.' }), { status: 401, headers: CORS_HEADERS });
    }
    // Usuário válido — segue pro Apps Script. (Checagem de papel/RLS já
    // aconteceu no login; aqui só confirmamos que a sessão é real.)
  }

  // Monta a URL real do Apps Script, incluindo o token que nunca chega
  // no navegador do usuário.
  const alvo = new URL(APPS_SCRIPT_URL);
  url.searchParams.forEach((v, k) => alvo.searchParams.set(k, v));
  // IMPORTANTE: este set() precisa vir DEPOIS do forEach acima — se o
  // cliente mandar um "token" próprio na query string (por engano ou
  // tentativa de forjar), esta linha sobrescreve com o token real do
  // secret. Não inverter a ordem numa refatoração futura.
  if (!ACOES_PUBLICAS.has(action)) {
    alvo.searchParams.set('token', APPS_SCRIPT_TOKEN);
  }

  const resp = await fetch(alvo.toString());
  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
