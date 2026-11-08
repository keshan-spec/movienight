import { db, type Movie } from "@/lib/supabase";
import { hasSession } from "@/lib/auth";
import { PERSON_A, PERSON_B, personName } from "@/lib/people";
import { stinkScore } from "@/lib/stink";

export const dynamic = "force-dynamic";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await hasSession())) return new Response("Signed out.", { status: 401 });

  const { data, error } = await db
    .from("movies")
    .select("*")
    .order("status", { ascending: true })
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  const header = [
    "Title",
    "Year",
    "Status",
    "Watched on",
    `${PERSON_A} rating`,
    `${PERSON_B} rating`,
    "Stink score",
    "Picked by",
    "Runtime (min)",
    "Note",
    "TMDB id",
  ];

  const rows = ((data ?? []) as Movie[]).map((m) =>
    [
      m.title,
      m.year,
      m.status,
      m.watched_on,
      m.rating_a,
      m.rating_b,
      stinkScore(m.rating_a, m.rating_b),
      personName(m.picked_by),
      m.runtime,
      m.note,
      m.tmdb_id,
    ]
      .map(cell)
      .join(",")
  );

  const csv = [header.map(cell).join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movie-nights-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
