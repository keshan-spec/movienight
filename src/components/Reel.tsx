"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Movie } from "@/lib/supabase";
import {
  PEOPLE,
  POSTER,
  formatRating,
  formatRuntime,
  formatWatched,
  personName,
} from "@/lib/people";
import { stinkScore } from "@/lib/stink";
import { byRecent, combined, gapOf } from "@/lib/stats";
import RatingLanes from "./RatingLanes";
import EditMovie from "./EditMovie";
import FilmDetails from "./FilmDetails";
import MarkWatched from "./MarkWatched";
import Spin from "./Spin";
import StinkBadge from "./StinkBadge";
import StinkLegend from "./StinkLegend";
import Suggestions from "./Suggestions";

type Tab = "watched" | "watchlist" | "foryou";
type View = "list" | "grid";
type Show = "all" | "a" | "b" | "unrated";
type WatchedSort = "recent" | "oldest" | "best" | "worst" | "gap" | "title";
type QueueSort = "added" | "short" | "title";

const WATCHED_SORTS: { key: WatchedSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest first" },
  { key: "best", label: "Highest rated" },
  { key: "worst", label: "Lowest rated" },
  { key: "gap", label: "Biggest disagreement" },
  { key: "title", label: "A–Z" },
];

const QUEUE_SORTS: { key: QueueSort; label: string }[] = [
  { key: "added", label: "Newest added" },
  { key: "short", label: "Shortest first" },
  { key: "title", label: "A–Z" },
];

const VIEW_KEY = "mn-view";

function byTitle(x: Movie, y: Movie): number {
  return x.title.localeCompare(y.title, "en", { sensitivity: "base" });
}

/** Unrated last whichever way you sort. */
function byScore(direction: 1 | -1) {
  return (x: Movie, y: Movie) => {
    const a = combined(x);
    const b = combined(y);
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return (b - a) * direction;
  };
}

