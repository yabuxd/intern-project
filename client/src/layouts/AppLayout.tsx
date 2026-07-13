import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { session, user, signOut, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center gap-5">
          <Link to="/" className="text-sm font-medium uppercase tracking-wide text-stone-500">
            Restaurant Order System
          </Link>
          <Link to="/menu" className="text-sm text-stone-700 hover:text-stone-900">
            Menu
          </Link>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {!loading && !session && (
            <>
              <Link to="/login" className="text-stone-700 hover:text-stone-900">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-stone-900 px-3 py-1.5 font-medium text-white"
              >
                Sign up
              </Link>
            </>
          )}
          {!loading && session && (
            <>
              <span className="hidden text-stone-600 sm:inline">{user?.email ?? 'Signed in'}</span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-800"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="flex flex-1 justify-center px-6 py-10 md:py-14">{children}</main>
    </div>
  );
}
