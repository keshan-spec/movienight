import { NextResponse, type NextRequest } from "next/server";

export type TmdbHit = {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TMDB_ACCESS_TOKEN is not set." },
      { status: 500 }
    );
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-GB");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Couldn't reach TMDB. Check the access token." },
      { status: 502 }
    );
  }

  const data = (await response.json()) as {
    results?: Array<{
      id: number;
      title: string;
      release_date?: string;
      poster_path: string | null;
      popularity: number;
    }>;
  };

  const results: TmdbHit[] = (data.results ?? [])
    .slice(0, 12)
    .map((item) => ({
      tmdb_id: item.id,
      title: item.title,
      year: item.release_date ? Number(item.release_date.slice(0, 4)) || null : null,
      poster_path: item.poster_path,
    }));

  return NextResponse.json({ results });
}
