export const PERSON_A = process.env.NEXT_PUBLIC_PERSON_A || "Me";
export const PERSON_B = process.env.NEXT_PUBLIC_PERSON_B || "My friend";

export const POSTER = (path: string | null, size: "w92" | "w185" | "w342" = "w185") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/** 0.5 → 10 in half steps. */
export const SCALE: number[] = Array.from({ length: 20 }, (_, i) => (i + 1) / 2);

export function formatRating(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatWatched(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Position on the 0–10 axis as a percentage. */
export function axisPercent(value: number): number {
  return (value / 10) * 100;
}
