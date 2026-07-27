import "server-only";

export type TmdbHit = {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
};

const BASE = "https://api.themoviedb.org/3";

function headers() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
}

export async function searchMovies(query: string): Promise<TmdbHit[]> {
  const auth = headers();
  if (!auth) throw new Error("TMDB_ACCESS_TOKEN is not set.");

  const url = new URL(`${BASE}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-GB");

  const response = await fetch(url, { headers: auth, next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Couldn't reach TMDB.");

  const data = (await response.json()) as {
    results?: Array<{
      id: number;
      title: string;
      release_date?: string;
      poster_path: string | null;
    }>;
  };

  return (data.results ?? []).slice(0, 12).map((item) => ({
    tmdb_id: item.id,
    title: item.title,
    year: item.release_date ? Number(item.release_date.slice(0, 4)) || null : null,
    poster_path: item.poster_path,
  }));
}

/** Runtime isn't in search results, so fetch it once when a film is saved. */
export async function fetchRuntime(tmdbId: number): Promise<number | null> {
  const auth = headers();
  if (!auth || !tmdbId) return null;

  try {
    const response = await fetch(`${BASE}/movie/${tmdbId}`, {
      headers: auth,
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { runtime?: number | null };
    return data.runtime && data.runtime > 0 ? data.runtime : null;
  } catch {
    return null;
  }
}
