import { Link } from 'react-router-dom';
import { useAuth } from '../store';

export function HomePage() {
  const { user, loading, session, error } = useAuth();

  if (loading) {
    return <p className="text-stone-600">Loading session…</p>;
  }

  if (!session) {
    return (
      <section className="max-w-lg space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Restaurant Order System
        </h1>
        <p className="text-stone-600">
          Sign in to load your profile and permissions from the Laravel API.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/login"
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800"
          >
            Sign up
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-lg space-y-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Welcome</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {user ? (
        <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-6 text-left shadow-sm">
          <p className="text-sm text-stone-500">Signed in as</p>
          <p className="font-medium text-stone-900">{user.name ?? user.email}</p>
          <p className="text-sm text-stone-600">{user.email}</p>
          <div className="pt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Permissions</p>
            {user.permissions.length === 0 ? (
              <p className="mt-1 text-sm text-stone-600">None assigned yet</p>
            ) : (
              <ul className="mt-1 list-inside list-disc text-sm text-stone-700">
                {user.permissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="text-stone-600">Session found, but /api/me could not be loaded.</p>
      )}
    </section>
  );
}
