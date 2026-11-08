-- Adds genres, for the genre filter and suggestions. Safe to run more than once.
-- Existing films get their genres filled in from TMDB automatically next time you load the app.

alter table public.movies add column if not exists genres text[];
