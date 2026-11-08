import type { Summary } from "@/lib/stats";
import { PEOPLE, formatRating } from "@/lib/people";
import StinkBadge from "./StinkBadge";

export default function Insights({ stats }: { stats: Summary }) {
  const peak = Math.max(1, ...stats.histogram.flatMap((h) => h.buckets));
  const monthPeak = Math.max(1, ...stats.months.map((m) => m.count));

  const higher =
    stats.lean === null || Math.abs(stats.lean) < 0.1
      ? null
      : stats.lean > 0
        ? PEOPLE[0]
        : PEOPLE[1];

  return (
    <details className="insights">
      <summary>
        <span>Insights</span>
        <span className="insights-sub">
          {stats.inSync !== null ? `${stats.inSync}% in sync` : "Rate a few more to unlock"}
          {stats.unrated ? ` · ${stats.unrated} waiting on a rating` : ""}
        </span>
        <span className="insights-caret" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className="insights-grid">
        <section className="panel">
          <h3>How you each score</h3>
          <div className="hist">
            {stats.histogram.map((person) => (
              <div className="hist-row" key={person.key}>
                <span className="hist-who" data-owner={person.key}>
                  {person.name}
                </span>
                <div className="hist-bars">
                  {person.buckets.map((n, i) => (
                    <i
                      key={i}
                      data-owner={person.key}
                      style={{ height: `${(n / peak) * 100}%` }}
                      title={`${i}–${i + 1}: ${n} film${n === 1 ? "" : "s"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="hist-axis" aria-hidden="true">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
          <p className="panel-foot">
            {higher
              ? `${higher.name} scores ${formatRating(Math.abs(stats.lean as number))} higher on average.`
              : stats.bothRated
                ? "You score almost identically on average."
                : "Rate a film together to compare."}
          </p>
        </section>

        <section className="panel">
          <h3>Films per month</h3>
          <div className="months">
            {stats.months.map((m) => (
              <div className="month" key={m.key} title={`${m.label}: ${m.count}`}>
                <span className="month-count">{m.count || ""}</span>
                <i style={{ height: `${(m.count / monthPeak) * 100}%` }} data-empty={m.count ? "false" : "true"} />
                <span className="month-label">{m.label.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          <p className="panel-foot">
            {stats.months.reduce((t, m) => t + m.count, 0)} films in the last 12 months.
          </p>
        </section>

        {stats.top.length ? (
          <section className="panel">
            <h3>Hall of fame</h3>
            <ol className="ranking">
              {stats.top.map(({ movie, score }) => (
                <li key={movie.id}>
                  <span className="ranking-title">{movie.title}</span>
                  <StinkBadge score={score} showLabel={false} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {stats.bottom.length ? (
          <section className="panel">
            <h3>Hall of shame</h3>
            <ol className="ranking">
              {stats.bottom.map(({ movie, score }) => (
                <li key={movie.id}>
                  <span className="ranking-title">{movie.title}</span>
                  <StinkBadge score={score} showLabel={false} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {stats.fight && stats.widest ? (
          <section className="panel">
            <h3>Biggest row</h3>
            <p className="fight-title">{stats.fight.title}</p>
            <p className="fight-scores">
              {PEOPLE.map((person) => (
                <span key={person.key} data-owner={person.key}>
                  {person.name} {formatRating(person.key === "a" ? stats.fight!.rating_a : stats.fight!.rating_b)}
                </span>
              ))}
            </p>
            <p className="panel-foot">{formatRating(stats.widest)} points apart.</p>
          </section>
        ) : null}

        {stats.pickScores.some((p) => p.count) ? (
          <section className="panel">
            <h3>Picks</h3>
            <ul className="picks">
              {stats.pickScores.map((p) => (
                <li key={p.key}>
                  <span data-owner={p.key}>{p.name}</span>
                  <span className="picks-count">
                    {p.count} pick{p.count === 1 ? "" : "s"}
                  </span>
                  {p.score !== null ? <StinkBadge score={p.score} showLabel={false} /> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </details>
  );
}
