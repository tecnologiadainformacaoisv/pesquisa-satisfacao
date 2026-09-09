-- ============================================================================
-- Migração 0003: modelo de acesso por município(s) + super_admin
-- (o valor 'super_admin' do enum já foi criado na migration 0002 anterior,
-- em transação separada — Postgres exige isso)
-- ============================================================================
-- Decisão do gestor (2026-09-09): admins e visualizadores não devem ver
-- outros municípios além do(s) próprio(s) — só o super_admin (TI) vê tudo.
-- Uma pessoa pode estar ligada a vários municípios (supervisor regional),
-- por isso "municipios" é lista (text[]), não campo único.
--
-- Rebaixa o significado de "admin" (agora = gestor, escopo por município,
-- NÃO gerencia outros usuários) e cria "super_admin" (TI, vê/gerencia tudo,
-- só ele convida gente). Ver supabase/README.md pro modelo de papéis
-- completo.
-- ============================================================================

alter type public.papel_usuario add value if not exists 'super_admin';

alter table public.perfis add column if not exists municipios text[];

update public.perfis
  set municipios = array[municipio_esperado]
  where municipio_esperado is not null and municipios is null;

alter table public.perfis drop column if exists municipio_esperado;
alter table public.perfis drop column if exists unidade_esperada;

-- Quem já era "admin" (só existia o primeiro usuário, a TI) vira super_admin.
-- Rodar de novo não quebra nada — WHERE já não bate na segunda execução.
update public.perfis set papel = 'super_admin' where papel = 'admin';

comment on column public.perfis.municipios is
  'Municípios que esse usuário pode ver/gerenciar. NULL ou vazio pra
   super_admin (não precisa de escopo, vê tudo). Admin/visualizador
   sempre devem ter pelo menos 1 município.';

-- Checa se o usuário logado é super_admin (vê/gerencia tudo).
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

-- eh_admin() agora inclui super_admin (super_admin pode fazer tudo que
-- admin faz, e mais) — mantido por compatibilidade de nome, mas o
-- significado de "admin" mudou: só configura tablet/vê dashboard do
-- PRÓPRIO município, não gerencia outros usuários (isso agora é só
-- super_admin, ver policies abaixo).
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

-- Gerenciar OUTROS usuários (convidar, editar papel/município de
-- terceiros) agora é exclusivo de super_admin — um admin (gestor) não
-- deve conseguir ver nem editar o perfil de gestores de outro município.
drop policy if exists "usuario le proprio perfil" on public.perfis;
create policy "usuario le proprio perfil"
  on public.perfis for select
  using (id = auth.uid() or public.eh_super_admin());

drop policy if exists "admin gerencia perfis" on public.perfis;
create policy "super_admin gerencia perfis"
  on public.perfis for all
  using (public.eh_super_admin())
  with check (public.eh_super_admin());

-- Auditoria: só super_admin tem visão completa por enquanto (visão por
-- município pra gestores fica pra uma iteração futura, se pedirem).
drop policy if exists "admin le auditoria" on public.log_auditoria;
create policy "super_admin le auditoria"
  on public.log_auditoria for select
  using (public.eh_super_admin());
