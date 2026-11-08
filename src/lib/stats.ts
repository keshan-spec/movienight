import type { Movie } from "./supabase";
import { PEOPLE } from "./people";
import { stinkScore } from "./stink";

export function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function average(values: (number | null)[]): number | null {
  const scored = values.filter((v): v is number => v !== null);
  return scored.length ? round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
}

export function combined(m: Movie): number | null {
  return stinkScore(m.rating_a, m.rating_b);
}

export function gapOf(m: Movie): number | null {
  if (m.rating_a === null || m.rating_b === null) return null;
  return Math.abs(m.rating_a - m.rating_b);
}

/** Newest first: by watch date, then by when it was logged. */
export function byRecent(x: Movie, y: Movie): number {
  return (
    (y.watched_on ?? "").localeCompare(x.watched_on ?? "") ||
    y.created_at.localeCompare(x.created_at)
  );
}

/** Picks alternate, so it's the other person's turn after the last recorded pick. */
export function nextPicker(watched: Movie[]): "a" | "b" | null {
  const last = [...watched].sort(byRecent).find((m) => m.picked_by);
  if (!last) return null;
  return last.picked_by === "a" ? "b" : "a";
}

export type Summary = ReturnType<typeof summarise>;

export function summarise(watched: Movie[]) {
  const avgA = average(watched.map((m) => m.rating_a));
  const avgB = average(watched.map((m) => m.rating_b));

  const both = watched.filter((m) => m.rating_a !== null && m.rating_b !== null);
  const gaps = both.map((m) => gapOf(m) as number);
  const widest = gaps.length ? Math.max(...gaps) : null;
  const inSync = gaps.length
    ? Math.round((gaps.filter((g) => g <= 1).length / gaps.length) * 100)
    : null;
  const lean = both.length
    ? round(
        both.reduce((t, m) => t + ((m.rating_a as number) - (m.rating_b as number)), 0) /
          both.length
      )
    : null;

  const minutes = watched.reduce((total, m) => total + (m.runtime ?? 0), 0);
  const overall = average(watched.map(combined));

  const pickScores = PEOPLE.map((person) => {
    const theirs = watched.filter((m) => m.picked_by === person.key);
    const score = average(theirs.map(combined));
    return { ...person, count: theirs.length, score };
  });
  const bestPicker = pickScores
    .filter((p) => p.score !== null && p.count > 1)
    .sort((x, y) => (y.score as number) - (x.score as number))[0];

  const scored = watched
    .map((m) => ({ movie: m, score: combined(m) }))
    .filter((r): r is { movie: Movie; score: number } => r.score !== null)
    .sort((x, y) => y.score - x.score);

  const top = scored.slice(0, 3);
  const bottom = scored.length > 3 ? scored.slice(-3).reverse() : [];

  const fight = [...both].sort((x, y) => (gapOf(y) as number) - (gapOf(x) as number))[0] ?? null;

  // Ten buckets: [0,1), [1,2) … [9,10].
  const histogram = PEOPLE.map((person) => {
    const buckets = Array.from({ length: 10 }, () => 0);
    for (const m of watched) {
      const v = person.key === "a" ? m.rating_a : m.rating_b;
      if (v === null) continue;
      buckets[Math.min(9, Math.floor(v))] += 1;
    }
    return { ...person, buckets };
  });

  // Films per month, last 12 months including this one.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      count: 0,
    };
  });
  for (const m of watched) {
    const key = m.watched_on?.slice(0, 7);
    const slot = months.find((x) => x.key === key);
    if (slot) slot.count += 1;
  }

  const unrated = watched.filter((m) => m.rating_a === null || m.rating_b === null).length;

  return {
    count: watched.length,
    avgA,
    avgB,
    widest,
    inSync,
    lean,
    minutes,
    overall,
    bestPicker,
    pickScores,
    top,
    bottom,
    fight,
    histogram,
    months,
    unrated,
    bothRated: both.length,
  };
}
