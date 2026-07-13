import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';

export function LoginPage() {
  const { signIn, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid w-full flex-1 lg:grid-cols-2">
      <section className="auth-rise flex flex-col justify-end px-6 pb-12 pt-8 md:px-10 lg:justify-center lg:pb-24 lg:pt-0">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brass)]">
          Staff & guests
        </p>
        <h1 className="max-w-lg font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[var(--color-mist)] md:text-6xl lg:text-7xl">
          Restaurant Order System
        </h1>
        <p className="mt-5 max-w-md text-base text-[var(--color-mist)]/75 md:text-lg">
          Sign in to place orders, follow the kitchen queue, and manage tables in one place.
        </p>
      </section>

      <section className="auth-rise-delay flex items-end justify-center px-6 pb-10 md:px-10 lg:items-center lg:pb-0">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md space-y-5 rounded-2xl bg-[var(--color-panel)] p-7 text-[var(--color-ink)] shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-8"
        >
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">Welcome back</h2>
            <p className="text-sm text-[var(--color-ink)]/65">Enter your account details to continue.</p>
          </div>

          <label className="block space-y-2 text-left text-sm">
            <span className="font-medium text-[var(--color-ink)]/80">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-ink)]/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--color-ink-soft)] focus:ring-2 focus:ring-[var(--color-ink-soft)]/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="block space-y-2 text-left text-sm">
            <span className="font-medium text-[var(--color-ink)]/80">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-ink)]/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--color-ink-soft)] focus:ring-2 focus:ring-[var(--color-ink-soft)]/20"
              placeholder="••••••••"
            />
          </label>

          {(localError || error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">
              {localError || error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-[var(--color-mist)] transition hover:-translate-y-0.5 hover:bg-[var(--color-ink-soft)] disabled:translate-y-0 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-[var(--color-ink)]/65">
            No account?{' '}
            <Link to="/signup" className="font-semibold text-[var(--color-ink)] underline decoration-[var(--color-brass)] underline-offset-4">
              Create one
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
