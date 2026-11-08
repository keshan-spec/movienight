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

export type Provider = { name: string; logo_path: string | null };

export type TmdbDetails = {
  tmdb_id: number;
  title: string;
  year: number | null;
  tagline: string | null;
  overview: string | null;
  genres: string[];
  runtime: number | null;
  vote: number | null;
  director: string | null;
  cast: string[];
  trailer: string | null;
  backdrop_path: string | null;
  poster_path: string | null;
  imdb_id: string | null;
  providers: {
    region: string;
    link: string | null;
    stream: Provider[];
    rent: Provider[];
    buy: Provider[];
  } | null;
};

type RawProvider = { provider_name: string; logo_path: string | null };

/** Everything the details sheet shows, in one request. */
export async function fetchDetails(tmdbId: number): Promise<TmdbDetails | null> {
  const auth = headers();
  if (!auth) throw new Error("TMDB_ACCESS_TOKEN is not set.");
  if (!tmdbId) return null;

  const region = (process.env.TMDB_REGION || "GB").toUpperCase();
  const url = new URL(`${BASE}/movie/${tmdbId}`);
  url.searchParams.set("language", "en-GB");
  url.searchParams.set("append_to_response", "credits,videos,watch/providers");

  const response = await fetch(url, { headers: auth, next: { revalidate: 60 * 60 * 12 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Couldn't reach TMDB.");

  const data = (await response.json()) as {
    id: number;
    title: string;
    release_date?: string;
    tagline?: string;
    overview?: string;
    genres?: { name: string }[];
    runtime?: number | null;
    vote_average?: number;
    vote_count?: number;
    backdrop_path: string | null;
    poster_path: string | null;
    imdb_id?: string | null;
    credits?: {
      cast?: { name: string; order: number }[];
      crew?: { name: string; job: string }[];
    };
    videos?: { results?: { key: string; site: string; type: string; official?: boolean }[] };
    "watch/providers"?: {
      results?: Record<
        string,
        { link?: string; flatrate?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] }
      >;
    };
  };

  const videos = (data.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const trailer =
    videos.find((v) => v.type === "Trailer" && v.official) ??
    videos.find((v) => v.type === "Trailer") ??
    videos.find((v) => v.type === "Teaser");

  const local = data["watch/providers"]?.results?.[region];
  const mapProviders = (list?: RawProvider[]) =>
    (list ?? []).slice(0, 6).map((p) => ({ name: p.provider_name, logo_path: p.logo_path }));

  return {
    tmdb_id: data.id,
    title: data.title,
    year: data.release_date ? Number(data.release_date.slice(0, 4)) || null : null,
    tagline: data.tagline || null,
    overview: data.overview || null,
    genres: (data.genres ?? []).map((g) => g.name),
    runtime: data.runtime && data.runtime > 0 ? data.runtime : null,
    vote: data.vote_count && data.vote_count > 20 ? data.vote_average ?? null : null,
    director: data.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
    cast: (data.credits?.cast ?? [])
      .sort((a, b) => a.order - b.order)
      .slice(0, 6)
      .map((c) => c.name),
    trailer: trailer?.key ?? null,
    backdrop_path: data.backdrop_path,
    poster_path: data.poster_path,
    imdb_id: data.imdb_id || null,
    providers: local
      ? {
          region,
          link: local.link ?? null,
          stream: mapProviders(local.flatrate),
          rent: mapProviders(local.rent),
          buy: mapProviders(local.buy),
        }
      : null,
  };
}
