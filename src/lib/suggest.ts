import "server-only";
import { db, type Movie } from "./supabase";
import { fetchMeta, genreNames, recommendationsFor, trending, type TmdbListItem } from "./tmdb";
import { stinkScore } from "./stink";

/** Before migration-003, rows come back without a genres key at all. */
export function genresColumnExists(movies: Movie[]): boolean | null {
  if (!movies.length) return null;
  return movies.some((m) => m.genres !== undefined);
}

/**
 * Fill in genres for films saved before genres were tracked. A few per page
 * load (TMDB responses are cached), so a big backlog clears over a couple of visits.
 */
export async function backfillGenres(movies: Movie[], limit = 24): Promise<void> {
  const todo = movies.filter((m) => m.tmdb_id && m.genres === null).slice(0, limit);
  if (!todo.length) return;

  await Promise.all(
    todo.map(async (m) => {
      const meta = await fetchMeta(m.tmdb_id as number);
      if (!meta) return;
      const patch: Partial<Movie> = { genres: meta.genres };
      if (!m.runtime && meta.runtime) patch.runtime = meta.runtime;
      const { error } = await db.from("movies").update(patch).eq("id", m.id);
      if (!error) Object.assign(m, patch);
    })
  );
}

export type Suggestion = {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  vote: number | null;
  genres: string[];
  because: string[];
};

export type SuggestionResult = {
  suggestions: Suggestion[];
  basis: "ratings" | "trending";
  favouriteGenres: string[];
};

/**
 * Recommendations from the films you rated highest, minus anything you've
 * already logged or saved. Films you both disliked push their lookalikes down,
 * and genres you tend to score well get a small boost.
 */
export async function buildSuggestions(movies: Movie[]): Promise<SuggestionResult> {
  const known = new Set(movies.map((m) => m.tmdb_id).filter(Boolean) as number[]);

  const rated = movies
    .filter((m) => m.status === "watched" && m.tmdb_id)
    .map((m) => ({ movie: m, score: stinkScore(m.rating_a, m.rating_b) }))
    .filter((r): r is { movie: Movie; score: number } => r.score !== null)
    .sort((x, y) => y.score - x.score || y.movie.created_at.localeCompare(x.movie.created_at));

  const liked = rated.filter((r) => r.score >= 6.5).slice(0, 10);
  const disliked = rated.filter((r) => r.score < 4.5).slice(-5);

  // Genre affinity: how far above or below your overall average each genre lands.
  const overall = rated.length ? rated.reduce((t, r) => t + r.score, 0) / rated.length : 0;
  const byGenre = new Map<string, { total: number; n: number }>();
  for (const { movie, score } of rated) {
    for (const g of movie.genres ?? []) {
      const entry = byGenre.get(g) ?? { total: 0, n: 0 };
      entry.total += score;
      entry.n += 1;
      byGenre.set(g, entry);
    }
  }
  const affinity = new Map<string, number>();
  for (const [g, { total, n }] of byGenre) {
    // Shrink small samples toward zero so one great film doesn't dominate.
    affinity.set(g, ((total / n - overall) * n) / (n + 2));
  }
  const favouriteGenres = [...affinity.entries()]
    .filter(([g, v]) => v > 0 && (byGenre.get(g)?.n ?? 0) >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const names = await genreNames();

  const pool = new Map<number, { item: TmdbListItem; weight: number; because: string[] }>();
  const add = (item: TmdbListItem, weight: number, because?: string) => {
    if (known.has(item.id) || !item.poster_path) return;
    const entry = pool.get(item.id) ?? { item, weight: 0, because: [] };
    entry.weight += weight;
    if (because && weight > 0 && !entry.because.includes(because)) entry.because.push(because);
    pool.set(item.id, entry);
  };

  let basis: SuggestionResult["basis"] = "ratings";

  if (liked.length) {
    const seeds = await Promise.all(
      liked.map(async (r) => ({ ...r, recs: await recommendationsFor(r.movie.tmdb_id as number) }))
    );
    for (const seed of seeds) {
      const weight = Math.max(0.5, seed.score - 5);
      seed.recs.forEach((item, rank) => add(item, weight * (1 - rank / 40), seed.movie.title));
    }

    const bad = await Promise.all(
      disliked.map((r) => recommendationsFor(r.movie.tmdb_id as number))
    );
    for (const recs of bad) for (const item of recs) if (pool.has(item.id)) add(item, -1.5);
  } else {
    basis = "trending";
    for (const item of await trending()) add(item, 1);
  }

  const scored = [...pool.values()]
    .filter((e) => e.weight > 0 && (e.item.vote_count ?? 0) >= 40)
    .map((e) => {
      const genres = (e.item.genre_ids ?? []).map((id) => names.get(id)).filter(Boolean) as string[];
      const genreBoost = genres.reduce((t, g) => t + (affinity.get(g) ?? 0), 0) * 0.6;
      const quality = ((e.item.vote_average ?? 6) - 6.5) * 0.5;
      return { ...e, genres, rank: e.weight + genreBoost + quality };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 30);

  return {
    basis,
    favouriteGenres,
    suggestions: scored.map(({ item, genres, because }) => ({
      tmdb_id: item.id,
      title: item.title,
      year: item.release_date ? Number(item.release_date.slice(0, 4)) || null : null,
      poster_path: item.poster_path,
      overview: item.overview || null,
      vote: (item.vote_count ?? 0) > 20 ? item.vote_average ?? null : null,
      genres,
      because: because.slice(0, 3),
    })),
  };
}
