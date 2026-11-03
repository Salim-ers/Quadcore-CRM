-- ═══════════════════════════════════════════════════════════════════════
--  QUADCORE — identification fiable dès la première requête
--
--  Sur une connexion neuve de la Data API (après un réveil de la base, par exemple),
--  auth.uid() renvoie NULL pendant toute la première requête. La RLS répondait alors
--  « aucune ligne », sans erreur : listes vides à la première ouverture, et garde-fous
--  qui prenaient l'appelant pour le serveur.
--  Le réglage request.jwt.claims, lui, est présent dès cette première requête. La Data API
--  ne le remplit qu'après avoir vérifié la signature du jeton, et rien de ce qu'elle expose
--  ne permet à un appelant de le modifier.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.current_uid() returns uuid
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

do $$
declare
  f record;
  p record;
  c record;
  clauses text;
begin
  -- Fonctions et triggers
  for f in
    select pg_get_functiondef(o.oid) as def
    from pg_proc o join pg_namespace n on n.oid = o.pronamespace
    where n.nspname = 'public' and o.prokind = 'f' and o.prosrc like '%auth.uid()%' and o.proname <> 'current_uid'
  loop
    execute replace(f.def, 'auth.uid()', 'public.current_uid()');
  end loop;

  -- Politiques RLS
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public' and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
  loop
    clauses := '';
    if p.qual is not null then clauses := ' using (' || replace(p.qual, 'auth.uid()', 'public.current_uid()') || ')'; end if;
    if p.with_check is not null then clauses := clauses || ' with check (' || replace(p.with_check, 'auth.uid()', 'public.current_uid()') || ')'; end if;
    execute format('alter policy %I on public.%I', p.policyname, p.tablename) || clauses;
  end loop;

  -- Valeurs par défaut (created_by, author_id, uploaded_by)
  for c in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public' and column_default like '%auth.uid()%'
  loop
    execute format('alter table public.%I alter column %I set default public.current_uid()', c.table_name, c.column_name);
  end loop;
end $$;
