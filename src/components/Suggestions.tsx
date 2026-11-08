"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { addMovie } from "@/app/actions";
import type { Suggestion, SuggestionResult } from "@/lib/suggest";
import { PEOPLE, POSTER } from "@/lib/people";
import FilmDetails from "./FilmDetails";
import { useToast } from "./Toast";

const HIDDEN_KEY = "mn-hidden-suggestions";

// Kept between tab switches so the list doesn't reshuffle every time.
let cached: SuggestionResult | null = null;

function loadHidden(): Set<number> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveHidden(ids: Set<number>) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids].slice(-300)));
  } catch {}
}

export default function Suggestions({
  known,
  genre,
  onGenres,
}: {
  /** tmdb ids already in your log or watchlist. */
  known: Set<number>;
  genre: string;
  /** Tells the parent which genres the suggestions cover, for the filter. */
  onGenres: (genres: string[]) => void;
}) {
  const [result, setResult] = useState<SuggestionResult | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [suggester, setSuggester] = useState<"" | "a" | "b">("");

  useEffect(() => setHidden(loadHidden()), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/suggestions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't load suggestions.");
      cached = data as SuggestionResult;
      setResult(cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load suggestions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cached) load();
  }, [load]);

  const visible = useMemo(
    () =>
      (result?.suggestions ?? []).filter(
        (s) => !known.has(s.tmdb_id) && !hidden.has(s.tmdb_id)
      ),
    [result, known, hidden]
  );

  useEffect(() => {
    const set = new Set(visible.flatMap((s) => s.genres));
    onGenres([...set].sort());
  }, [visible, onGenres]);

  const shown = genre === "all" ? visible : visible.filter((s) => s.genres.includes(genre));

  const hide = (id: number) => {
    const next = new Set(hidden);
    next.add(id);
    setHidden(next);
    saveHidden(next);
  };

  const unhideAll = () => {
    const next = new Set<number>();
    setHidden(next);
    saveHidden(next);
  };

  if (loading && !result) {
    return (
      <div className="suggest">
        <p className="suggest-intro">Looking at what you&rsquo;ve loved…</p>
        <ul className="grid">
          {Array.from({ length: 8 }, (_, i) => (
            <li className="card" key={i}>
              <div className="card-art skeleton" />
              <div className="skeleton-lines">
                <i />
                <i />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blank-slate">
        <p>{error}</p>
        <button className="btn" type="button" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const basis = result?.basis;
  const favourites = result?.favouriteGenres ?? [];

  return (
    <div className="suggest">
      <div className="suggest-head">
        <p className="suggest-intro">
          {basis === "trending"
            ? "Rate a few films you’ve watched and these will tailor themselves to you. For now, here’s what’s popular this week."
            : "Picked from the films you both rated highest. Ones like your flops are pushed down."}
          {favourites.length ? (
            <>
              {" "}
              You score{" "}
              {favourites.map((g, i) => (
                <span key={g}>
                  {i ? (i === favourites.length - 1 ? " and " : ", ") : ""}
                  <strong>{g}</strong>
                </span>
              ))}{" "}
              best.
            </>
          ) : null}
        </p>
        <div className="suggest-tools">
          <label className="chip-select">
            <span className="chip-label">Add as</span>
            <select
              value={suggester}
              onChange={(event) => setSuggester(event.target.value as "" | "a" | "b")}
            >
              <option value="">Nobody&rsquo;s idea</option>
              {PEOPLE.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}&rsquo;s idea
                </option>
              ))}
            </select>
            <span className="chip-caret" aria-hidden="true">
              ▾
            </span>
          </label>
          <button className="btn btn-small" type="button" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="blank-slate">
          <p>
            {genre !== "all"
              ? `No ${genre} suggestions right now.`
              : "You’ve worked through every suggestion. Rate more films for fresh ones."}
          </p>
          {hidden.size ? (
            <button className="btn" type="button" onClick={unhideAll}>
              Show {hidden.size} hidden
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="grid">
          {shown.map((s) => (
            <SuggestionCard
              key={s.tmdb_id}
              suggestion={s}
              suggester={suggester}
              onHide={() => hide(s.tmdb_id)}
            />
          ))}
        </ul>
      )}

      {hidden.size && shown.length ? (
        <p className="hint suggest-foot">
          {hidden.size} hidden ·{" "}
          <button className="btn btn-quiet btn-small" type="button" onClick={unhideAll}>
            Show them again
          </button>
        </p>
      ) : null}
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  suggester,
  onHide,
}: {
  suggestion: Suggestion;
  suggester: "" | "a" | "b";
  onHide: () => void;
}) {
  const [busy, startBusy] = useTransition();
  const [added, setAdded] = useState(false);
  const notify = useToast();
  const poster = POSTER(s.poster_path, "w342");

  const save = () => {
    const form = new FormData();
    form.set("status", "watchlist");
    form.set("title", s.title);
    form.set("year", s.year ? String(s.year) : "");
    form.set("tmdb_id", String(s.tmdb_id));
    form.set("poster_path", s.poster_path ?? "");
    form.set("picked_by", suggester);
    startBusy(async () => {
      const result = await addMovie(form);
      if (result.ok) {
        setAdded(true);
        notify(`Added ${s.title} to the watchlist`);
      } else notify(result.message, { tone: "error" });
    });
  };

  const addButton = (
    <button
      className="btn btn-primary btn-small"
      type="button"
      onClick={save}
      disabled={busy || added}
    >
      {added ? "Added ✓" : busy ? "Adding…" : "+ Watchlist"}
    </button>
  );

  return (
    <li className="card suggest-card">
      <div className="card-art">
        <FilmDetails film={s} className="card-art-btn" footer={addButton}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="card-poster" src={poster} alt="" loading="lazy" />
          ) : (
            <span className="card-poster card-poster--blank">{s.title}</span>
          )}
        </FilmDetails>
        {s.vote !== null ? <span className="card-vote">★ {s.vote.toFixed(1)}</span> : null}
        <button
          className="card-hide"
          type="button"
          onClick={onHide}
          aria-label={`Not interested in ${s.title}`}
          title="Not interested"
        >
          ×
        </button>
      </div>
      <div className="card-body">
        <p className="card-title" title={s.title}>
          {s.title}
          {s.year ? <span className="film-year">{s.year}</span> : null}
        </p>
        {s.because.length ? (
          <p className="suggest-because" title={`Because you liked ${s.because.join(", ")}`}>
            Because you liked <strong>{s.because[0]}</strong>
            {s.because.length > 1 ? ` +${s.because.length - 1}` : ""}
          </p>
        ) : s.genres.length ? (
          <p className="suggest-because">{s.genres.slice(0, 2).join(" · ")}</p>
        ) : null}
        <div className="card-actions">{addButton}</div>
      </div>
    </li>
  );
}
