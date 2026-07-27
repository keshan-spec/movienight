import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local and fill it in."
  );
}

export const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Movie = {
  id: string;
  tmdb_id: number | null;
  title: string;
  year: number | null;
  poster_path: string | null;
  runtime: number | null;
  status: "watched" | "watchlist";
  picked_by: "a" | "b" | null;
  watched_on: string | null;
  rating_a: number | null;
  rating_b: number | null;
  note: string | null;
  created_at: string;
};
