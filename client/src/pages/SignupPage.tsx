import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';

const inputClass =
  'w-full rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-4 py-3 text-[var(--color-cream)] outline-none transition placeholder:text-[var(--color-cream-muted)] focus:border-[var(--color-brass)] focus:ring-1 focus:ring-[var(--color-brass)]/40';

export function SignupPage() {
  const { signUp, error } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    setInfo(null);
    try {
      await signUp(email, password, fullName || undefined);
      setInfo('Account created. If email confirmation is enabled, check your inbox, then sign in.');
      navigate('/login');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid w-full flex-1 lg:grid-cols-2">
      <section className="auth-rise flex flex-col justify-end px-6 pb-12 pt-8 md:px-10 lg:justify-center lg:pb-24 lg:pt-0">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
          Join the house
        </p>
        <h1 className="max-w-lg font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[var(--color-cream)] md:text-6xl lg:text-7xl">
          Create your seat
        </h1>
        <p className="mt-5 max-w-md text-base text-[var(--color-cream-muted)] md:text-lg">
          Open an account to reserve a table, place orders, and settle into the evening service.
        </p>
      </section>

      <section className="auth-rise-delay flex items-end justify-center px-6 pb-10 md:px-10 lg:items-center lg:pb-0">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md space-y-5 border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-8"
        >
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)]">
              Create account
            </h2>
            <p className="text-sm text-[var(--color-cream-muted)]">
              Join to start ordering and booking tables.
            </p>
          </div>

          <label className="block space-y-2 text-left text-sm">
            <span className="font-medium text-[var(--color-cream)]">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Yeabtsega"
            />
          </label>

          <label className="block space-y-2 text-left text-sm">
            <span className="font-medium text-[var(--color-cream)]">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>

          <label className="block space-y-2 text-left text-sm">
            <span className="font-medium text-[var(--color-cream)]">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </label>

          {(localError || error) && (
            <p
              className="rounded-md border border-[var(--color-wine)]/40 bg-[var(--color-wine)]/20 px-3 py-2 text-sm text-[#e8a0a0]"
              role="alert"
            >
              {localError || error}
            </p>
          )}
          {info && (
            <p
              className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200"
              role="status"
            >
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[var(--color-brass)] px-4 py-3 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Sign up'}
          </button>

          <p className="text-center text-sm text-[var(--color-cream-muted)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[var(--color-brass)] underline decoration-[var(--color-brass)]/40 underline-offset-4 hover:decoration-[var(--color-brass)]"
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
