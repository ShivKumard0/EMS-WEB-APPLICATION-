-- ══ EMS PHONE ↔ WEB SYNC: ONE-TIME SUPABASE SETUP (14 Nov 2026) ══════════════════════════════════════════════════
-- Supabase → your project → SQL Editor → New query → paste all of this → Run. Safe to run again.
-- Creates: 3 tables, their access rules, and the 'ems-files' store for receipts. Nothing else in the project changes.

-- 1 · What the web app publishes for the phone: claims, advances, people, lists, wallet balances.
create table if not exists public.ems_records (
  id         text primary key,                 -- 'exp:24', 'adv:50006', 'wallets:E-1031', 'meta:lists' ...
  kind       text not null,
  data       jsonb not null,
  updated_at timestamptz not null default clock_timestamp()
);

-- 2 · What the phone asks the web app to do (submit, approve, withdraw ...) and the web app's answer.
create table if not exists public.ems_commands (
  id         text primary key,                 -- made on the phone, so a retry never files anything twice
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  by_uid     text not null default '',
  status     text not null default 'new' check (status in ('new','working','done','failed')),
  result     jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

-- 3 · One row written every day by the GitHub job (.github/workflows/ems-keep-awake.yml), so the free project is not
--     paused for inactivity.
create table if not exists public.ems_heartbeat (
  id   int primary key,
  note text,
  at   timestamptz not null default clock_timestamp()
);

create index if not exists ems_records_updated_at on public.ems_records (updated_at);
create index if not exists ems_commands_status    on public.ems_commands (status, created_at);

-- The database stamps every change, so both apps can ask "what changed since ...".
create or replace function public.ems_touch() returns trigger language plpgsql as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
create or replace function public.ems_beat() returns trigger language plpgsql as $$
begin new.at := clock_timestamp(); return new; end $$;
drop trigger if exists ems_records_touch on public.ems_records;
create trigger ems_records_touch before insert or update on public.ems_records for each row execute function public.ems_touch();
drop trigger if exists ems_commands_touch on public.ems_commands;
create trigger ems_commands_touch before insert or update on public.ems_commands for each row execute function public.ems_touch();
drop trigger if exists ems_heartbeat_beat on public.ems_heartbeat;
create trigger ems_heartbeat_beat before insert or update on public.ems_heartbeat for each row execute function public.ems_beat();

-- Access with the Publishable key (the apps' only key): read, add and update. Nothing can be deleted with it.
alter table public.ems_records   enable row level security;
alter table public.ems_commands  enable row level security;
alter table public.ems_heartbeat enable row level security;
grant select, insert, update on public.ems_records, public.ems_commands, public.ems_heartbeat to anon;

drop policy if exists "ems records read"   on public.ems_records;
drop policy if exists "ems records add"    on public.ems_records;
drop policy if exists "ems records change" on public.ems_records;
create policy "ems records read"   on public.ems_records for select to anon using (true);
create policy "ems records add"    on public.ems_records for insert to anon with check (true);
create policy "ems records change" on public.ems_records for update to anon using (true) with check (true);

drop policy if exists "ems commands read"   on public.ems_commands;
drop policy if exists "ems commands add"    on public.ems_commands;
drop policy if exists "ems commands change" on public.ems_commands;
create policy "ems commands read"   on public.ems_commands for select to anon using (true);
create policy "ems commands add"    on public.ems_commands for insert to anon with check (true);
create policy "ems commands change" on public.ems_commands for update to anon using (true) with check (true);

drop policy if exists "ems heartbeat read"   on public.ems_heartbeat;
drop policy if exists "ems heartbeat add"    on public.ems_heartbeat;
drop policy if exists "ems heartbeat change" on public.ems_heartbeat;
create policy "ems heartbeat read"   on public.ems_heartbeat for select to anon using (true);
create policy "ems heartbeat add"    on public.ems_heartbeat for insert to anon with check (true);
create policy "ems heartbeat change" on public.ems_heartbeat for update to anon using (true) with check (true);

-- 4 · Receipts and documents from the phone (opened from the web app's line items). Images and PDFs, up to 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ems-files', 'ems-files', true, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;
drop policy if exists "ems files upload" on storage.objects;
create policy "ems files upload" on storage.objects for insert to anon with check (bucket_id = 'ems-files');

select 'EMS sync is set up' as result;
