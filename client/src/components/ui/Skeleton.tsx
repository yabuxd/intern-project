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
      <SkeletonBlock className="h-3 w-24 sm:w-28" />
      <SkeletonBlock className="h-8 w-40 max-w-full sm:h-10 sm:w-56" />
      <SkeletonBlock className="h-3 w-64 max-w-full sm:h-4 sm:w-80" />
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-4 sm:p-5"
        >
          <div className="flex justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <SkeletonBlock className="h-6 w-32 sm:h-7 sm:w-40" />
              <SkeletonBlock className="h-3 w-44 max-w-full sm:w-56" />
            </div>
            <div className="space-y-2 text-right">
              <SkeletonBlock className="ml-auto h-5 w-16" />
              <SkeletonBlock className="ml-auto h-4 w-20" />
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-[var(--color-brass)]/10 pt-4">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-[70%]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Matches TablesPage: summary strip + image-style floor grid */
export function TablesPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:space-y-10 sm:px-6 sm:py-12 md:px-10"
      aria-busy="true"
      aria-label="Loading tables"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeaderSkeleton />
        <SkeletonBlock className="h-9 w-24" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/40 px-2 py-3 sm:px-4 sm:py-4"
          >
            <SkeletonBlock className="h-3 w-12 sm:w-16" />
            <SkeletonBlock className="mt-2 h-7 w-8 sm:mt-3 sm:h-9 sm:w-10" />
          </div>
        ))}
      </div>

      <section className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/50 px-3 py-8 sm:px-8 sm:py-10">
        <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex flex-col items-center gap-3">
              <div className="w-full overflow-hidden border-2 border-[var(--color-brass)]/20 bg-[var(--color-espresso)]">
                <SkeletonBlock className="aspect-[5/4] w-full rounded-none" />
              </div>
              <SkeletonBlock className="h-3 w-28" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Matches MenuPage: 2-col cards + cart sidebar on large screens */
export function MenuSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:space-y-10 sm:px-6 sm:py-10 md:px-10"
      aria-busy="true"
      aria-label="Loading menu"
    >
      <PageHeaderSkeleton />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8 sm:space-y-10">
          {Array.from({ length: 2 }, (_, section) => (
            <section key={section} className="space-y-4">
              <SkeletonBlock className="h-6 w-28 sm:h-7 sm:w-36" />
              <ul className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <li
                    key={i}
                    className="overflow-hidden rounded-xl border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 sm:rounded-2xl"
                  >
                    <SkeletonBlock className="h-24 w-full rounded-none sm:h-40 md:h-44" />
                    <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                      <div className="flex justify-between gap-2">
                        <SkeletonBlock className="h-4 w-16 sm:h-5 sm:w-24" />
                        <SkeletonBlock className="h-4 w-10 sm:w-14" />
                      </div>
                      <SkeletonBlock className="h-3 w-full" />
                      <SkeletonBlock className="h-7 w-full sm:h-8" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="hidden h-fit border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-5 lg:block">
          <SkeletonBlock className="h-6 w-20" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-[80%]" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div
      className="grid gap-5 border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-5 sm:grid-cols-2 sm:p-8"
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

/** Matches HomePage hero + a couple of below-fold bands */
export function HeroSkeleton() {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading">
      <div className="relative min-h-[min(88vh,760px)] w-full overflow-hidden bg-[var(--color-umber)]">
        <div className="relative z-10 mx-auto flex min-h-[min(88vh,760px)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 md:px-10">
          <SkeletonBlock className="h-10 w-40 max-w-full sm:h-12 sm:w-56" />
          <SkeletonBlock className="mt-5 h-8 w-64 max-w-full sm:mt-6 sm:h-10 sm:w-96" />
          <SkeletonBlock className="mt-4 h-4 w-56 max-w-full sm:w-72" />
          <div className="mt-8 flex flex-wrap gap-3 sm:mt-9">
            <SkeletonBlock className="h-11 w-28 sm:w-32" />
            <SkeletonBlock className="h-11 w-28 sm:w-36" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-14 sm:px-6 md:px-10">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-8 w-64 max-w-full" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="overflow-hidden bg-[var(--color-umber)]/60">
              <SkeletonBlock className="h-32 w-full rounded-none sm:h-44" />
              <div className="p-3 sm:p-4">
                <SkeletonBlock className="h-5 w-20 sm:w-28" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:space-y-10 sm:px-6 sm:py-12 md:px-10">
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
    </div>
  );
}

export function ReservationsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:space-y-12 sm:px-6 sm:py-12 md:px-10">
      <PageHeaderSkeleton />
      <FormSkeleton />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-9 w-24" />
        </div>
        <CardListSkeleton count={2} />
      </div>
    </div>
  );
}

export function QueuePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:space-y-10 sm:px-6 sm:py-12 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeaderSkeleton />
        <SkeletonBlock className="h-9 w-24" />
      </div>
      <CardListSkeleton count={4} />
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 md:px-10"
      aria-busy="true"
      aria-label="Loading"
    >
      <PageHeaderSkeleton />
      <ul className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <li
            key={i}
            className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/60 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-36 sm:w-40" />
                <SkeletonBlock className="h-3 w-44 sm:w-52" />
              </div>
              <SkeletonBlock className="h-9 w-20" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

/** @deprecated Prefer TablesPageSkeleton — kept for any leftover imports */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-3">
          <SkeletonBlock className="aspect-[5/4] w-full" />
          <SkeletonBlock className="mx-auto h-3 w-24" />
        </li>
      ))}
    </ul>
  );
}
