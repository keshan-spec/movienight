-- Run this in the Supabase SQL editor if you already have a movies table.
-- Safe to run more than once.

alter table public.movies
  add column if not exists status text not null default 'watched',
  add column if not exists picked_by text,
  add column if not exists runtime integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'movies_status_check') then
    alter table public.movies
      add constraint movies_status_check check (status in ('watched', 'watchlist'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'movies_picked_by_check') then
    alter table public.movies
      add constraint movies_picked_by_check check (picked_by in ('a', 'b'));
  end if;
end $$;

-- Watchlist entries have no date yet.
alter table public.movies alter column watched_on drop not null;

create index if not exists movies_status_idx on public.movies (status);
