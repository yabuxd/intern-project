interface SkeletonBlockProps {
  className?: string;
}

/** Pulsing umber bar for bistro-themed loading states. */
export function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`bistro-skeleton rounded-sm ${className}`} aria-hidden />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-3 w-28" />
      <SkeletonBlock className="h-10 w-64 max-w-full" />
      <SkeletonBlock className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-5"
        >
          <div className="flex justify-between gap-4">
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-7 w-40" />
              <SkeletonBlock className="h-3 w-56 max-w-full" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
            <SkeletonBlock className="h-6 w-20" />
          </div>
          <div className="mt-5 space-y-2 border-t border-[var(--color-brass)]/10 pt-4">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-[80%]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-5"
        >
          <SkeletonBlock className="h-8 w-28" />
          <SkeletonBlock className="mt-3 h-3 w-20" />
          <SkeletonBlock className="mt-6 h-3 w-16" />
        </li>
      ))}
    </ul>
  );
}

export function MenuSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-6 py-12" aria-busy="true" aria-label="Loading menu">
      <PageHeaderSkeleton />
      {Array.from({ length: 2 }, (_, section) => (
        <section key={section} className="space-y-5">
          <SkeletonBlock className="h-7 w-36" />
          <ul className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <li
                key={i}
                className="overflow-hidden border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60"
              >
                <SkeletonBlock className="h-24 w-full rounded-none sm:h-40" />
                <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                  <SkeletonBlock className="h-4 w-24 sm:h-5 sm:w-32" />
                  <SkeletonBlock className="h-3 w-full" />
                  <SkeletonBlock className="h-3 w-[66%]" />
                  <SkeletonBlock className="h-7 w-16 sm:h-8 sm:w-24" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div
      className="grid gap-5 border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-6 sm:grid-cols-2 sm:p-8"
      aria-busy="true"
      aria-label="Loading form"
    >
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonBlock className="h-12 w-full sm:col-span-2" />
      <SkeletonBlock className="h-20 w-full sm:col-span-2" />
      <SkeletonBlock className="h-11 w-32" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div
      className="relative min-h-[min(70vh,560px)] w-full overflow-hidden bg-[var(--color-umber)]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="relative z-10 mx-auto flex min-h-[min(70vh,560px)] max-w-6xl flex-col justify-center px-6 py-20 sm:px-10">
        <SkeletonBlock className="h-12 w-56 max-w-full" />
        <SkeletonBlock className="mt-6 h-10 w-96 max-w-full" />
        <SkeletonBlock className="mt-4 h-4 w-72 max-w-full" />
        <div className="mt-9 flex gap-3">
          <SkeletonBlock className="h-11 w-32" />
          <SkeletonBlock className="h-11 w-36" />
        </div>
      </div>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12">
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
    </div>
  );
}

export function TablesPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12">
      <PageHeaderSkeleton />
      <GridSkeleton count={8} />
    </div>
  );
}

export function ReservationsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-6 py-12">
      <PageHeaderSkeleton />
      <FormSkeleton />
      <CardListSkeleton count={2} />
    </div>
  );
}

export function QueuePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12">
      <PageHeaderSkeleton />
      <CardListSkeleton count={4} />
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-12" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <ul className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <li
            key={i}
            className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-6"
          >
            <div className="flex justify-between gap-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-3 w-52" />
              </div>
              <SkeletonBlock className="h-9 w-20" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, j) => (
                <SkeletonBlock key={j} className="h-12 w-full" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
