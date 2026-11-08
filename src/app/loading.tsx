export default function Loading() {
  return (
    <main className="shell" aria-busy="true" aria-label="Loading">
      <header className="masthead">
        <h1 className="wordmark">
          Movie
          <em>nights</em>
        </h1>
      </header>
      <ul className="tally">
        {Array.from({ length: 5 }, (_, i) => (
          <li className="tally-item skeleton" key={i} style={{ height: 64 }} />
        ))}
      </ul>
      <ul className="reel">
        {Array.from({ length: 5 }, (_, i) => (
          <li className="film" key={i}>
            <span className="film-poster skeleton" />
            <div className="film-meta skeleton-lines">
              <i />
              <i />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
