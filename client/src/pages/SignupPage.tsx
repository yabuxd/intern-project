import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';

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
    <div className="flex w-full flex-1 items-center justify-center px-6 py-10 md:px-10">
      <form
        onSubmit={onSubmit}
        className="auth-rise w-full max-w-md space-y-5 rounded-2xl bg-[var(--color-panel)] p-7 text-[var(--color-ink)] shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-8"
      >
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">Create account</h1>
          <p className="text-sm text-[var(--color-ink)]/65">Join to start ordering and managing tables.</p>
        </div>

        <label className="block space-y-2 text-left text-sm">
          <span className="font-medium text-[var(--color-ink)]/80">Full name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-ink)]/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--color-ink-soft)] focus:ring-2 focus:ring-[var(--color-ink-soft)]/20"
          />
        </label>

        <label className="block space-y-2 text-left text-sm">
          <span className="font-medium text-[var(--color-ink)]/80">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-ink)]/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--color-ink-soft)] focus:ring-2 focus:ring-[var(--color-ink-soft)]/20"
          />
        </label>

        <label className="block space-y-2 text-left text-sm">
          <span className="font-medium text-[var(--color-ink)]/80">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-ink)]/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--color-ink-soft)] focus:ring-2 focus:ring-[var(--color-ink-soft)]/20"
          />
        </label>

        {(localError || error) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">
            {localError || error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-[var(--color-mist)] transition hover:-translate-y-0.5 hover:bg-[var(--color-ink-soft)] disabled:translate-y-0 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Sign up'}
        </button>

        <p className="text-center text-sm text-[var(--color-ink)]/65">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[var(--color-ink)] underline decoration-[var(--color-brass)] underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
