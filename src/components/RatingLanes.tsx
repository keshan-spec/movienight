"use client";

import { Fragment, useOptimistic, useTransition } from "react";
import { setRating } from "@/app/actions";
import type { Movie } from "@/lib/supabase";
import { PEOPLE, SCALE, axisPercent, formatRating } from "@/lib/people";
import { useToast } from "./Toast";

export default function RatingLanes({ movie }: { movie: Movie }) {
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const [ratings, setOptimistic] = useOptimistic(
    { a: movie.rating_a, b: movie.rating_b },
    (state, change: { who: "a" | "b"; value: number | null }) => ({
      ...state,
      [change.who]: change.value,
    })
  );

  const a = ratings.a;
  const b = ratings.b;
  const both = a !== null && b !== null;
  const gap = both ? Math.abs(a - b) : 0;

  const update = (who: "a" | "b", raw: string) => {
    const value = raw === "" ? null : Number(raw);
    startTransition(async () => {
      setOptimistic({ who, value });
      const result = await setRating(movie.id, who, value);
      if (!result.ok) notify(result.message, { tone: "error" });
    });
  };

  return (
    <div className="lanes" data-busy={pending ? "true" : "false"}>
      <div className="lane-band" aria-hidden="true">
        {both && gap > 0 ? (
          <i
            style={{
              left: `${axisPercent(Math.min(a, b))}%`,
              width: `${axisPercent(gap)}%`,
            }}
          />
        ) : null}
      </div>

      {PEOPLE.map((person, index) => {
        const score = person.key === "a" ? a : b;
        const row = index + 1;

        return (
          <Fragment key={person.key}>
            <span
              className="lane-who"
              data-owner={person.key}
              style={{ gridRow: row, gridColumn: 1 }}
            >
              {person.name}
            </span>

            <span
              className="lane-bar"
              data-owner={person.key}
              data-empty={score === null ? "true" : "false"}
              style={{ gridRow: row, gridColumn: 2 }}
              aria-hidden="true"
            >
              {score !== null ? (
                <>
                  <i className="lane-fill" style={{ width: `${axisPercent(score)}%` }} />
                  <i className="lane-cap" style={{ left: `${axisPercent(score)}%` }} />
                </>
              ) : null}
            </span>

            <label className="lane-score-wrap" style={{ gridRow: row, gridColumn: 3 }}>
              <span className="sr-only">{`${person.name}'s rating for ${movie.title}`}</span>
              <select
                className="lane-score"
                data-owner={person.key}
                data-empty={score === null ? "true" : "false"}
                value={score === null ? "" : String(score)}
                onChange={(event) => update(person.key, event.target.value)}
              >
                <option value="">Rate</option>
                {SCALE.map((value) => (
                  <option key={value} value={value}>
                    {formatRating(value)}
                  </option>
                ))}
              </select>
            </label>
          </Fragment>
        );
      })}
    </div>
  );
}
