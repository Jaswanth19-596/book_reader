-- Run once in your Supabase project's SQL Editor.
begin;
create table if not exists public.folio_selections (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ? 'word' and jsonb_typeof(payload->'word') = 'string'
    and length(payload->>'word') between 1 and 12000
    and payload ? 'meaning' and jsonb_typeof(payload->'meaning') = 'string'
    and octet_length(payload::text) <= 200000
  ),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);
alter table public.folio_selections enable row level security;
revoke all on public.folio_selections from anon, authenticated;
grant select, insert on public.folio_selections to authenticated;
-- Only archive/restore is allowed; saved content cannot be overwritten or deleted by the app.
grant update (deleted_at) on public.folio_selections to authenticated;
drop policy if exists "Read own selections" on public.folio_selections;
create policy "Read own selections" on public.folio_selections for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own selections" on public.folio_selections;
create policy "Insert own selections" on public.folio_selections for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Archive own selections" on public.folio_selections;
create policy "Archive own selections" on public.folio_selections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
