"use client";

import { useState, useTransition } from "react";
import { removeMovie, updateMovie } from "@/app/actions";
import type { Movie } from "@/lib/supabase";
import { POSTER } from "@/lib/people";
import Dialog from "./Dialog";
import { DateField, NoteField, PickerField, RatingFields } from "./FormFields";

export default function EditMovie({ movie }: { movie: Movie }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  const poster = POSTER(movie.poster_path, "w185");

  const save = (formData: FormData) => {
    setError(null);
    startBusy(async () => {
      const result = await updateMovie(formData);
      if (result.ok) setOpen(false);
      else setError(result.message);
    });
  };

  const remove = () => {
    if (!confirm(`Remove ${movie.title}? This can't be undone.`)) return;
    startBusy(async () => {
      const result = await removeMovie(movie.id);
      if (result.ok) setOpen(false);
      else setError(result.message);
    });
  };

  return (
    <>
      <button
        className="film-edit"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${movie.title}`}
        title="Edit"
      >
        Edit
      </button>

      <Dialog open={open} title="Edit film" onClose={() => setOpen(false)}>
        <form action={save}>
          <div className="picked">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" width={44} height={66} />
            ) : null}
            <span>
              <span className="picked-title">{movie.title}</span>
              {movie.year ? <span className="film-year">{movie.year}</span> : null}
            </span>
          </div>

          <input type="hidden" name="id" value={movie.id} />

          <label className="field">
            <span className="field-label">Title</span>
            <input className="input" name="title" defaultValue={movie.title} required />
          </label>

          <PickerField value={movie.picked_by} />

          {movie.status === "watched" ? (
            <>
              <DateField value={movie.watched_on} />
              <RatingFields ratingA={movie.rating_a} ratingB={movie.rating_b} />
            </>
          ) : (
            <input type="hidden" name="watched_on" value="" />
          )}

          <NoteField value={movie.note} />

          {error ? (
            <p className="hint" data-tone="error">
              {error}
            </p>
          ) : null}

          <div className="sheet-foot">
            <button className="btn btn-danger" type="button" onClick={remove} disabled={busy}>
              Delete
            </button>
            <span style={{ flex: 1 }} />
            <button className="btn" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
