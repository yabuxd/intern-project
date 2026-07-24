import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-espresso)] text-[var(--color-cream)]">
      <div
        aria-hidden
        className="bistro-candle pointer-events-none absolute -left-24 top-[-10%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(200,133,58,0.28),transparent_70%)]"
      />
      <div
        aria-hidden
        className="bistro-candle pointer-events-none absolute bottom-[-20%] right-[-10%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(138,46,46,0.32),transparent_70%)]"
        style={{ animationDelay: '2s' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F3ECE0' fill-opacity='0.45'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link
          to="/"
          className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-cream)] md:text-2xl"
        >
          Buna House
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-stretch">{children}</main>
    </div>
  );
}
