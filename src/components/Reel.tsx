"use client";

import { useMemo, useState, useTransition } from "react";
import type { Movie } from "@/lib/supabase";
import { removeMovie, setRating } from "@/app/actions";
import {
  PERSON_A,
  PERSON_B,
  POSTER,
  SCALE,
  axisPercent,
  formatRating,
  formatWatched,
} from "@/lib/people";

type SortKey = "recent" | "gap" | "best";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "gap", label: "Biggest disagreement" },
  { key: "best", label: "Highest rated" },
];

function gapOf(m: Movie): number | null {
  if (m.rating_a === null || m.rating_b === null) return null;
  return Math.abs(m.rating_a - m.rating_b);
}

function meanOf(m: Movie): number | null {
  const scores = [m.rating_a, m.rating_b].filter(
    (v): v is number => v !== null,
  );
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export default function Reel({ movies }: { movies: Movie[] }) {
  const [sort, setSort] = useState<SortKey>("recent");

  const ordered = useMemo(() => {
    const list = [...movies];
    if (sort === "gap") {
      return list.sort((x, y) => (gapOf(y) ?? -1) - (gapOf(x) ?? -1));
    }
    if (sort === "best") {
      return list.sort((x, y) => (meanOf(y) ?? -1) - (meanOf(x) ?? -1));
    }
    return list.sort((x, y) => y.watched_on.localeCompare(x.watched_on));
  }, [movies, sort]);

  return (
    <>
      <div className="axis-head">
        <div className="axis-key">
          <span>
            <i style={{ background: "var(--amber)" }} aria-hidden="true" />
            {PERSON_A}
          </span>
          <span>
            <i style={{ background: "var(--teal)" }} aria-hidden="true" />
            {PERSON_B}
          </span>
        </div>
        <div className="axis-ruler" aria-hidden="true">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div className="sorter" role="group" aria-label="Sort films">
        {SORTS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={sort === option.key}
            onClick={() => setSort(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ul className="reel">
        {ordered.map((movie) => (
          <FilmRow key={movie.id} movie={movie} />
        ))}
      </ul>
    </>
  );
}

function FilmRow({ movie }: { movie: Movie }) {
  const [pending, startTransition] = useTransition();
  const poster = POSTER(movie.poster_path, "w185");

  const a = movie.rating_a;
  const b = movie.rating_b;
  const both = a !== null && b !== null;
  const stacked = both && Math.abs(a - b) < 0.5;

  const spanLeft = both ? axisPercent(Math.min(a, b)) : 0;
  const spanWidth = both ? axisPercent(Math.abs(a - b)) : 0;

  const update = (who: "a" | "b", raw: string) => {
    const value = raw === "" ? null : Number(raw);
    startTransition(async () => {
      const result = await setRating(movie.id, who, value);
      if (!result.ok) alert(result.message);
    });
  };

  const remove = () => {
    if (!confirm(`Remove ${movie.title} from the list?`)) return;
    startTransition(async () => {
      const result = await removeMovie(movie.id);
      if (!result.ok) alert(result.message);
    });
  };

  return (
    <li className="film" style={{ opacity: pending ? 0.55 : 1 }}>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="film-poster"
          src={poster}
          alt=""
          loading="lazy"
          width={54}
          height={81}
        />
      ) : (
        <span className="film-poster film-poster--blank" aria-hidden="true">
          no art
        </span>
      )}

      <div className="film-meta">
        <h3 className="film-title">
          {movie.title}
          {movie.year ? <span className="film-year">{movie.year}</span> : null}
        </h3>
        <div className="film-sub">
          <span>{formatWatched(movie.watched_on)}</span>
          {movie.note ? <span className="film-note">{movie.note}</span> : null}
        </div>
      </div>

      <div className="film-track">
        <div className="gauge">
          <div className="gauge-rail">
            {both && spanWidth > 0 ? (
              <span
                className="gauge-span"
                data-flip={b < a ? "true" : "false"}
                style={{ left: `${spanLeft}%`, width: `${spanWidth}%` }}
                aria-hidden="true"
              />
            ) : null}
            {a !== null ? (
              <span
                className="gauge-pin"
                data-owner="a"
                data-stacked={stacked ? "true" : "false"}
                style={{ left: `${axisPercent(a)}%` }}
                aria-hidden="true"
              />
            ) : null}
            {b !== null ? (
              <span
                className="gauge-pin"
                data-owner="b"
                data-stacked={stacked ? "true" : "false"}
                style={{ left: `${axisPercent(b)}%` }}
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div className="gauge-readout">
            <RatingPicker
              owner="a"
              person={PERSON_A}
              title={movie.title}
              value={a}
              onPick={(raw) => update("a", raw)}
            />
            <RatingPicker
              owner="b"
              person={PERSON_B}
              title={movie.title}
              value={b}
              onPick={(raw) => update("b", raw)}
            />
          </div>
        </div>
      </div>

      <button
        className="film-remove"
        type="button"
        onClick={remove}
        aria-label={`Remove ${movie.title}`}
      >
        ✕
      </button>
    </li>
  );
}

function RatingPicker({
  owner,
  person,
  title,
  value,
  onPick,
}: {
  owner: "a" | "b";
  person: string;
  title: string;
  value: number | null;
  onPick: (raw: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{`${person}'s rating for ${title}`}</span>
      <select
        className="rating-pick"
        data-owner={owner}
        data-empty={value === null ? "true" : "false"}
        value={value === null ? "" : String(value)}
        onChange={(event) => onPick(event.target.value)}
      >
        <option value="">—</option>
        {SCALE.map((score) => (
          <option key={score} value={score}>
            {formatRating(score)}
          </option>
        ))}
      </select>
    </label>
  );
}