export default function Reel({
  movies,
  turn,
  genresReady = true,
}: {
  movies: Movie[];
  turn: "a" | "b" | null;
  /** False until migration-003 adds the genres column. */
  genresReady?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("watched");
  const [view, setView] = useState<View>("list");
  const [watchedSort, setWatchedSort] = useState<WatchedSort>("recent");
  const [queueSort, setQueueSort] = useState<QueueSort>("added");
  const [show, setShow] = useState<Show>("all");
  const [year, setYear] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [suggestedGenres, setSuggestedGenres] = useState<string[]>([]);
  const onSuggestedGenres = useCallback((list: string[]) => setSuggestedGenres(list), []);
  const [term, setTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Remember list/grid per browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {}
  }, []);

  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  };

  // Press "/" to jump to search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const watched = useMemo(() => movies.filter((m) => m.status === "watched"), [movies]);
  const queued = useMemo(() => movies.filter((m) => m.status === "watchlist"), [movies]);

  const years = useMemo(() => {
    const set = new Set(watched.map((m) => m.watched_on?.slice(0, 4)).filter(Boolean) as string[]);
    return [...set].sort().reverse();
  }, [watched]);

  const known = useMemo(
    () => new Set(movies.map((m) => m.tmdb_id).filter(Boolean) as number[]),
    [movies]
  );

  const genres = useMemo(() => {
    if (tab === "foryou") return suggestedGenres;
    const source = tab === "watched" ? watched : queued;
    return [...new Set(source.flatMap((m) => m.genres ?? []))].sort();
  }, [tab, watched, queued, suggestedGenres]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setGenre("all");
    if (next !== "watched" && show === "unrated") setShow("all");
  };

  const shown = useMemo(() => {
    if (tab === "foryou") return [];
    const source = tab === "watched" ? watched : queued;
    const needle = term.trim().toLowerCase();

    const filtered = source.filter((m) => {
      if (
        needle &&
        !m.title.toLowerCase().includes(needle) &&
        !(m.note ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (genre !== "all" && !(m.genres ?? []).includes(genre)) return false;
      if (show === "a" || show === "b") {
        if (m.picked_by !== show) return false;
      }
      if (tab === "watched") {
        if (show === "unrated" && m.rating_a !== null && m.rating_b !== null) return false;
        if (year !== "all" && m.watched_on?.slice(0, 4) !== year) return false;
      }
      return true;
    });

    if (tab === "watchlist") {
      if (queueSort === "title") return filtered.sort(byTitle);
      if (queueSort === "short")
        return filtered.sort((x, y) => (x.runtime ?? 9999) - (y.runtime ?? 9999));
      return filtered.sort((x, y) => y.created_at.localeCompare(x.created_at));
    }

    switch (watchedSort) {
      case "oldest":
        return filtered.sort((x, y) => byRecent(y, x));
      case "best":
        return filtered.sort(byScore(1));
      case "worst":
        return filtered.sort(byScore(-1));
      case "gap":
        return filtered.sort((x, y) => (gapOf(y) ?? -1) - (gapOf(x) ?? -1));
      case "title":
        return filtered.sort(byTitle);
      default:
        return filtered.sort(byRecent);
    }
  }, [tab, watched, queued, term, show, year, genre, watchedSort, queueSort]);

  const total = tab === "watched" ? watched.length : queued.length;
  const filtering =
    tab !== "foryou" &&
    (term.trim() !== "" || show !== "all" || genre !== "all" || (tab === "watched" && year !== "all"));

  const clearFilters = () => {
    setTerm("");
    setShow("all");
    setYear("all");
    setGenre("all");
  };

  const genreChip =
    genres.length > 0 ? (
      <ChipSelect
        label="Genre"
        value={genre}
        active={genre !== "all"}
        onChange={setGenre}
        options={[{ value: "all", label: "Any genre" }, ...genres.map((g) => ({ value: g, label: g }))]}
      />
    ) : null;

  return (
    <section className="reel-wrap">
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="List">
          <button
            type="button"
            aria-pressed={tab === "watched"}
            onClick={() => switchTab("watched")}
          >
            Watched <span className="count">{watched.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === "watchlist"}
            onClick={() => switchTab("watchlist")}
          >
            Watchlist <span className="count">{queued.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === "foryou"}
            onClick={() => switchTab("foryou")}
          >
            <span aria-hidden="true" className="sparkle">✦</span> For you
          </button>
        </div>

        <div className="toolbar-right" hidden={tab === "foryou"}>
          <label className="search-wrap">
            <span className="sr-only">Search films</span>
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              className="input search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search titles and notes"
            />
            <kbd className="kbd" aria-hidden="true">
              /
            </kbd>
          </label>

          <div className="segmented view-toggle" role="group" aria-label="Layout">
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => changeView("list")}
              title="List"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="sr-only">List view</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "grid"}
              onClick={() => changeView("grid")}
              title="Posters"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
                <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
                <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
                <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
              </svg>
              <span className="sr-only">Poster view</span>
            </button>
          </div>
        </div>
      </div>

      {tab === "foryou" ? (
        <>
          <div className="subbar">
            <div className="filters">{genreChip}</div>
          </div>
          <Suggestions known={known} genre={genre} onGenres={onSuggestedGenres} />
        </>
      ) : (
      <>
      <div className="subbar">
        <div className="filters">
          {tab === "watched" ? (
            <ChipSelect
              label="Sort"
              value={watchedSort}
              onChange={(v) => setWatchedSort(v as WatchedSort)}
              options={WATCHED_SORTS.map((s) => ({ value: s.key, label: s.label }))}
            />
          ) : (
            <ChipSelect
              label="Sort"
              value={queueSort}
              onChange={(v) => setQueueSort(v as QueueSort)}
              options={QUEUE_SORTS.map((s) => ({ value: s.key, label: s.label }))}
            />
          )}

          <ChipSelect
            label="Show"
            value={show}
            active={show !== "all"}
            onChange={(v) => setShow(v as Show)}
            options={[
              { value: "all", label: "Everything" },
              ...PEOPLE.map((p) => ({
                value: p.key,
                label: tab === "watched" ? `${p.name}'s picks` : `${p.name}'s ideas`,
              })),
              ...(tab === "watched" ? [{ value: "unrated", label: "Needs a rating" }] : []),
            ]}
          />

          {genreChip}

          {tab === "watched" && years.length > 1 ? (
            <ChipSelect
              label="Year"
              value={year}
              active={year !== "all"}
              onChange={setYear}
              options={[
                { value: "all", label: "All time" },
                ...years.map((y) => ({ value: y, label: y })),
              ]}
            />
          ) : null}

          {filtering ? (
            <button className="btn btn-quiet btn-small" type="button" onClick={clearFilters}>
              Clear
            </button>
          ) : null}

          {!genresReady ? (
            <span className="hint genre-hint">
              Run <code>supabase/migration-003.sql</code> to filter by genre.
            </span>
          ) : null}
        </div>

        <div className="subbar-right">
          {tab === "watched" ? (
            <>
              {view === "list" ? (
                <div className="axis-key">
                  {PEOPLE.map((person) => (
                    <span key={person.key}>
                      <i style={{ background: person.colour }} aria-hidden="true" />
                      {person.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <StinkLegend />
            </>
          ) : (
            <Spin queued={queued} turn={turn} />
          )}
        </div>
      </div>

      {filtering && shown.length > 0 ? (
        <p className="result-count">
          Showing {shown.length} of {total}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="blank-slate">
          <div className="blank-art" aria-hidden="true">
            🎞️
          </div>
          <p>
            {filtering
              ? "Nothing matches those filters."
              : tab === "watched"
                ? "Nothing logged yet. Add the first film you watched together."
                : "Watchlist is empty. Add something you both want to see."}
          </p>
          {filtering ? (
            <button className="btn" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          ) : (
            <p className="hint">
              Press <kbd className="kbd">N</kbd> to add a film.
            </p>
          )}
        </div>
      ) : view === "grid" ? (
        <ul className="grid">
          {shown.map((movie) => (
            <PosterCard key={movie.id} movie={movie} />
          ))}
        </ul>
      ) : (
        <ul className="reel">
          {shown.map((movie) =>
            tab === "watched" ? (
              <FilmRow key={movie.id} movie={movie} />
            ) : (
              <QueuedRow key={movie.id} movie={movie} />
            )
          )}
        </ul>
      )}
      </>
      )}
    </section>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange,
  active = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  active?: boolean;
}) {
  return (
    <label className="chip-select" data-active={active ? "true" : "false"}>
      <span className="chip-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="chip-caret" aria-hidden="true">
        ▾
      </span>
    </label>
  );
}

function PosterImage({
  movie,
  size,
  className,
}: {
  movie: Movie;
  size: "w185" | "w342";
  className: string;
}) {
  const src = POSTER(movie.poster_path, size);
  if (!src) {
    return (
      <span className={`${className} ${className}--blank`} aria-hidden="true">
        <span>{movie.title}</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt="" loading="lazy" />;
}

function Poster({ movie }: { movie: Movie }) {
  return (
    <FilmDetails movie={movie} className="film-poster-btn">
      <PosterImage movie={movie} size="w185" className="film-poster" />
      {movie.tmdb_id ? (
        <span className="poster-hint" aria-hidden="true">
          Info
        </span>
      ) : null}
    </FilmDetails>
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
        {movie.status === "watched" ? <span>{formatWatched(movie.watched_on)}</span> : null}
        {runtime ? <span>{runtime}</span> : null}
        {picker ? (
          <span className="film-pick" data-owner={movie.picked_by}>
            {movie.status === "watched" ? `${picker}’s pick` : `${picker}’s idea`}
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
  return (
    <li className="film film-queued">
      <Poster movie={movie} />
      <Meta movie={movie} />
      <div className="film-track">
        <MarkWatched movie={movie} />
      </div>
      <EditMovie movie={movie} />
    </li>
  );
}

function PosterCard({ movie }: { movie: Movie }) {
  const overall = stinkScore(movie.rating_a, movie.rating_b);

  return (
    <li className="card">
      <div className="card-art">
        <FilmDetails movie={movie} className="card-art-btn">
          <PosterImage movie={movie} size="w342" className="card-poster" />
        </FilmDetails>
        {overall !== null ? (
          <span className="card-badge">
            <StinkBadge score={overall} showLabel={false} />
          </span>
        ) : null}
        <span className="card-edit">
          <EditMovie movie={movie} />
        </span>
      </div>
      <div className="card-body">
        <p className="card-title" title={movie.title}>
          {movie.title}
        </p>
        {movie.status === "watched" ? (
          <p className="card-scores">
            {PEOPLE.map((person) => {
              const v = person.key === "a" ? movie.rating_a : movie.rating_b;
              return (
                <span key={person.key} data-owner={person.key} title={person.name}>
                  <i aria-hidden="true" />
                  {formatRating(v)}
                </span>
              );
            })}
            <span className="card-year">{movie.watched_on?.slice(0, 4) ?? movie.year ?? ""}</span>
          </p>
        ) : (
          <div className="card-actions">
            <span className="card-year">
              {[movie.year, formatRuntime(movie.runtime)].filter(Boolean).join(" · ")}
            </span>
            <MarkWatched movie={movie} className="btn btn-small" label="Watched" />
          </div>
        )}
      </div>
    </li>
  );
}
