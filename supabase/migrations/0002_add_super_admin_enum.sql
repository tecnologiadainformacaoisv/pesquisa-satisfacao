-- Precisa estar em migration separada da 0003: Postgres não permite usar
-- um valor de enum recém-adicionado na mesma transação em que foi criado
-- (SQLSTATE 55P04) — supabase db push roda cada arquivo como 1 transação.
alter type public.papel_usuario add value if not exists 'super_admin';
