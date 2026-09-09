-- ============================================================================
-- Pesquisa de Satisfação ISV — Controle de acesso (Etapa A)
-- ============================================================================
-- Projeto separado de manutenção dos tablets em produção (ver CLAUDE.md,
-- seção "Modo de operação"). Não afeta pesquisa.html/dashboard.html/sw.js
-- até a Etapa E, quando o overlay de configuração passar a exigir login.
--
-- Como aplicar:
--   1. Criar um projeto em https://supabase.com (gratuito no plano free)
--   2. Authentication → Providers → deixar só "Email" ativo
--   3. Authentication → Settings → desativar "Allow new users to sign up"
--      (ninguém cria conta própria — só convite feito por admin)
--   4. SQL Editor → colar este arquivo inteiro → Run
-- ============================================================================

-- Papéis possíveis. "admin" configura tablets e convida gente;
-- "visualizador" só acessa o dashboard.
create type public.papel_usuario as enum ('admin', 'visualizador');

-- Perfil de cada usuário — estende auth.users (tabela interna do Supabase
-- que já guarda e-mail/senha com hash; nunca lemos/gravamos senha aqui).
-- Não há policy de INSERT pra usuário comum (de propósito, evita
-- autocriação/escalada) — a linha do convidado precisa ser criada pelo
-- admin (a policy "admin gerencia perfis" cobre isso) ou por um trigger
-- security definer em auth.users, a decidir na Etapa B/D (provisionamento).
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel public.papel_usuario not null default 'visualizador',
  municipio_esperado text,   -- ex.: 'Pedra Branca' — null se não se aplicar (visualizador)
  unidade_esperada text,     -- ex.: 'Hospital Municipal São Sebastião'
  convidado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Metadados de cada usuário: papel (admin/visualizador) e, pra admins que '
  'configuram tablet, qual município/unidade é esperado dele — usado pra '
  'detectar configuração fora do esperado.';

-- Log de auditoria: login, convite, configuração de tablet.
create table public.log_auditoria (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id),
  acao text not null check (acao in ('login', 'convite', 'config_tablet')),
  detalhes jsonb not null default '{}',
    -- config_tablet: {"municipio": "...", "unidade": "...",
    --                  "municipio_esperado": "...", "unidade_esperada": "...",
    --                  "divergente": true/false}
    -- convite: {"email_convidado": "...", "papel": "..."}
  criado_em timestamptz not null default now()
);

create index idx_log_auditoria_usuario on public.log_auditoria(usuario_id);
create index idx_log_auditoria_acao on public.log_auditoria(acao);
create index idx_log_auditoria_criado_em on public.log_auditoria(criado_em desc);

-- ============================================================================
-- Segurança em nível de linha (RLS) — cada usuário só lê o próprio perfil;
-- admins leem/escrevem tudo. Sem isso, qualquer chave pública do Supabase
-- conseguiria ler a tabela inteira de usuários.
-- ============================================================================

alter table public.perfis enable row level security;
alter table public.log_auditoria enable row level security;

-- Função auxiliar: usuário autenticado é admin?
-- IMPORTANTE: SECURITY DEFINER só evita recursão infinita nas policies de
-- "perfis" (que chamam esta função, que lê a própria "perfis") PORQUE, ao
-- rodar este script pelo SQL Editor do Supabase, o owner da função fica
-- sendo o role "postgres", que tem BYPASSRLS. Se um dia esta função for
-- recriada por outro role (ex.: migration via CI/CD com role de app), sem
-- BYPASSRLS, a mesma policy pode estourar "infinite recursion detected in
-- policy for relation perfis" em runtime. Se isso acontecer, recriar a
-- função como role postgres (SQL Editor) resolve.
create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- perfis: cada um lê o próprio; admin lê/escreve todos
create policy "usuario le proprio perfil"
  on public.perfis for select
  using (id = auth.uid() or public.eh_admin());

create policy "admin gerencia perfis"
  on public.perfis for all
  using (public.eh_admin())
  with check (public.eh_admin());

-- log_auditoria: só admin lê; qualquer autenticado pode inserir a própria ação
create policy "admin le auditoria"
  on public.log_auditoria for select
  using (public.eh_admin());

create policy "usuario registra propria acao"
  on public.log_auditoria for insert
  with check (usuario_id = auth.uid());

-- ============================================================================
-- Primeiro admin: depois de criar o projeto e convidar a si mesmo (ou o
-- Henrique) pelo painel do Supabase (Authentication → Users → Invite),
-- rodar isto substituindo o e-mail — só precisa 1x, pra alguém existir como
-- admin e poder convidar o resto por dentro do painel de administração:
--
-- update public.perfis set papel = 'admin'
--   where id = (select id from auth.users where email = 'henrique.krvalho@gmail.com');
-- ============================================================================
