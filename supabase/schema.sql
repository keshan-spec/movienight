-- Fresh install: run this in the Supabase SQL editor.
-- Already have a movies table? Run migration-002.sql and migration-003.sql instead.

create table if not exists public.movies (
  id           uuid primary key default gen_random_uuid(),
  tmdb_id      integer,
  title        text not null,
  year         integer,
  poster_path  text,
  runtime      integer,
  genres       text[],
  status       text not null default 'watched' check (status in ('watched', 'watchlist')),
  picked_by    text check (picked_by in ('a', 'b')),
  watched_on   date default current_date,
  rating_a     numeric(3,1) check (rating_a >= 0 and rating_a <= 10),
  rating_b     numeric(3,1) check (rating_b >= 0 and rating_b <= 10),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists movies_watched_on_idx
  on public.movies (watched_on desc, created_at desc);

create index if not exists movies_status_idx on public.movies (status);

-- RLS is on with no policies, so the publishable key can read nothing.
-- Every query in this app runs server-side with a secret key (sb_secret_...),
-- which bypasses RLS. Never expose that key to the browser.
alter table public.movies enable row level security;
