-- ═══════════════════════════════════════════════════════════════════════
--  QUADCORE CRM — schéma complet
--  À exécuter une fois dans Supabase › SQL Editor (ou `supabase db push`).
--  Contenu : tables, contraintes, RLS, historique + activité automatiques
--  (triggers), temps réel, stockage des fichiers.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────── Profils (1 par compte Supabase Auth) ─────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text not null default '',
  last_name   text not null default '',
  avatar_url  text,
  role        text not null default 'member' check (role in ('admin','member')),
  color       text not null default '#AA543D',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Helpers de sécurité (security definer : lisent profiles sans boucler sur la RLS)
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin')
$$;

-- Création automatique du profil à l'inscription / l'invitation.
-- Le tout premier compte devient administrateur ; les suivants sont collaborateurs
-- (le rôle n'est jamais lu depuis les métadonnées saisies par l'utilisateur).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  palette text[] := array['#AA543D','#2F6B5E','#3D5A80','#8A6A2F','#6B4E3D','#52606D'];
  n int;
begin
  select count(*) into n from profiles;
  insert into profiles (id, email, first_name, last_name, role, color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    case when n = 0 then 'admin' else 'member' end,
    palette[(n % array_length(palette, 1)) + 1]
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un collaborateur ne peut ni changer son rôle ni se désactiver ; on garde toujours un admin.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nul = contexte serveur de confiance (service role, SQL editor) : aucune politique RLS n'autorise l'anonyme
  if (new.role is distinct from old.role or new.active is distinct from old.active) and auth.uid() is not null and not is_admin() then
    raise exception 'Seul un administrateur peut modifier les rôles et les accès';
  end if;
  if old.role = 'admin' and (new.role <> 'admin' or not new.active)
     and (select count(*) from profiles where role = 'admin' and active and id <> old.id) = 0 then
    raise exception 'QUADCORE doit conserver au moins un administrateur actif';
  end if;
  new.id := old.id; new.email := old.email; new.created_at := old.created_at;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

-- ───────────────────────── Prospects ────────────────────────────────────
create table public.prospects (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) > 0),
  logo_path        text,
  category         text check (category in ('restaurant','cafe','boulangerie','barber','artisan','commerce','autre')),
  contact_name     text,
  phone            text,
  email            text,
  address          text,
  city             text,
  instagram_handle text,
  instagram_url    text,
  facebook_url     text,
  tiktok_url       text,
  linkedin_url     text,
  website_url      text,
  source           text,
  service          text,
  notes            text,
  owner_id         uuid references public.profiles(id) on delete set null,
  priority         text not null default 'normale' check (priority in ('basse','normale','haute')),
  status           text not null default 'a_prospecter' check (status in
                   ('a_prospecter','contacte','en_attente','a_relancer','interesse','demo_proposee','devis_envoye','gagne','perdu')),
  lost_reason      text,
  next_follow_up   date,
  archived         boolean not null default false,
  created_by       uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index prospects_status_idx on public.prospects (status) where not archived;
create index prospects_owner_idx on public.prospects (owner_id);
create index prospects_follow_idx on public.prospects (next_follow_up) where not archived;

-- ───────────────────────── Projets (sites internet) ─────────────────────
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid references public.prospects(id) on delete set null,
  name            text not null check (length(trim(name)) > 0),
  type            text not null default 'vitrine' check (type in ('vitrine','ecommerce','click_collect','application','autre')),
  description     text,
  owner_id        uuid references public.profiles(id) on delete set null,
  start_date      date,
  due_date        date,
  demo_url        text,
  final_url       text,
  github_url      text,
  price_proposed  numeric(10,2),
  price_accepted  numeric(10,2),
  billing_status  text not null default 'non_facture' check (billing_status in ('non_facture','devis_envoye','acompte_recu','facture','paye')),
  status          text not null default 'a_preparer' check (status in
                  ('a_preparer','demo_creation','demo_prete','demo_envoyee','attente_validation','modifs_demandees',
                   'demo_refusee','demo_validee','dev_final','pret_livrer','livre','maintenance')),
  revision_round  int not null default 1,
  archived        boolean not null default false,
  created_by      uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index projects_prospect_idx on public.projects (prospect_id);
create index projects_status_idx on public.projects (status) where not archived;

-- ───────────────────────── Retouches ────────────────────────────────────
create table public.revisions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  round         int not null default 1,
  description   text not null check (length(trim(description)) > 0),
  status        text not null default 'a_faire' check (status in ('a_faire','en_cours','termine')),
  assignee_id   uuid references public.profiles(id) on delete set null,
  due_date      date,
  position      int not null default 0,
  created_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index revisions_project_idx on public.revisions (project_id, round);

