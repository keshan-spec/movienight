-- Run this in the Supabase SQL editor.

create table if not exists public.movies (
  id           uuid primary key default gen_random_uuid(),
  tmdb_id      integer,
  title        text not null,
  year         integer,
  poster_path  text,
  watched_on   date not null default current_date,
  rating_a     numeric(3,1) check (rating_a >= 0 and rating_a <= 10),
  rating_b     numeric(3,1) check (rating_b >= 0 and rating_b <= 10),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists movies_watched_on_idx
  on public.movies (watched_on desc, created_at desc);

-- RLS is on with no policies, so the anon and authenticated keys can read
-- nothing. Every query in this app runs server-side with the service role
-- key, which bypasses RLS. Never expose that key to the browser.
alter table public.movies enable row level security;
