-- ═══════════════════════════════════════════════════════════════════════
--  QUADCORE — synchronisation entre appareils et droits de la Data API
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── Journal des changements ──────────────────────
-- Chaque appareil ouvert le relit toutes les 10 secondes pour afficher le travail des autres.
-- On n'en garde que les 2 000 dernières lignes : un appareil revenu après une absence
-- recharge tout de toute façon.
create table public.db_changes (
  seq         bigint generated always as identity primary key,
  table_name  text not null,
  op          text not null check (op in ('INSERT','UPDATE','DELETE')),
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  payload jsonb;
  written bigint;
begin
  if tg_op = 'DELETE' then payload := to_jsonb(old); else payload := to_jsonb(new); end if;
  insert into db_changes (table_name, op, data) values (tg_table_name, tg_op, payload) returning seq into written;
  delete from db_changes where seq <= written - 2000;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','prospects','projects','revisions','tasks','tickets','comments','attachments','status_history','activities'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function log_change()', t || '_changes', t);
  end loop;
end $$;

alter table public.db_changes enable row level security;
create policy "membres lisent" on public.db_changes for select using (is_member());

-- ───────────────────────── Droits de la Data API ────────────────────────
-- Les GRANT ouvrent les tables au rôle des utilisateurs connectés ; la RLS décide ensuite ligne par ligne.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on public.db_changes from authenticated;
