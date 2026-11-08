import { db, type Movie } from "@/lib/supabase";
import { PEOPLE, formatHours, formatRating, personName } from "@/lib/people";
import { stinkTier } from "@/lib/stink";
import { nextPicker, summarise } from "@/lib/stats";
import { signOutAction } from "./signin/actions";
import AddMovie from "@/components/AddMovie";
import Insights from "@/components/Insights";
import Reel from "@/components/Reel";
import StinkBadge from "@/components/StinkBadge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data, error } = await db
    .from("movies")
    .select("*")
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const movies = (data ?? []) as Movie[];
  const watched = movies.filter((m) => m.status === "watched");
  const stats = summarise(watched);
  const turn = nextPicker(watched);

  // So "Add a film" can flag something you've already got.
  const known: Record<number, Movie["status"]> = {};
  for (const m of movies) {
    if (m.tmdb_id && known[m.tmdb_id] !== "watched") known[m.tmdb_id] = m.status;
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1 className="wordmark">
            Movie
            <em>nights</em>
          </h1>
          <p className="tagline">
            {PEOPLE[0].name} &amp; {PEOPLE[1].name}
            {turn ? (
              <>
                {" · "}
                <span className="turn" data-owner={turn}>
                  {personName(turn)} picks next
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="masthead-actions">
          <a className="btn btn-quiet btn-small" href="/api/export" download>
            Export CSV
          </a>
          <form action={signOutAction}>
            <button className="btn btn-quiet btn-small" type="submit">
              Sign out
            </button>
          </form>
          <AddMovie known={known} />
        </div>
      </header>

      {error ? (
        <p className="hint" data-tone="error">
          Couldn&rsquo;t load the list: {error.message}
        </p>
      ) : null}

      {watched.length > 0 ? (
        <>
          <ul className="tally">
            {stats.overall !== null ? (
              <li className="tally-item tally-headline">
                <StinkBadge score={stats.overall} size="lg" />
                <span className="tally-label">
                  Stink meter · {stinkTier(stats.overall).blurb}
                </span>
              </li>
            ) : null}
            <li className="tally-item">
              <span className="tally-value">{stats.count}</span>
              <span className="tally-label">Films watched</span>
            </li>
            {stats.minutes > 0 ? (
              <li className="tally-item">
                <span className="tally-value">{formatHours(stats.minutes)}</span>
                <span className="tally-label">Time together</span>
              </li>
            ) : null}
            <li className="tally-item">
              <span className="tally-value" data-owner="a">
                {formatRating(stats.avgA)}
              </span>
              <span className="tally-label">{PEOPLE[0].name} averages</span>
            </li>
            <li className="tally-item">
              <span className="tally-value" data-owner="b">
                {formatRating(stats.avgB)}
              </span>
              <span className="tally-label">{PEOPLE[1].name} averages</span>
            </li>
            <li className="tally-item">
              <span className="tally-value">{formatRating(stats.widest)}</span>
              <span className="tally-label">Widest split</span>
            </li>
            {stats.bestPicker ? (
              <li className="tally-item">
                <span className="tally-value" data-owner={stats.bestPicker.key}>
                  {formatRating(stats.bestPicker.score)}
                </span>
                <span className="tally-label">{stats.bestPicker.name} picks best</span>
              </li>
            ) : null}
          </ul>

          <Insights stats={stats} />
        </>
      ) : null}

      <Reel movies={movies} turn={turn} />

      <footer className="foot">
        <span>
          <kbd className="kbd">N</kbd> add a film
        </span>
        <span>
          <kbd className="kbd">/</kbd> search
        </span>
        <span>Film data from TMDB</span>
      </footer>
    </main>
  );
}
