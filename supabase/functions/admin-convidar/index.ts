// Etapa D — Edge Function que convida um novo usuário (admin ou
// visualizador). Só SUPER_ADMIN pode chamar isso (2026-09-09: admin comum
// — "gestor" — não gerencia mais outros usuários, só o próprio município)
// — a checagem é feita aqui dentro (não dá pra confiar só no RLS porque
// convidar usuário é uma chamada à Auth Admin API, que fica fora do
// alcance do RLS de tabela).
//
// Fluxo:
//   1. Confere que quem está chamando tem uma sessão Supabase válida
//   2. Confere que esse usuário é super_admin (lê perfis.papel)
//   3. Convida por e-mail via Auth Admin API (usa o service_role, que fica
//      só aqui — nunca chega no navegador)
//   4. Cria a linha em perfis (papel, lista de municípios)
//   5. Grava log de auditoria da ação de convite
//
// Deploy:
//   supabase functions deploy admin-convidar
//   (SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY já vêm injetadas automaticamente)
//
// Chamada esperada do painel (admin.html):
//   fetch(`${SUPABASE_URL}/functions/v1/admin-convidar`, {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, papel, municipios: ['Guaraciaba do Norte'] })
//   })

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL_ACEITAR     = Deno.env.get('SITE_URL_ACEITAR') ??
  'https://tecnologiadainformacaoisv.github.io/pesquisa-satisfacao/supabase/aceitar-convite.html';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ erro: 'Método não permitido.' }), { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ erro: 'Não autenticado.' }), { status: 401, headers: CORS_HEADERS });
  }

  // Cliente "de quem chamou" — só pra validar sessão e checar o próprio papel.
  const clienteChamador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: erroUser } = await clienteChamador.auth.getUser(jwt);
  if (erroUser || !userData?.user) {
    return new Response(JSON.stringify({ erro: 'Sessão inválida ou expirada.' }), { status: 401, headers: CORS_HEADERS });
  }

  const { data: perfilChamador, error: erroPerfil } = await clienteChamador
    .from('perfis')
    .select('papel')
    .eq('id', userData.user.id)
    .single();

  if (erroPerfil || !perfilChamador || perfilChamador.papel !== 'super_admin') {
    return new Response(JSON.stringify({ erro: 'Só o super administrador pode convidar usuários.' }), { status: 403, headers: CORS_HEADERS });
  }

  let body: { email?: string; papel?: string; municipios?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Corpo da requisição inválido.' }), { status: 400, headers: CORS_HEADERS });
  }

  const { email, papel = 'visualizador', municipios = [] } = body;
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ erro: 'E-mail inválido.' }), { status: 400, headers: CORS_HEADERS });
  }
  if (papel !== 'admin' && papel !== 'visualizador' && papel !== 'super_admin') {
    return new Response(JSON.stringify({ erro: "Papel precisa ser 'admin', 'visualizador' ou 'super_admin'." }), { status: 400, headers: CORS_HEADERS });
  }
  // admin/visualizador precisam de pelo menos 1 município — sem isso a
  // pessoa ficaria sem escopo nenhum, o que hoje (dashboard-proxy) some
  // como "não vejo nada" em vez de "vejo tudo por engano", mas é melhor
  // travar aqui e dar um erro claro do que deixar um perfil incompleto.
  if (papel !== 'super_admin' && (!Array.isArray(municipios) || municipios.length === 0)) {
    return new Response(JSON.stringify({ erro: "Admin/visualizador precisa de pelo menos 1 município em 'municipios'." }), { status: 400, headers: CORS_HEADERS });
  }

  // Cliente com service_role — só a partir daqui, e só dentro do servidor.
  const clienteAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: convite, error: erroConvite } = await clienteAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: SITE_URL_ACEITAR,
  });

  if (erroConvite || !convite?.user) {
    return new Response(JSON.stringify({ erro: `Falha ao convidar: ${erroConvite?.message ?? 'erro desconhecido'}` }), { status: 500, headers: CORS_HEADERS });
  }

  const { error: erroPerfilNovo } = await clienteAdmin.from('perfis').insert({
    id: convite.user.id,
    nome: email.split('@')[0],
    papel,
    municipios: papel === 'super_admin' ? null : municipios,
    convidado_por: userData.user.id,
  });

  if (erroPerfilNovo) {
    // Sem isso, o usuário fica órfão no Auth (convite já enviado, sem
    // perfil) e uma nova tentativa pro mesmo e-mail falha em
    // inviteUserByEmail ("já existe"), exigindo limpeza manual. Desfaz o
    // convite pra deixar o estado consistente e permitir tentar de novo.
    await clienteAdmin.auth.admin.deleteUser(convite.user.id);
    return new Response(JSON.stringify({ erro: `Falha ao salvar o perfil, convite desfeito: ${erroPerfilNovo.message}` }), { status: 500, headers: CORS_HEADERS });
  }

  await clienteAdmin.from('log_auditoria').insert({
    usuario_id: userData.user.id,
    acao: 'convite',
    detalhes: { email_convidado: email, papel, municipios },
  });

  return new Response(JSON.stringify({ ok: true, email, papel, municipios }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
