# Movie nights

A private log of the films you and your friend watch together, with a rating from
each of you. Next.js 15 (App Router) + Supabase + TMDB, deployed on Netlify.

## How it fits together

- **Ratings** live in one `movies` row as `rating_a` / `rating_b`, so a film can
  have one rating, both, or neither. Names come from env vars, so you can rename
  yourselves without touching the schema.
- **TMDB** is called from `/api/tmdb`, server-side only. The access token never
  reaches the browser.
- **Supabase** is queried with the service role key inside server components and
  server actions. RLS is on with no policies, so the public keys can read nothing
  even if someone finds the project URL.
- **Access** is a shared password. `middleware.ts` checks a cookie against
  `SESSION_TOKEN`; the sign-in action checks the typed password against
  `APP_PASSWORD` and sets that cookie. Every server action re-checks the cookie,
  so a direct POST can't skip the gate.

## Setup

### 1. Supabase

Create a free project, open the SQL editor, and run `supabase/schema.sql`.
Then from **Project Settings → API** copy the project URL and the
`service_role` key.

### 2. TMDB

Create a free account at themoviedb.org, then **Settings → API** and request a
key. Copy the **API Read Access Token** (the long v4 bearer token, not the short
v3 key).

### 3. Local

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Generate `SESSION_TOKEN` with `openssl rand -hex 32`. It just needs to be long
and random — it's the value stored in your cookie.

## Deploy to Netlify

Push to GitHub, then in Netlify: **Add new site → Import an existing project**.
Netlify detects Next.js and installs `@netlify/plugin-nextjs` automatically.

Add all the variables from `.env.example` under **Site configuration →
Environment variables**, then deploy. The free tier covers this comfortably.

GitHub Pages won't work here — it only serves static files, and this app needs
server-side rendering for the API route, server actions, and the password
middleware.

## Notes

- Ratings run 0.5–10 in half steps. Change `SCALE` in `src/lib/people.ts` if you
  want a different scale; the `check` constraint in the schema allows 0–10.
- Editing a rating saves immediately — click the number on any row.
- Click a poster for the synopsis, cast, trailer and where to stream it.
  Streaming info is for the UK by default; set `TMDB_REGION` (e.g. `US`) to change it.
- **Pick for us** on the watchlist spins for a random film, starting with the
  suggestions of whoever's turn it is (picks alternate, based on the last
  watched film's "whose pick").
- **Genres**: run `supabase/migration-003.sql` once to enable the genre filter.
  Films you already have get their genres from TMDB automatically on the next
  few page loads.
- **For you** suggests films from TMDB's recommendations for the films you both
  rated highest, skipping anything you've logged or saved. Lookalikes of your
  flops are pushed down, and genres you score well get a boost. Click × to hide one
  (remembered per browser), or **+ Watchlist** to save it.
- Shortcuts: `N` adds a film, `/` jumps to search.
- Deleting a film shows an **Undo** toast for a few seconds.
- To back up, use **Export CSV** in the header, Supabase's table editor export, or
  `select * from movies order by watched_on` in the SQL editor.
