-- Run once in Supabase SQL Editor to enable the requested shared, no-login library.
-- Existing account selections are copied; their original rows are left untouched.
begin;
create table if not exists public.folio_shared_selections (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ? 'word' and jsonb_typeof(payload->'word') = 'string'
    and length(payload->>'word') between 1 and 12000
    and payload ? 'meaning' and jsonb_typeof(payload->'meaning') = 'string'
    and octet_length(payload::text) <= 200000
  ),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
do $$
begin
  if to_regclass('public.folio_selections') is not null then
    insert into public.folio_shared_selections (id, payload, created_at, deleted_at)
    select distinct on (id) id, payload, created_at, deleted_at
    from public.folio_selections
    order by id, (deleted_at is null) desc, created_at desc, user_id
    on conflict (id) do nothing;
  end if;
end $$;
alter table public.folio_shared_selections enable row level security;
revoke all on public.folio_shared_selections from anon, authenticated;
grant select, insert on public.folio_shared_selections to anon, authenticated;
grant update (deleted_at) on public.folio_shared_selections to anon, authenticated;
drop policy if exists "Read shared selections" on public.folio_shared_selections;
create policy "Read shared selections" on public.folio_shared_selections for select to anon, authenticated using (true);
drop policy if exists "Save shared selections" on public.folio_shared_selections;
create policy "Save shared selections" on public.folio_shared_selections for insert to anon, authenticated with check (true);
drop policy if exists "Archive shared selections" on public.folio_shared_selections;
create policy "Archive shared selections" on public.folio_shared_selections for update to anon, authenticated using (true) with check (true);
commit;
