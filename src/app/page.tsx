import { db, type Movie } from "@/lib/supabase";
import { PERSON_A, PERSON_B, formatRating } from "@/lib/people";
import AddMovie from "@/components/AddMovie";
import Reel from "@/components/Reel";

export const dynamic = "force-dynamic";

function average(values: (number | null)[]): number | null {
  const scored = values.filter((v): v is number => v !== null);
  if (!scored.length) return null;
  return Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10;
}

export default async function HomePage() {
  const { data, error } = await db
    .from("movies")
    .select("*")
    .order("watched_on", { ascending: false })
    .order("created_at", { ascending: false });

  const movies = (data ?? []) as Movie[];

  const avgA = average(movies.map((m) => m.rating_a));
  const avgB = average(movies.map((m) => m.rating_b));
  const gaps = movies
    .filter((m) => m.rating_a !== null && m.rating_b !== null)
    .map((m) => Math.abs((m.rating_a as number) - (m.rating_b as number)));
  const widest = gaps.length ? Math.max(...gaps) : null;

  return (
    <main className="shell">
      <header className="masthead">
        <h1 className="wordmark">
          Movie
          <em>nights</em>
        </h1>
        <div className="masthead-actions">
          <AddMovie />
        </div>
      </header>

      {error ? (
        <p className="hint" data-tone="error">
          Couldn&rsquo;t load the list: {error.message}
        </p>
      ) : null}

      {movies.length > 0 ? (
        <ul className="tally">
          <li className="tally-item">
            <span className="tally-value">{movies.length}</span>
            <span className="tally-label">Films watched</span>
          </li>
          <li className="tally-item">
            <span className="tally-value" data-owner="a">
              {avgA === null ? "—" : formatRating(avgA)}
            </span>
            <span className="tally-label">{PERSON_A} averages</span>
          </li>
          <li className="tally-item">
            <span className="tally-value" data-owner="b">
              {avgB === null ? "—" : formatRating(avgB)}
            </span>
            <span className="tally-label">{PERSON_B} averages</span>
          </li>
          <li className="tally-item">
            <span className="tally-value">
              {widest === null ? "—" : formatRating(widest)}
            </span>
            <span className="tally-label">Widest split</span>
          </li>
        </ul>
      ) : null}

      {movies.length === 0 && !error ? (
        <div className="blank-slate">
          <p>Nothing here yet. Add the first film you watched together.</p>
        </div>
      ) : (
        <Reel movies={movies} />
      )}
    </main>
  );
}
