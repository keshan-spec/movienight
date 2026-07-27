"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { hasSession } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; message: string };

const EXPIRED: ActionResult = {
  ok: false,
  message: "You're signed out. Reload the page to sign in again.",
};

function cleanRating(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0 || n > 10) return null;
  return n;
}

export async function addMovie(formData: FormData): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, message: "A title is required." };

  const yearRaw = String(formData.get("year") ?? "").trim();
  const tmdbRaw = String(formData.get("tmdb_id") ?? "").trim();
  const watched = String(formData.get("watched_on") ?? "").trim();

  const { error } = await db.from("movies").insert({
    title,
    year: yearRaw ? Number(yearRaw) : null,
    tmdb_id: tmdbRaw ? Number(tmdbRaw) : null,
    poster_path: String(formData.get("poster_path") ?? "").trim() || null,
    watched_on: watched || new Date().toISOString().slice(0, 10),
    rating_a: cleanRating(formData.get("rating_a")),
    rating_b: cleanRating(formData.get("rating_b")),
    note: String(formData.get("note") ?? "").trim() || null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function setRating(
  id: string,
  who: "a" | "b",
  value: number | null,
): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  if (value !== null && (value < 0 || value > 10)) {
    return { ok: false, message: "Ratings run from 0 to 10." };
  }

  const column = who === "a" ? "rating_a" : "rating_b";
  const { error } = await db
    .from("movies")
    .update({ [column]: value })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function removeMovie(id: string): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  const { error } = await db.from("movies").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}
