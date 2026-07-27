"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addMovie } from "@/app/actions";
import type { TmdbHit } from "@/app/api/tmdb/route";
import { PERSON_A, PERSON_B, POSTER, SCALE, formatRating } from "@/lib/people";

const today = () => new Date().toISOString().slice(0, 10);

export default function AddMovie() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TmdbHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<TmdbHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (picked) return;
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
      } catch (err) {
        if (!controller.signal.aborted) setHits([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, picked]);

  const reset = () => {
    setQuery("");
    setHits([]);
    setPicked(null);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
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

      <dialog className="sheet" ref={dialogRef} onClose={close}>
        <div className="sheet-head">
          <h2>Add a film</h2>
          <button className="btn btn-quiet" type="button" onClick={close}>
            Close
          </button>
        </div>

        <div className="sheet-body">
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
                        <button
                          className="result"
                          type="button"
                          onClick={() => setPicked(hit)}
                        >
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
                      setPicked({
                        tmdb_id: 0,
                        title: query.trim(),
                        year: null,
                        poster_path: null,
                      })
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

              <input type="hidden" name="title" value={picked.title} />
              <input type="hidden" name="year" value={picked.year ?? ""} />
              <input type="hidden" name="tmdb_id" value={picked.tmdb_id || ""} />
              <input type="hidden" name="poster_path" value={picked.poster_path ?? ""} />

              <label className="field">
                <span className="field-label">Watched on</span>
                <input className="input" type="date" name="watched_on" defaultValue={today()} />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">{PERSON_A}</span>
                  <select className="select" name="rating_a" defaultValue="">
                    <option value="">Not yet</option>
                    {SCALE.map((score) => (
                      <option key={score} value={score}>
                        {formatRating(score)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">{PERSON_B}</span>
                  <select className="select" name="rating_b" defaultValue="">
                    <option value="">Not yet</option>
                    {SCALE.map((score) => (
                      <option key={score} value={score}>
                        {formatRating(score)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span className="field-label">Note</span>
                <input
                  className="input"
                  name="note"
                  placeholder="One line you'll want to remember"
                  maxLength={120}
                />
              </label>

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
                  {saving ? "Saving…" : "Add to the list"}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
