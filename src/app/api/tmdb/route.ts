import { NextResponse, type NextRequest } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  try {
    return NextResponse.json({ results: await searchMovies(query) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TMDB request failed.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
