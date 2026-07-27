import { signIn } from "./actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ wrong?: string }>;
}) {
  const { wrong } = await searchParams;

  return (
    <main className="gate">
      <div className="gate-card">
        <h1 className="wordmark">
          Movie
          <em>nights</em>
        </h1>

        <form action={signIn}>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              name="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          <button className="btn btn-primary" type="submit">
            Let me in
          </button>

          {wrong ? (
            <p className="hint" data-tone="error">
              That password doesn&rsquo;t match. Try again.
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
