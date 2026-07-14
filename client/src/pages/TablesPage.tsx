import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RestaurantTable, TableStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { fetchTables, updateTableStatus } from '../services';
import { useAuth } from '../store';
import { TablesPageSkeleton } from '../components/ui';

const STATUS_LABELS: Record<TableStatus, string> = {
  free: 'Free',
  reserved: 'Reserved',
  occupied: 'Occupied',
};

const STATUS_HINT: Record<TableStatus, string> = {
  free: 'Ready for the next party',
  reserved: 'Booked for later tonight',
  occupied: 'Guests are dining',
};

const BADGE: Record<TableStatus, string> = {
  free: 'bg-emerald-500/90 text-[var(--color-espresso)]',
  reserved: 'bg-[var(--color-brass)] text-[var(--color-espresso)]',
  occupied: 'bg-[var(--color-wine)] text-[var(--color-cream)]',
};

const FRAME: Record<TableStatus, string> = {
  free: 'border-emerald-400/50',
  reserved: 'border-[var(--color-brass)]',
  occupied: 'border-[var(--color-wine)]',
};

const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  free: 'reserved',
  reserved: 'occupied',
  occupied: 'free',
};

function tableImage(capacity: number | null): string {
  return capacity && capacity >= 4
    ? '/images/tables/table-rect.svg'
    : '/images/tables/table-round.svg';
}

export function TablesPage() {
  const { session, hasPermission } = useAuth();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<TableStatus | 'all'>('all');
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_TABLES);

  const reload = useCallback(async () => {
    try {
      const data = await fetchTables();
      setTables(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await fetchTables();
        if (mounted) setTables(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load tables');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function setStatus(table: RestaurantTable, status: TableStatus) {
    if (!session?.access_token || !canManage) return;
    setUpdatingId(table.id);
    try {
      const updated = await updateTableStatus(session.access_token, table.id, status);
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table');
    } finally {
      setUpdatingId(null);
    }
  }

  async function cycleStatus(table: RestaurantTable) {
    await setStatus(table, NEXT_STATUS[table.status]);
  }

  async function releaseTable(table: RestaurantTable) {
    if (table.status === 'free') return;
    await setStatus(table, 'free');
  }

  const counts = useMemo(
    () => ({
      all: tables.length,
      free: tables.filter((t) => t.status === 'free').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
    }),
    [tables],
  );

  const visible = filter === 'all' ? tables : tables.filter((t) => t.status === filter);

  if (loading) {
    return <TablesPageSkeleton />;
  }

  if (error && tables.length === 0) {
    return <p className="px-4 py-16 text-center text-[#e8a0a0] sm:px-6">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 text-left sm:space-y-10 sm:px-6 sm:py-12 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="bistro-fade-up min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            Dining floor
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl md:text-5xl">
            Tables
          </h1>
          <p className="mt-3 max-w-lg text-sm text-[var(--color-cream-muted)] sm:text-base">
            {canManage
              ? 'Tap a table to cycle Free → Reserved → Occupied, or clear it for the next guest.'
              : `${counts.free} free of ${counts.all} for tonight’s service.`}
          </p>
        </header>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm font-medium text-[var(--color-brass)] transition hover:bg-[var(--color-umber)]"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            ['free', counts.free, 'Free'],
            ['reserved', counts.reserved, 'Reserved'],
            ['occupied', counts.occupied, 'Occupied'],
          ] as const
        ).map(([status, count, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter((prev) => (prev === status ? 'all' : status))}
            className={`border px-2 py-3 text-left transition sm:px-4 sm:py-4 ${
              filter === status
                ? 'border-[var(--color-brass)] bg-[var(--color-umber)]'
                : 'border-[var(--color-brass)]/15 bg-[var(--color-umber)]/40 hover:border-[var(--color-brass)]/40'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-cream-muted)] sm:text-xs sm:tracking-[0.2em]">
              {label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)] sm:mt-2 sm:text-3xl">
              {count}
            </p>
          </button>
        ))}
      </div>

      {filter !== 'all' && (
        <button
          type="button"
          onClick={() => setFilter('all')}
          className="text-sm text-[var(--color-brass)] underline-offset-4 hover:underline"
        >
          Show all tables
        </button>
      )}

      {error && <p className="text-sm text-[#e8a0a0]">{error}</p>}

      <section className="relative overflow-hidden border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/50 px-3 py-8 sm:px-8 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--color-cream) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {visible.length === 0 ? (
          <p className="relative z-10 py-16 text-center text-[var(--color-cream-muted)]">
            No tables in this view.
          </p>
        ) : (
          <ul className="relative z-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((table) => {
              const busy = updatingId === table.id;
              return (
                <li key={table.id} className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    disabled={!canManage || busy}
                    onClick={() => void cycleStatus(table)}
                    className={[
                      'group relative w-full overflow-hidden border-2 bg-[var(--color-espresso)] transition duration-300',
                      FRAME[table.status],
                      canManage ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default',
                      busy ? 'opacity-60' : '',
                    ].join(' ')}
                    aria-label={`${table.name}, ${STATUS_LABELS[table.status]}`}
                  >
                    <img
                      src={tableImage(table.capacity)}
                      alt=""
                      className="aspect-[5/4] w-full object-contain p-3 sm:p-4"
                    />
                    <span
                      className={`absolute left-2 top-2 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:left-3 sm:top-3 sm:text-xs ${BADGE[table.status]}`}
                    >
                      {STATUS_LABELS[table.status]}
                    </span>
                    {table.capacity && (
                      <span className="absolute bottom-2 right-2 bg-[var(--color-espresso)]/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-cream-muted)] sm:bottom-3 sm:right-3 sm:text-xs">
                        {table.capacity} seats
                      </span>
                    )}
                  </button>

                  <p className="text-center text-sm text-[var(--color-cream-muted)]">
                    {STATUS_HINT[table.status]}
                  </p>

                  {canManage && table.status !== 'free' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void releaseTable(table)}
                      className="w-full rounded-md border border-[var(--color-cream)]/20 bg-[var(--color-espresso)]/50 px-3 py-2 text-sm font-medium text-[var(--color-cream)] transition hover:border-[var(--color-brass)]/50 disabled:opacity-60"
                    >
                      {table.status === 'reserved' ? 'Cancel reservation' : 'Set free'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canManage && (
        <p className="text-center text-xs text-[var(--color-cream-muted)]">
          Host tip: tap the table image to cycle Free → Reserved → Occupied.
        </p>
      )}
    </div>
  );
}