-- ───────────────────────── Tâches & relances ────────────────────────────
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) > 0),
  description   text,
  assignee_id   uuid references public.profiles(id) on delete set null,
  due_date      date,
  priority      text not null default 'normale' check (priority in ('basse','normale','haute')),
  status        text not null default 'a_faire' check (status in ('a_faire','en_cours','termine')),
  prospect_id   uuid references public.prospects(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  is_follow_up  boolean not null default false,
  created_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tasks_due_idx on public.tasks (due_date) where status <> 'termine';
create index tasks_assignee_idx on public.tasks (assignee_id);

-- ───────────────────────── Commentaires & fichiers (polymorphes) ────────
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('prospect','project','revision','task')),
  entity_id    uuid not null,
  author_id    uuid references public.profiles(id) on delete set null default auth.uid(),
  body         text not null check (length(trim(body)) > 0),
  created_at   timestamptz not null default now()
);
create index comments_entity_idx on public.comments (entity_type, entity_id);

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('prospect','project','revision','task')),
  entity_id    uuid not null,
  file_path    text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments (entity_type, entity_id);

-- ───────────────────────── Historique des statuts & activité ────────────
create table public.status_history (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('prospect','project')),
  entity_id    uuid not null,
  from_status  text,
  to_status    text not null,
  note         text,
  changed_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index status_history_entity_idx on public.status_history (entity_type, entity_id, created_at desc);

create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  actor_id     uuid references public.profiles(id) on delete set null,
  prospect_id  uuid references public.prospects(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index activities_created_idx on public.activities (created_at desc);

-- ═══════════════════════════ Triggers métier ═══════════════════════════

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger prospects_touch before update on public.prospects for each row execute function touch_updated_at();
create trigger projects_touch  before update on public.projects  for each row execute function touch_updated_at();
create trigger revisions_touch before update on public.revisions for each row execute function touch_updated_at();
create trigger tasks_touch     before update on public.tasks     for each row execute function touch_updated_at();

-- Archivage réservé aux administrateurs ; date de complétion automatique
create or replace function public.guard_archive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.archived is distinct from old.archived and auth.uid() is not null and not is_admin() then
    raise exception 'Seul un administrateur peut archiver un dossier';
  end if;
  return new;
end $$;
create trigger prospects_archive_guard before update on public.prospects for each row execute function guard_archive();
create trigger projects_archive_guard  before update on public.projects  for each row execute function guard_archive();

create or replace function public.stamp_completed() returns trigger language plpgsql as $$
begin
  if new.status = 'termine' and (tg_op = 'INSERT' or old.status <> 'termine') then new.completed_at := now();
  elsif new.status <> 'termine' then new.completed_at := null; end if;
  return new;
end $$;
create trigger revisions_completed before insert or update of status on public.revisions for each row execute function stamp_completed();
create trigger tasks_completed     before insert or update of status on public.tasks     for each row execute function stamp_completed();

-- Prospects → historique + fil d'activité
create or replace function public.log_prospect() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if tg_op = 'INSERT' then
    insert into status_history (entity_type, entity_id, from_status, to_status, changed_by)
      values ('prospect', new.id, null, new.status, auth.uid());
    insert into activities (type, actor_id, prospect_id, meta)
      values ('prospect_added', auth.uid(), new.id, jsonb_build_object('name', new.name));
  elsif new.status is distinct from old.status then
    insert into status_history (entity_type, entity_id, from_status, to_status, note, changed_by)
      values ('prospect', new.id, old.status, new.status,
              case when new.status = 'perdu' then new.lost_reason end, auth.uid());
    t := case new.status when 'contacte' then 'prospect_contacted'
                         when 'gagne'    then 'prospect_won'
                         when 'perdu'    then 'prospect_lost'
                         else 'prospect_status' end;
    insert into activities (type, actor_id, prospect_id, meta)
      values (t, auth.uid(), new.id, jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status, 'reason', new.lost_reason));
  end if;
  return new;
end $$;
create trigger prospects_log after insert or update on public.prospects for each row execute function log_prospect();

