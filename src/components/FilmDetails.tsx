"use client";

import { useEffect, useState } from "react";
import type { Movie } from "@/lib/supabase";
import type { Provider, TmdbDetails } from "@/lib/tmdb";
import { PEOPLE, formatRating, formatRuntime, formatWatched, personName } from "@/lib/people";
import { stinkScore } from "@/lib/stink";
import Dialog from "./Dialog";
import StinkBadge from "./StinkBadge";

const cache = new Map<number, TmdbDetails>();

const IMG = (path: string | null, size: string) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/** Wraps a poster or title so clicking it opens the TMDB details sheet. */
export default function FilmDetails({
  movie,
  className,
  children,
}: {
  movie: Movie;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!movie.tmdb_id) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        className={`details-trigger ${className ?? ""}`}
        onClick={() => setOpen(true)}
        aria-label={`About ${movie.title}`}
      >
        {children}
      </button>
      <Dialog open={open} title={movie.title} size="lg" onClose={() => setOpen(false)}>
        <DetailsBody movie={movie} />
      </Dialog>
    </>
  );
}

function DetailsBody({ movie }: { movie: Movie }) {
  const id = movie.tmdb_id as number;
  const [details, setDetails] = useState<TmdbDetails | null>(cache.get(id) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache.has(id)) return;
    const controller = new AbortController();
    fetch(`/api/tmdb/${id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.details) throw new Error(data.error ?? "Couldn't load details.");
        cache.set(id, data.details);
        setDetails(data.details);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Couldn't load details.");
        }
      });
    return () => controller.abort();
  }, [id]);

  const overall = stinkScore(movie.rating_a, movie.rating_b);
  const picker = personName(movie.picked_by);

  const ours = (
    <div className="details-ours">
      {overall !== null ? <StinkBadge score={overall} size="lg" /> : null}
      {movie.status === "watched" ? (
        <dl className="details-scores">
          {PEOPLE.map((person) => {
            const v = person.key === "a" ? movie.rating_a : movie.rating_b;
            return (
              <div key={person.key}>
                <dt style={{ color: person.colour }}>{person.name}</dt>
                <dd data-owner={person.key}>{formatRating(v)}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      <p className="details-when">
        {movie.status === "watched" ? formatWatched(movie.watched_on) : "On the watchlist"}
        {picker ? ` · ${picker}'s pick` : ""}
      </p>
      {movie.note ? <p className="film-note">{movie.note}</p> : null}
    </div>
  );

  if (error) {
    return (
      <>
        {ours}
        <p className="hint" data-tone="error">
          {error}
        </p>
      </>
    );
  }

  if (!details) {
    return (
      <>
        <div className="details-hero skeleton" />
        {ours}
        <div className="skeleton-lines" aria-label="Loading">
          <i />
          <i />
          <i />
        </div>
      </>
    );
  }

  const backdrop = IMG(details.backdrop_path, "w780");
  const runtime = formatRuntime(details.runtime ?? movie.runtime);
  const facts = [details.year, runtime, details.genres.slice(0, 3).join(", ")].filter(Boolean);

  return (
    <>
      {backdrop ? (
        <div className="details-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" />
          {details.tagline ? <p className="details-tagline">{details.tagline}</p> : null}
        </div>
      ) : null}

      {ours}

      {facts.length ? <p className="details-facts">{facts.join(" · ")}</p> : null}

      {details.overview ? <p className="details-overview">{details.overview}</p> : null}

      <dl className="details-credits">
        {details.director ? (
          <div>
            <dt>Director</dt>
            <dd>{details.director}</dd>
          </div>
        ) : null}
        {details.cast.length ? (
          <div>
            <dt>Starring</dt>
            <dd>{details.cast.join(", ")}</dd>
          </div>
        ) : null}
        {details.vote !== null ? (
          <div>
            <dt>TMDB users</dt>
            <dd>{details.vote.toFixed(1)} / 10</dd>
          </div>
        ) : null}
      </dl>

      {details.providers &&
      (details.providers.stream.length ||
        details.providers.rent.length ||
        details.providers.buy.length) ? (
        <section className="details-providers">
          <h3>Where to watch ({details.providers.region})</h3>
          <ProviderRow label="Stream" list={details.providers.stream} />
          <ProviderRow label="Rent" list={details.providers.rent} />
          {!details.providers.stream.length ? (
            <ProviderRow label="Buy" list={details.providers.buy} />
          ) : null}
        </section>
      ) : null}

      <div className="details-links">
        {details.trailer ? (
          <a
            className="btn btn-primary"
            href={`https://www.youtube.com/watch?v=${details.trailer}`}
            target="_blank"
            rel="noreferrer"
          >
            ▶ Watch trailer
          </a>
        ) : null}
        <a
          className="btn"
          href={`https://www.themoviedb.org/movie/${details.tmdb_id}`}
          target="_blank"
          rel="noreferrer"
        >
          TMDB
        </a>
        {details.imdb_id ? (
          <a
            className="btn"
            href={`https://www.imdb.com/title/${details.imdb_id}/`}
            target="_blank"
            rel="noreferrer"
          >
            IMDb
          </a>
        ) : null}
        {details.providers?.link ? (
          <a className="btn" href={details.providers.link} target="_blank" rel="noreferrer">
            All options
          </a>
        ) : null}
      </div>
      <p className="hint">Film data and streaming info from TMDB and JustWatch.</p>
    </>
  );
}

function ProviderRow({ label, list }: { label: string; list: Provider[] }) {
  if (!list.length) return null;
  return (
    <div className="provider-row">
      <span className="provider-label">{label}</span>
      <ul>
        {list.map((p) => {
          const logo = IMG(p.logo_path, "w92");
          return (
            <li key={p.name} title={p.name}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={p.name} width={30} height={30} />
              ) : (
                <span>{p.name}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
