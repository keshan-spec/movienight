"use client";

import { useMemo, useState, useTransition } from "react";
import type { Movie } from "@/lib/supabase";
import { markWatched } from "@/app/actions";
import {
  PEOPLE,
  POSTER,
  formatRuntime,
  formatWatched,
  personName,
} from "@/lib/people";
import { stinkScore } from "@/lib/stink";
import RatingLanes from "./RatingLanes";
import EditMovie from "./EditMovie";
import StinkBadge from "./StinkBadge";
import StinkLegend from "./StinkLegend";

type Tab = "watched" | "watchlist";
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
  const [tab, setTab] = useState<Tab>("watched");
  const [sort, setSort] = useState<SortKey>("recent");
  const [term, setTerm] = useState("");

  const watched = useMemo(
    () => movies.filter((m) => m.status === "watched"),
    [movies],
  );
  const queued = useMemo(
    () => movies.filter((m) => m.status === "watchlist"),
    [movies],
  );

  const shown = useMemo(() => {
    const source = tab === "watched" ? watched : queued;
    const needle = term.trim().toLowerCase();
    const filtered = needle
      ? source.filter(
          (m) =>
            m.title.toLowerCase().includes(needle) ||
            (m.note ?? "").toLowerCase().includes(needle),
        )
      : [...source];

    if (tab === "watchlist") {
      return filtered.sort((x, y) => y.created_at.localeCompare(x.created_at));
    }
    if (sort === "gap")
      return filtered.sort((x, y) => (gapOf(y) ?? -1) - (gapOf(x) ?? -1));
    if (sort === "best")
      return filtered.sort((x, y) => (meanOf(y) ?? -1) - (meanOf(x) ?? -1));
    return filtered.sort((x, y) =>
      (y.watched_on ?? "").localeCompare(x.watched_on ?? ""),
    );
  }, [tab, watched, queued, term, sort]);

  return (
    <>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="List">
          <button
            type="button"
            aria-pressed={tab === "watched"}
            onClick={() => setTab("watched")}
          >
            Watched <span className="count">{watched.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === "watchlist"}
            onClick={() => setTab("watchlist")}
          >
            Watchlist <span className="count">{queued.length}</span>
          </button>
        </div>

        <input
          className="input search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search titles and notes"
          aria-label="Search films"
        />
      </div>

      {tab === "watched" ? (
        <div className="subbar">
          <div
            className="segmented segmented-quiet"
            role="group"
            aria-label="Sort films"
          >
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

          <div className="subbar-right">
            <div className="axis-key">
              {PEOPLE.map((person) => (
                <span key={person.key}>
                  <i style={{ background: person.colour }} aria-hidden="true" />
                  {person.name}
                </span>
              ))}
            </div>
            <StinkLegend />
          </div>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="blank-slate">
          <p>
            {term.trim()
              ? "Nothing matches that search."
              : tab === "watched"
                ? "Nothing logged yet. Add the first film you watched together."
                : "Watchlist is empty. Add something you both want to see."}
          </p>
        </div>
      ) : (
        <ul className="reel">
          {shown.map((movie) =>
            tab === "watched" ? (
              <FilmRow key={movie.id} movie={movie} />
            ) : (
              <QueuedRow key={movie.id} movie={movie} />
            ),
          )}
        </ul>
      )}
    </>
  );
}

function Poster({ movie }: { movie: Movie }) {
  const src = POSTER(movie.poster_path, "w185");
  if (!src) {
    return (
      <span className="film-poster film-poster--blank" aria-hidden="true">
        no art
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className="film-poster"
      src={src}
      alt=""
      loading="lazy"
      width={54}
      height={81}
    />
  );
}

function Meta({ movie }: { movie: Movie }) {
  const runtime = formatRuntime(movie.runtime);
  const picker = personName(movie.picked_by);
  const overall = stinkScore(movie.rating_a, movie.rating_b);

  return (
    <div className="film-meta">
      <h3 className="film-title">
        {movie.title}
        {movie.year ? <span className="film-year">{movie.year}</span> : null}
        {overall !== null ? <StinkBadge score={overall} /> : null}
      </h3>
      <div className="film-sub">
        {movie.status === "watched" ? (
          <span>{formatWatched(movie.watched_on)}</span>
        ) : null}
        {runtime ? <span>{runtime}</span> : null}
        {picker ? (
          <span className="film-pick" data-owner={movie.picked_by}>
            {picker}&rsquo;s pick
          </span>
        ) : null}
      </div>
      {movie.note ? <p className="film-note">{movie.note}</p> : null}
    </div>
  );
}

function FilmRow({ movie }: { movie: Movie }) {
  return (
    <li className="film">
      <Poster movie={movie} />
      <Meta movie={movie} />
      <div className="film-track">
        <RatingLanes movie={movie} />
      </div>
      <EditMovie movie={movie} />
    </li>
  );
}

function QueuedRow({ movie }: { movie: Movie }) {
  const [busy, startBusy] = useTransition();

  const promote = () => {
    startBusy(async () => {
      const result = await markWatched(movie.id);
      if (!result.ok) alert(result.message);
    });
  };

  return (
    <li className="film film-queued">
      <Poster movie={movie} />
      <Meta movie={movie} />
      <div className="film-track">
        <button className="btn" type="button" onClick={promote} disabled={busy}>
          {busy ? "Moving…" : "We watched it"}
        </button>
      </div>
      <EditMovie movie={movie} />
    </li>
  );
}