-- Projets → historique + fil d'activité
create or replace function public.log_project() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if tg_op = 'INSERT' then
    insert into status_history (entity_type, entity_id, from_status, to_status, changed_by)
      values ('project', new.id, null, new.status, auth.uid());
    insert into activities (type, actor_id, prospect_id, project_id, meta)
      values ('project_created', auth.uid(), new.prospect_id, new.id, jsonb_build_object('name', new.name));
  elsif new.status is distinct from old.status then
    insert into status_history (entity_type, entity_id, from_status, to_status, changed_by)
      values ('project', new.id, old.status, new.status, auth.uid());
    t := case new.status when 'demo_envoyee' then 'demo_sent'
                         when 'demo_validee' then 'demo_validated'
                         when 'livre'        then 'site_delivered'
                         else 'project_status' end;
    insert into activities (type, actor_id, prospect_id, project_id, meta)
      values (t, auth.uid(), new.prospect_id, new.id, jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger projects_log after insert or update on public.projects for each row execute function log_project();

-- Retouches → « Retouche demandée » (regroupées par lot de 15 min) et « Retouches terminées »
create or replace function public.log_revision() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record; remaining int; total int; act uuid;
begin
  select id, name, prospect_id into p from projects where id = new.project_id;
  if tg_op = 'INSERT' then
    select id into act from activities
      where type = 'revision_requested' and project_id = new.project_id and actor_id is not distinct from auth.uid()
        and created_at > now() - interval '15 minutes'
      order by created_at desc limit 1;
    if act is not null then
      update activities set meta = jsonb_set(meta, '{count}', to_jsonb(coalesce((meta->>'count')::int, 1) + 1)) where id = act;
    else
      insert into activities (type, actor_id, prospect_id, project_id, meta)
        values ('revision_requested', auth.uid(), p.prospect_id, p.id,
                jsonb_build_object('name', p.name, 'count', 1, 'description', new.description, 'round', new.round));
    end if;
  elsif new.status = 'termine' and old.status <> 'termine' then
    select count(*) filter (where status <> 'termine'), count(*) into remaining, total
      from revisions where project_id = new.project_id and round = new.round;
    if remaining = 0 and not exists (
         select 1 from activities where type = 'revisions_done' and project_id = new.project_id
           and (meta->>'round')::int = new.round and created_at > now() - interval '1 minute') then
      insert into activities (type, actor_id, prospect_id, project_id, meta)
        values ('revisions_done', auth.uid(), p.prospect_id, p.id, jsonb_build_object('name', p.name, 'total', total, 'round', new.round));
    end if;
  end if;
  return new;
end $$;
create trigger revisions_log after insert or update of status on public.revisions for each row execute function log_revision();

-- Tâches terminées → historique commercial (relance) ou activité simple
create or replace function public.log_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'termine' and old.status <> 'termine' then
    insert into activities (type, actor_id, prospect_id, project_id, meta)
      values (case when new.is_follow_up then 'follow_up_done' else 'task_done' end,
              auth.uid(), new.prospect_id, new.project_id, jsonb_build_object('title', new.title));
  end if;
  return new;
end $$;
create trigger tasks_log after update of status on public.tasks for each row execute function log_task();

-- ═══════════════════════════ Row Level Security ═════════════════════════
-- Toutes les fiches sont partagées entre les membres actifs de QUADCORE.
alter table public.profiles       enable row level security;
alter table public.prospects      enable row level security;
alter table public.projects       enable row level security;
alter table public.revisions      enable row level security;
alter table public.tasks          enable row level security;
alter table public.comments       enable row level security;
alter table public.attachments    enable row level security;
alter table public.status_history enable row level security;
alter table public.activities     enable row level security;

create policy "membres lisent les profils" on public.profiles for select using (is_member() or id = auth.uid());
create policy "chacun modifie son profil, l'admin tous" on public.profiles for update
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

do $$
declare t text;
begin
  foreach t in array array['prospects','projects','revisions','tasks'] loop
    execute format('create policy "membres lisent" on public.%I for select using (is_member())', t);
    execute format('create policy "membres créent" on public.%I for insert with check (is_member())', t);
    execute format('create policy "membres modifient" on public.%I for update using (is_member()) with check (is_member())', t);
  end loop;
end $$;

-- Suppression définitive : prospects/projets réservés à l'admin (on archive plutôt) ;
-- retouches et tâches supprimables par l'équipe.
create policy "admin supprime" on public.prospects for delete using (is_admin());
create policy "admin supprime" on public.projects  for delete using (is_admin());
create policy "membres suppriment" on public.revisions for delete using (is_member());
create policy "membres suppriment" on public.tasks     for delete using (is_member());

create policy "membres lisent" on public.comments for select using (is_member());
create policy "membres commentent" on public.comments for insert with check (is_member() and author_id = auth.uid());
create policy "auteur ou admin supprime" on public.comments for delete using (author_id = auth.uid() or is_admin());

create policy "membres lisent" on public.attachments for select using (is_member());
create policy "membres déposent" on public.attachments for insert with check (is_member() and uploaded_by = auth.uid());
create policy "auteur ou admin supprime" on public.attachments for delete using (uploaded_by = auth.uid() or is_admin());

-- Historique et activité : lecture seule (écrits uniquement par les triggers)
create policy "membres lisent" on public.status_history for select using (is_member());
create policy "membres lisent" on public.activities     for select using (is_member());

-- ═══════════════════════════ Temps réel ═════════════════════════════════
alter publication supabase_realtime add table
  public.profiles, public.prospects, public.projects, public.revisions, public.tasks,
  public.comments, public.attachments, public.status_history, public.activities;

-- ═══════════════════════════ Stockage des fichiers ══════════════════════
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 20971520)
on conflict (id) do nothing;

create policy "membres lisent les fichiers" on storage.objects for select
  using (bucket_id = 'attachments' and public.is_member());
create policy "membres déposent des fichiers" on storage.objects for insert
  with check (bucket_id = 'attachments' and public.is_member());
create policy "auteur ou admin supprime les fichiers" on storage.objects for delete
  using (bucket_id = 'attachments' and (owner = auth.uid() or public.is_admin()));
