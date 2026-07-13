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
    <section className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Create account</h1>
        <p className="text-sm text-stone-600">Registers via Supabase Auth</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <label className="block space-y-1 text-left text-sm">
          <span className="font-medium text-stone-700">Full name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
          />
        </label>
        <label className="block space-y-1 text-left text-sm">
          <span className="font-medium text-stone-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
          />
        </label>
        <label className="block space-y-1 text-left text-sm">
          <span className="font-medium text-stone-700">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
          />
        </label>
        {(localError || error) && (
          <p className="text-sm text-red-600" role="alert">
            {localError || error}
          </p>
        )}
        {info && (
          <p className="text-sm text-emerald-700" role="status">
            {info}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-stone-900 underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
