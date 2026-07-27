import { db, type Movie } from "@/lib/supabase";
import { PEOPLE, formatHours, formatRating } from "@/lib/people";
import { stinkScore, stinkTier } from "@/lib/stink";
import AddMovie from "@/components/AddMovie";
import Reel from "@/components/Reel";
import StinkBadge from "@/components/StinkBadge";

export const dynamic = "force-dynamic";

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function average(values: (number | null)[]): number | null {
  const scored = values.filter((v): v is number => v !== null);
  return scored.length
    ? round(scored.reduce((a, b) => a + b, 0) / scored.length)
    : null;
}

function combined(m: Movie): number | null {
  return stinkScore(m.rating_a, m.rating_b);
}

export default async function HomePage() {
  const { data, error } = await db
    .from("movies")
    .select("*")
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const movies = (data ?? []) as Movie[];
  const watched = movies.filter((m) => m.status === "watched");

  const avgA = average(watched.map((m) => m.rating_a));
  const avgB = average(watched.map((m) => m.rating_b));

  const gaps = watched
    .filter((m) => m.rating_a !== null && m.rating_b !== null)
    .map((m) => Math.abs((m.rating_a as number) - (m.rating_b as number)));
  const widest = gaps.length ? Math.max(...gaps) : null;

  const minutes = watched.reduce((total, m) => total + (m.runtime ?? 0), 0);

  const allScores = watched
    .map(combined)
    .filter((v): v is number => v !== null);
  const overall = allScores.length
    ? round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;

  // Whose picks land better, judged on the average of both your scores.
  const pickScores = PEOPLE.map((person) => {
    const theirs = watched
      .filter((m) => m.picked_by === person.key)
      .map(combined)
      .filter((v): v is number => v !== null);
    return {
      ...person,
      count: theirs.length,
      score: theirs.length
        ? round(theirs.reduce((a, b) => a + b, 0) / theirs.length)
        : null,
    };
  });
  const bestPicker = pickScores
    .filter((p) => p.score !== null)
    .sort((x, y) => (y.score as number) - (x.score as number))[0];

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

      {watched.length > 0 ? (
        <ul className="tally">
          {overall !== null ? (
            <li className="tally-item tally-headline">
              <StinkBadge score={overall} size="lg" />
              <span className="tally-label">
                Stink meter · {stinkTier(overall).blurb}
              </span>
            </li>
          ) : null}
          <li className="tally-item">
            <span className="tally-value">{watched.length}</span>
            <span className="tally-label">Films watched</span>
          </li>
          {minutes > 0 ? (
            <li className="tally-item">
              <span className="tally-value">{formatHours(minutes)}</span>
              <span className="tally-label">Time together</span>
            </li>
          ) : null}
          <li className="tally-item">
            <span className="tally-value" data-owner="a">
              {avgA === null ? "—" : formatRating(avgA)}
            </span>
            <span className="tally-label">{PEOPLE[0].name} averages</span>
          </li>
          <li className="tally-item">
            <span className="tally-value" data-owner="b">
              {avgB === null ? "—" : formatRating(avgB)}
            </span>
            <span className="tally-label">{PEOPLE[1].name} averages</span>
          </li>
          <li className="tally-item">
            <span className="tally-value">
              {widest === null ? "—" : formatRating(widest)}
            </span>
            <span className="tally-label">Widest split</span>
          </li>
          {bestPicker && bestPicker.count > 1 ? (
            <li className="tally-item">
              <span className="tally-value" data-owner={bestPicker.key}>
                {formatRating(bestPicker.score)}
              </span>
              <span className="tally-label">{bestPicker.name} picks best</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <Reel movies={movies} />
    </main>
  );
}
