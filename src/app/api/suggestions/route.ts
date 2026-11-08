import { NextResponse } from "next/server";
import { db, type Movie } from "@/lib/supabase";
import { hasSession } from "@/lib/auth";
import { buildSuggestions } from "@/lib/suggest";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Signed out." }, { status: 401 });
  }

  const { data, error } = await db.from("movies").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    return NextResponse.json(await buildSuggestions((data ?? []) as Movie[]));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't build suggestions.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
