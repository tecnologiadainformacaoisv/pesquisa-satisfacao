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
// Atualização (2026-09-09, decisão do gestor): além de exigir login, a
// resposta agora é FILTRADA por município conforme o papel do usuário —
// super_admin vê tudo, admin/visualizador só veem o(s) município(s) do
// próprio perfil (perfis.municipios). Como o dashboard.html só chama esta
// function depois de login (nunca antes), toda ação agora exige JWT
// válido — não existe mais ação "pública" aqui (diferente do Apps Script,
// onde config/configuracao continuam públicas pros TABLETS, que chamam o
// Apps Script direto, não esta function).
//
// Deploy:
//   supabase functions deploy dashboard-proxy
//   supabase secrets set APPS_SCRIPT_URL=https://script.google.com/macros/s/XXX/exec
//   supabase secrets set APPS_SCRIPT_TOKEN=<o mesmo DADOS_TOKEN de appscript/codigo.js>
//
// Chamada esperada do dashboard.html:
//   fetch(`${SUPABASE_URL}/functions/v1/dashboard-proxy?action=dados`, {
//     headers: { Authorization: `Bearer ${session.access_token}` }
//   })

import { createClient } from 'jsr:@supabase/supabase-js@2';

const APPS_SCRIPT_URL   = Deno.env.get('APPS_SCRIPT_URL')!;
const APPS_SCRIPT_TOKEN = Deno.env.get('APPS_SCRIPT_TOKEN')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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

// Ações que devolvem lista de linhas com município (pra filtrar por
// escopo) — "configuracao" devolve um objeto {senha:...}, não filtra.
const ACOES_COM_LINHAS = new Set(['dados', 'dadosAntigos', 'dadosInternos', 'dadosColaboradores', 'config']);

// Normaliza pra comparar município tolerando acento/caixa — mesma lição
// do bug "Maracanau" vs "Maracanaú" da Fase 2, mas mais forte que a
// normalização usada lá (appscript/expansaoEquipamentos.js normaliza só
// NFC/caixa, sem remover acento — aqui precisa remover de fato, porque
// "Maracanau" e "Maracanaú" só batem se o acento for descartado).
function normalizarMunicipio(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'dados';

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
  const { data: userData, error: erroUser } = await supabase.auth.getUser(jwt);

  if (erroUser || !userData?.user) {
    return new Response(JSON.stringify({ erro: 'Sessão inválida ou expirada.' }), { status: 401, headers: CORS_HEADERS });
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from('perfis')
    .select('papel, municipios')
    .eq('id', userData.user.id)
    .single();

  if (erroPerfil || !perfil) {
    return new Response(JSON.stringify({ erro: 'Perfil não encontrado — contate um administrador.' }), { status: 403, headers: CORS_HEADERS });
  }

  const ehSuperAdmin = perfil.papel === 'super_admin';
  const municipiosEscopo = new Set((perfil.municipios ?? []).map(normalizarMunicipio));

  // Monta a URL real do Apps Script, incluindo o token que nunca chega
  // no navegador do usuário.
  const alvo = new URL(APPS_SCRIPT_URL);
  url.searchParams.forEach((v, k) => alvo.searchParams.set(k, v));
  // IMPORTANTE: este set() precisa vir DEPOIS do forEach acima — se o
  // cliente mandar um "token" próprio na query string (por engano ou
  // tentativa de forjar), esta linha sobrescreve com o token real do
  // secret. Não inverter a ordem numa refatoração futura.
  alvo.searchParams.set('token', APPS_SCRIPT_TOKEN);

  // User-Agent explícito: sem isso, o fetch do Deno manda um UA genérico
  // que o Google às vezes trata como bot e devolve uma página de erro do
  // Drive (404 HTML) em vez de seguir o redirect até o JSON real do Apps
  // Script — bug real encontrado testando esta function após o deploy
  // (curl com -A "Mozilla/5.0" funcionava, sem UA/com UA de Deno não).
  const resp = await fetch(alvo.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PesquisaSatisfacaoISV-Proxy/1.0)' },
  });
  const textoBody = await resp.text();

  if (!resp.ok || !ACOES_COM_LINHAS.has(action) || ehSuperAdmin) {
    // super_admin, ou ação sem filtro de município, ou erro do Apps
    // Script (repassa como veio pra não mascarar o erro real) — sem
    // filtragem.
    return new Response(textoBody, {
      status: resp.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Filtra por município do perfil — admin/visualizador só vê o(s)
  // próprio(s) município(s). "config" usa chave "municipio" (minúsculo);
  // as ações de dados usam "Municipio" (maiúsculo) — appscript/codigo.js.
  let linhas: unknown;
  try {
    linhas = JSON.parse(textoBody);
  } catch {
    // Resposta não era JSON (erro inesperado do Apps Script) — repassa
    // crua em vez de mascarar com um array vazio.
    return new Response(textoBody, {
      status: resp.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(linhas)) {
    return new Response(textoBody, {
      status: resp.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const filtradas = linhas.filter((r: Record<string, unknown>) => {
    const municipioLinha = (r.Municipio ?? r.municipio) as string | undefined;
    return municipioLinha && municipiosEscopo.has(normalizarMunicipio(municipioLinha));
  });

  return new Response(JSON.stringify(filtradas), {
    status: resp.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
