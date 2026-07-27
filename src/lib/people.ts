export const PERSON_A = process.env.NEXT_PUBLIC_PERSON_A || "Me";
export const PERSON_B = process.env.NEXT_PUBLIC_PERSON_B || "My friend";

export const PEOPLE = [
  { key: "a" as const, name: PERSON_A, colour: "var(--amber)" },
  { key: "b" as const, name: PERSON_B, colour: "var(--teal)" },
];

export const POSTER = (path: string | null, size: "w92" | "w185" | "w342" = "w185") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/** 0.5 → 10 in half steps. */
export const SCALE: number[] = Array.from({ length: 20 }, (_, i) => (i + 1) / 2);

export function formatRating(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatWatched(iso: string | null): string {
  if (!iso) return "Not watched yet";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function formatHours(minutes: number): string {
  return `${Math.round(minutes / 60)}h`;
}

/** Position on the 0–10 axis as a percentage. */
export function axisPercent(value: number): number {
  return (value / 10) * 100;
}

export function personName(key: string | null): string | null {
  if (key === "a") return PERSON_A;
  if (key === "b") return PERSON_B;
  return null;
}
