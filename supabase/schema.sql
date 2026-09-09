-- ============================================================================
-- Pesquisa de Satisfação ISV — Controle de acesso
-- ============================================================================
-- Projeto separado de manutenção dos tablets em produção (ver CLAUDE.md,
-- seção "Modo de operação").
--
-- ⚠️ Este arquivo é a FOTOGRAFIA FINAL do schema (útil pra recriar o banco
-- do zero num projeto novo). O banco em produção foi construído em 2
-- passos — este arquivo original (Etapa A) + a migration incremental em
-- supabase/migrations/0002 e 0003 (modelo de município(s) + super_admin,
-- 2026-09-09). Se for recriar do zero, rodar só este arquivo já basta.
--
-- Como aplicar (banco novo):
--   1. Criar um projeto em https://supabase.com (gratuito no plano free)
--   2. Authentication → Providers → deixar só "Email" ativo
--   3. Authentication → Settings → desativar "Allow new users to sign up"
--      (ninguém cria conta própria — só convite feito por super_admin)
--   4. SQL Editor → colar este arquivo inteiro → Run
-- ============================================================================

-- Papéis:
--   super_admin — vê e gerencia TUDO (todos os municípios, convida gente,
--                 configura qualquer tablet). Só a TI tem esse papel.
--   admin       — "gestor": configura tablet e vê dashboard só do(s)
--                 próprio(s) município(s) (coluna "municipios"). NÃO
--                 gerencia outros usuários.
--   visualizador — só vê o dashboard, também restrito ao(s) município(s).
create type public.papel_usuario as enum ('super_admin', 'admin', 'visualizador');

-- Perfil de cada usuário — estende auth.users (tabela interna do Supabase
-- que já guarda e-mail/senha com hash; nunca lemos/gravamos senha aqui).
-- Não há policy de INSERT pra usuário comum (de propósito, evita
-- autocriação/escalada) — a linha do convidado é criada pela Edge Function
-- "admin-convidar", que usa o service_role (bypassa RLS) depois de
-- confirmar que quem chamou é super_admin.
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel public.papel_usuario not null default 'visualizador',
  municipios text[],  -- ex.: ['Guaraciaba do Norte'] — NULL/vazio pra super_admin (não precisa de escopo)
  convidado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Metadados de cada usuário: papel (super_admin/admin/visualizador) e,
   pra admin/visualizador, a lista de municípios que ele pode ver/gerenciar
   — usado tanto pro dashboard filtrar dados quanto pra detectar
   configuração de tablet fora do escopo esperado.';

comment on column public.perfis.municipios is
  'Municípios que esse usuário pode ver/gerenciar. NULL ou vazio pra
   super_admin (não precisa de escopo, vê tudo). Admin/visualizador
   sempre devem ter pelo menos 1 município.';

-- Log de auditoria: login, convite, configuração de tablet.
create table public.log_auditoria (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id),
  acao text not null check (acao in ('login', 'convite', 'config_tablet')),
  detalhes jsonb not null default '{}',
    -- config_tablet: {"municipio": "...", "unidade": "...",
    --                  "municipios_esperados": [...], "divergente": true/false}
    -- convite: {"email_convidado": "...", "papel": "...", "municipios": [...]}
  criado_em timestamptz not null default now()
);

create index idx_log_auditoria_usuario on public.log_auditoria(usuario_id);
create index idx_log_auditoria_acao on public.log_auditoria(acao);
create index idx_log_auditoria_criado_em on public.log_auditoria(criado_em desc);

-- ============================================================================
-- Segurança em nível de linha (RLS) — cada usuário só lê o próprio perfil;
-- só super_admin lê/escreve o perfil de outras pessoas. Sem isso, qualquer
-- chave pública do Supabase conseguiria ler a tabela inteira de usuários.
-- ============================================================================

alter table public.perfis enable row level security;
alter table public.log_auditoria enable row level security;

-- IMPORTANTE sobre SECURITY DEFINER (eh_admin/eh_super_admin abaixo): só
-- evita recursão infinita nas policies de "perfis" (que chamam essas
-- funções, que leem a própria "perfis") PORQUE, ao rodar este script pelo
-- SQL Editor do Supabase, o owner da função fica sendo o role "postgres",
-- que tem BYPASSRLS. Se um dia essas funções forem recriadas por outro
-- role (ex.: migration via CI/CD com role de app), sem BYPASSRLS, a mesma
-- policy pode estourar "infinite recursion detected in policy for
-- relation perfis" em runtime. Se isso acontecer, recriar a função como
-- role postgres (SQL Editor) resolve.

-- Usuário logado é super_admin (vê/gerencia tudo)?
create or replace function public.eh_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'super_admin'
  );
$$;

-- Usuário logado é admin OU super_admin (configura tablet, mas só do
-- próprio escopo se não for super_admin — o filtro por município é feito
-- na Edge Function, não aqui).
create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel in ('admin', 'super_admin')
  );
$$;

-- perfis: cada um lê o próprio; só super_admin lê/gerencia todos (um admin
-- de um município não deve ver o perfil de admin de outro município).
create policy "usuario le proprio perfil"
  on public.perfis for select
  using (id = auth.uid() or public.eh_super_admin());

create policy "super_admin gerencia perfis"
  on public.perfis for all
  using (public.eh_super_admin())
  with check (public.eh_super_admin());

-- log_auditoria: só super_admin lê tudo (visão por município pra gestores
-- fica pra uma iteração futura, se pedirem); qualquer autenticado insere
-- só a própria ação.
create policy "super_admin le auditoria"
  on public.log_auditoria for select
  using (public.eh_super_admin());

create policy "usuario registra propria acao"
  on public.log_auditoria for insert
  with check (usuario_id = auth.uid());

-- ============================================================================
-- Primeiro super_admin: depois de criar o projeto e convidar a si mesmo
-- pelo painel do Supabase (Authentication → Users → Invite), rodar isto
-- substituindo o e-mail — só precisa 1x, pra alguém existir como
-- super_admin e poder convidar o resto por dentro do painel de
-- administração:
--
-- update public.perfis set papel = 'super_admin'
--   where id = (select id from auth.users where email = 'tecnologiadainformacao@institutosaovicente.com.br');
-- ============================================================================
