"use server";

import { revalidatePath } from "next/cache";
import { db, type Movie } from "@/lib/supabase";
import { hasSession } from "@/lib/auth";
import { fetchRuntime } from "@/lib/tmdb";

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

function cleanPicker(raw: FormDataEntryValue | null): "a" | "b" | null {
  const value = String(raw ?? "").trim();
  return value === "a" || value === "b" ? value : null;
}

function cleanText(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value || null;
}

export async function addMovie(formData: FormData): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, message: "A title is required." };

  const status = formData.get("status") === "watchlist" ? "watchlist" : "watched";
  const tmdbRaw = String(formData.get("tmdb_id") ?? "").trim();
  const tmdbId = tmdbRaw ? Number(tmdbRaw) : null;
  const watched = String(formData.get("watched_on") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();

  const { error } = await db.from("movies").insert({
    title,
    year: yearRaw ? Number(yearRaw) : null,
    tmdb_id: tmdbId,
    poster_path: cleanText(formData.get("poster_path")),
    runtime: tmdbId ? await fetchRuntime(tmdbId) : null,
    status,
    picked_by: cleanPicker(formData.get("picked_by")),
    watched_on:
      status === "watchlist" ? null : watched || new Date().toISOString().slice(0, 10),
    rating_a: status === "watchlist" ? null : cleanRating(formData.get("rating_a")),
    rating_b: status === "watchlist" ? null : cleanRating(formData.get("rating_b")),
    note: cleanText(formData.get("note")),
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function updateMovie(formData: FormData): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing film id." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, message: "A title is required." };

  const watched = String(formData.get("watched_on") ?? "").trim();

  const { error } = await db
    .from("movies")
    .update({
      title,
      watched_on: watched || null,
      picked_by: cleanPicker(formData.get("picked_by")),
      rating_a: cleanRating(formData.get("rating_a")),
      rating_b: cleanRating(formData.get("rating_b")),
      note: cleanText(formData.get("note")),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function setRating(
  id: string,
  who: "a" | "b",
  value: number | null
): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  if (value !== null && (value < 0 || value > 10)) {
    return { ok: false, message: "Ratings run from 0 to 10." };
  }

  const column = who === "a" ? "rating_a" : "rating_b";
  const { error } = await db.from("movies").update({ [column]: value }).eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}

/** Move a watchlist entry into the watched log, with a date and any ratings. */
export async function markWatched(formData: FormData): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing film id." };

  const watched = String(formData.get("watched_on") ?? "").trim();

  const { error } = await db
    .from("movies")
    .update({
      status: "watched",
      watched_on: watched || new Date().toISOString().slice(0, 10),
      rating_a: cleanRating(formData.get("rating_a")),
      rating_b: cleanRating(formData.get("rating_b")),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  return { ok: true };
}

/** Put a just-deleted film back exactly as it was (powers "Undo"). */
export async function restoreMovie(movie: Movie): Promise<ActionResult> {
  if (!(await hasSession())) return EXPIRED;
  if (!movie?.id || !movie.title) return { ok: false, message: "Nothing to restore." };

  const { error } = await db.from("movies").insert({
    id: movie.id,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    poster_path: movie.poster_path,
    runtime: movie.runtime,
    status: movie.status === "watchlist" ? "watchlist" : "watched",
    picked_by: movie.picked_by === "a" || movie.picked_by === "b" ? movie.picked_by : null,
    watched_on: movie.watched_on,
    rating_a: movie.rating_a,
    rating_b: movie.rating_b,
    note: movie.note,
    created_at: movie.created_at,
  });

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
