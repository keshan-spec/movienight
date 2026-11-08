"use client";

import { useState, useTransition } from "react";
import { markWatched } from "@/app/actions";
import type { Movie } from "@/lib/supabase";
import Dialog from "./Dialog";
import { DateField, RatingFields } from "./FormFields";
import { useToast } from "./Toast";

export default function MarkWatched({
  movie,
  label = "We watched it",
  className = "btn",
  onDone,
}: {
  movie: Movie;
  label?: string;
  className?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const notify = useToast();

  const save = (formData: FormData) => {
    setError(null);
    startBusy(async () => {
      const result = await markWatched(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      notify(`${movie.title} moved to the log`);
      onDone?.();
    });
  };

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>

      <Dialog open={open} title={`How was ${movie.title}?`} onClose={() => setOpen(false)}>
        <form action={save}>
          <input type="hidden" name="id" value={movie.id} />
          <DateField />
          <RatingFields />
          <p className="hint form-tip">
            Not sure yet? Leave the scores blank and rate it from the list later.
          </p>

          {error ? (
            <p className="hint" data-tone="error">
              {error}
            </p>
          ) : null}

          <div className="sheet-foot">
            <button className="btn" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Add to the log"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
