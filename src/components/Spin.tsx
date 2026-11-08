"use client";

import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/lib/supabase";
import { PEOPLE, POSTER, formatRuntime, personName } from "@/lib/people";
import Dialog from "./Dialog";
import MarkWatched from "./MarkWatched";

type Pool = "all" | "a" | "b";

function inPool(queued: Movie[], pool: Pool): Movie[] {
  return pool === "all" ? queued : queued.filter((m) => m.picked_by === pool);
}

/** Picks something from the watchlist, slot-machine style. */
export default function Spin({ queued, turn }: { queued: Movie[]; turn: "a" | "b" | null }) {
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState<Pool>("all");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const candidates = inPool(queued, pool);
  const current = candidates.find((m) => m.id === chosenId) ?? null;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const spin = (list: Movie[]) => {
    if (timer.current) clearTimeout(timer.current);
    if (!list.length) {
      setChosenId(null);
      setSpinning(false);
      return;
    }

    const final = list[Math.floor(Math.random() * list.length)].id;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || list.length === 1) {
      setChosenId(final);
      setSpinning(false);
      return;
    }

    // Tick through the posters, slowing down, then land on the chosen one.
    const steps = 14 + Math.floor(Math.random() * 6);
    let step = 0;
    let at = Math.floor(Math.random() * list.length);
    setSpinning(true);

    const tick = () => {
      step += 1;
      if (step >= steps) {
        setChosenId(final);
        setSpinning(false);
        return;
      }
      at = (at + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
      setChosenId(list[at].id);
      timer.current = setTimeout(tick, 50 + step * step * 1.6);
    };
    tick();
  };

  const begin = () => {
    // Start with whoever's turn it is, if they've suggested anything.
    const start: Pool = turn && queued.some((m) => m.picked_by === turn) ? turn : "all";
    setPool(start);
    setChosenId(null);
    setOpen(true);
    timer.current = setTimeout(() => spin(inPool(queued, start)), 150);
  };

  const choosePool = (next: Pool) => {
    setPool(next);
    spin(inPool(queued, next));
  };

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setSpinning(false);
    setOpen(false);
  };

  const poster = current ? POSTER(current.poster_path, "w342") : null;
  const runtime = current ? formatRuntime(current.runtime) : null;
  const suggester = current ? personName(current.picked_by) : null;
  const details = [runtime, suggester ? `${suggester}'s suggestion` : null].filter(Boolean);

  return (
    <>
      <button
        className="btn btn-spin"
        type="button"
        onClick={begin}
        disabled={queued.length === 0}
        title={queued.length ? "Pick something at random" : "Add films to the watchlist first"}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
        </svg>
        Pick for us
      </button>

      <Dialog open={open} title="Tonight's film" onClose={close}>
        <div className="segmented spin-pool" role="group" aria-label="Choose from">
          <button type="button" aria-pressed={pool === "all"} onClick={() => choosePool("all")}>
            Anything
          </button>
          {PEOPLE.map((person) => (
            <button
              key={person.key}
              type="button"
              aria-pressed={pool === person.key}
              onClick={() => choosePool(person.key)}
              disabled={!queued.some((m) => m.picked_by === person.key)}
            >
              {person.name}&rsquo;s ideas
            </button>
          ))}
        </div>

        {turn ? (
          <p className="hint spin-turn">
            It&rsquo;s <strong data-owner={turn}>{personName(turn)}</strong>&rsquo;s turn to pick.
          </p>
        ) : null}

        <div className="spin-stage" data-spinning={spinning ? "true" : "false"}>
          {current ? (
            <>
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={current.id} src={poster} alt="" className="spin-poster" />
              ) : (
                <span className="spin-poster spin-poster--blank">{current.title}</span>
              )}
              <div className="spin-info">
                <p className="spin-title">
                  {current.title}
                  {current.year ? <span className="film-year">{current.year}</span> : null}
                </p>
                {!spinning && details.length ? <p className="hint">{details.join(" · ")}</p> : null}
                {!spinning && current.note ? <p className="film-note">{current.note}</p> : null}
              </div>
            </>
          ) : (
            <p className="hint">{candidates.length ? "Shuffling…" : "Nothing to pick from here."}</p>
          )}
        </div>

        <div className="sheet-foot">
          <button
            className="btn"
            type="button"
            onClick={() => spin(candidates)}
            disabled={spinning || !candidates.length}
          >
            Spin again
          </button>
          {current && !spinning ? (
            <MarkWatched movie={current} className="btn btn-primary" onDone={close} />
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
