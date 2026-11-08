import { NextResponse, type NextRequest } from "next/server";
import { fetchDetails } from "@/lib/tmdb";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Bad film id." }, { status: 400 });
  }

  try {
    const details = await fetchDetails(tmdbId);
    if (!details) return NextResponse.json({ error: "Not on TMDB." }, { status: 404 });
    return NextResponse.json({ details });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TMDB request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
