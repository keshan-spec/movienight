"use client";

import { useEffect, useState, useTransition } from "react";
import { addMovie } from "@/app/actions";
import type { TmdbHit } from "@/lib/tmdb";
import { POSTER } from "@/lib/people";
import Dialog from "./Dialog";
import { DateField, NoteField, PickerField, RatingFields } from "./FormFields";
import { useToast } from "./Toast";

type Mode = "watched" | "watchlist";

const KNOWN_LABEL: Record<Mode, string> = {
  watched: "Already logged",
  watchlist: "On the watchlist",
};

export default function AddMovie({ known = {} }: { known?: Record<number, Mode> }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("watched");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TmdbHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<TmdbHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const notify = useToast();

  // Press "n" anywhere (outside a text field) to add a film.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      const title = String(formData.get("title") ?? "");
      const where = mode === "watched" ? "the log" : "the watchlist";
      const result = await addMovie(formData);
      if (result.ok) {
        close();
        notify(`Added ${title} to ${where}`);
      } else setError(result.message);
    });
  };

  const pickedPoster = picked ? POSTER(picked.poster_path, "w185") : null;
  const pickedKnown = picked?.tmdb_id ? known[picked.tmdb_id] : undefined;

  return (
    <>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => setOpen(true)}
        title="Add a film (N)"
      >
        <span aria-hidden="true" className="btn-plus">+</span>
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
                  const already = known[hit.tmdb_id];
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
                        {already ? (
                          <span className="result-known" data-status={already}>
                            {KNOWN_LABEL[already]}
                          </span>
                        ) : null}
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

            {pickedKnown ? (
              <p className="hint notice" data-tone="warn">
                Heads up: this one is {pickedKnown === "watched" ? "already in your log" : "already on your watchlist"}.
                You can still add it again, for a rewatch.
              </p>
            ) : null}

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
