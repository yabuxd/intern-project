import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          Internship scaffold
        </p>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">{children}</main>
    </div>
  );
}
