"use client";

import { useEffect, useState, useTransition } from "react";
import { addMovie } from "@/app/actions";
import type { TmdbHit } from "@/lib/tmdb";
import { POSTER } from "@/lib/people";
import Dialog from "./Dialog";
import { DateField, NoteField, PickerField, RatingFields } from "./FormFields";

type Mode = "watched" | "watchlist";

export default function AddMovie() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("watched");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TmdbHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<TmdbHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!open || picked) return;
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/tmdb?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setHits(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setHits([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, picked, open]);

  const reset = () => {
    setQuery("");
    setHits([]);
    setPicked(null);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
    setMode("watched");
  };

  const save = (formData: FormData) => {
    setError(null);
    startSaving(async () => {
      const result = await addMovie(formData);
      if (result.ok) close();
      else setError(result.message);
    });
  };

  const pickedPoster = picked ? POSTER(picked.poster_path, "w185") : null;

  return (
    <>
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
        Add a film
      </button>

      <Dialog open={open} title="Add a film" onClose={close}>
        {!picked ? (
          <>
            <label className="field">
              <span className="field-label">Search</span>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Start typing a title"
                autoFocus
              />
            </label>

            {hits.length > 0 ? (
              <ul className="results">
                {hits.map((hit) => {
                  const thumb = POSTER(hit.poster_path, "w92");
                  return (
                    <li key={hit.tmdb_id}>
                      <button className="result" type="button" onClick={() => setPicked(hit)}>
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" width={34} height={51} />
                        ) : (
                          <span aria-hidden="true" style={{ width: 34, height: 51 }} />
                        )}
                        <span>
                          <span className="result-title">{hit.title}</span>{" "}
                          <span className="result-year">{hit.year ?? ""}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {searching ? <p className="hint">Searching TMDB…</p> : null}

            {!searching && query.trim().length >= 2 && hits.length === 0 ? (
              <p className="hint">
                Nothing on TMDB matches that.{" "}
                <button
                  className="btn btn-quiet"
                  type="button"
                  onClick={() =>
                    setPicked({ tmdb_id: 0, title: query.trim(), year: null, poster_path: null })
                  }
                >
                  Add &ldquo;{query.trim()}&rdquo; anyway
                </button>
              </p>
            ) : null}
          </>
        ) : (
          <form action={save}>
            <div className="picked">
              {pickedPoster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pickedPoster} alt="" width={44} height={66} />
              ) : null}
              <span>
                <span className="picked-title">{picked.title}</span>
                {picked.year ? <span className="film-year">{picked.year}</span> : null}
              </span>
              <button
                className="btn btn-quiet"
                type="button"
                onClick={reset}
                style={{ marginLeft: "auto" }}
              >
                Change
              </button>
            </div>

            <div className="segmented" role="group" aria-label="Where does this go?">
              <button
                type="button"
                aria-pressed={mode === "watched"}
                onClick={() => setMode("watched")}
              >
                We watched it
              </button>
              <button
                type="button"
                aria-pressed={mode === "watchlist"}
                onClick={() => setMode("watchlist")}
              >
                Save for later
              </button>
            </div>

            <input type="hidden" name="status" value={mode} />
            <input type="hidden" name="title" value={picked.title} />
            <input type="hidden" name="year" value={picked.year ?? ""} />
            <input type="hidden" name="tmdb_id" value={picked.tmdb_id || ""} />
            <input type="hidden" name="poster_path" value={picked.poster_path ?? ""} />

            <PickerField />

            {mode === "watched" ? (
              <>
                <DateField />
                <RatingFields />
              </>
            ) : null}

            <NoteField />

            {error ? (
              <p className="hint" data-tone="error">
                {error}
              </p>
            ) : null}

            <div className="sheet-foot">
              <button className="btn" type="button" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : mode === "watched" ? "Add to the log" : "Add to watchlist"}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
