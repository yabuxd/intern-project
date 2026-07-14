import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RestaurantTable, TableStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { fetchTables, updateTableStatus } from '../services';
import { useAuth } from '../store';
import { TablesPageSkeleton } from '../components/ui';

const STATUS_LABELS: Record<TableStatus, string> = {
  free: 'Open',
  reserved: 'Held',
  occupied: 'Seated',
};

const STATUS_HINT: Record<TableStatus, string> = {
  free: 'Ready for the next party',
  reserved: 'Booked for later',
  occupied: 'Guests at the table',
};

const RING: Record<TableStatus, string> = {
  free: 'border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.25),0_12px_40px_rgba(0,0,0,0.35)]',
  reserved: 'border-[var(--color-brass)] shadow-[0_0_0_1px_rgba(200,133,58,0.35),0_12px_40px_rgba(0,0,0,0.35)]',
  occupied: 'border-[var(--color-wine)] shadow-[0_0_0_1px_rgba(138,46,46,0.45),0_12px_40px_rgba(0,0,0,0.35)]',
};

const FILL: Record<TableStatus, string> = {
  free: 'from-emerald-500/20 via-[var(--color-umber)] to-[var(--color-espresso)]',
  reserved: 'from-[var(--color-brass)]/25 via-[var(--color-umber)] to-[var(--color-espresso)]',
  occupied: 'from-[var(--color-wine)]/30 via-[var(--color-umber)] to-[var(--color-espresso)]',
};

const BADGE: Record<TableStatus, string> = {
  free: 'bg-emerald-500/20 text-emerald-300',
  reserved: 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]',
  occupied: 'bg-[var(--color-wine)]/30 text-[#e8a0a0]',
};

const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  free: 'reserved',
  reserved: 'occupied',
  occupied: 'free',
};

function tableShapeClass(capacity: number | null): string {
  if (capacity && capacity >= 4) {
    return 'aspect-[4/3] w-full max-w-[220px] rounded-[40%]';
  }
  return 'aspect-square w-full max-w-[180px] rounded-full';
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

  const counts = useMemo(() => {
    return {
      all: tables.length,
      free: tables.filter((t) => t.status === 'free').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
    };
  }, [tables]);

  const visible = filter === 'all' ? tables : tables.filter((t) => t.status === filter);

  if (loading) {
    return <TablesPageSkeleton />;
  }

  if (error && tables.length === 0) {
    return <p className="px-6 py-16 text-center text-[#e8a0a0]">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-6 py-12 text-left sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="bistro-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            Dining floor
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)] sm:text-5xl">
            Tables
          </h1>
          <p className="mt-3 max-w-lg text-[var(--color-cream-muted)]">
            {canManage
              ? 'Tap a table to advance the evening — open → held → seated — or free a seat at once.'
              : `${counts.free} open of ${counts.all} for tonight’s service.`}
          </p>
        </header>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm font-medium text-[var(--color-brass)] transition hover:border-[var(--color-brass)] hover:bg-[var(--color-umber)]"
        >
          Refresh floor
        </button>
      </div>

      {/* Status summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['free', counts.free, 'Open tables'],
            ['reserved', counts.reserved, 'Held tonight'],
            ['occupied', counts.occupied, 'Currently seated'],
          ] as const
        ).map(([status, count, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter((prev) => (prev === status ? 'all' : status))}
            className={`border px-4 py-4 text-left transition ${
              filter === status
                ? 'border-[var(--color-brass)] bg-[var(--color-umber)]'
                : 'border-[var(--color-brass)]/15 bg-[var(--color-umber)]/40 hover:border-[var(--color-brass)]/40'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-cream-muted)]">
              {label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
              {count}
            </p>
            <p className={`mt-2 inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${BADGE[status]}`}>
              {STATUS_LABELS[status]}
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

      {/* Floor canvas */}
      <section className="relative overflow-hidden border border-[var(--color-brass)]/15 bg-[var(--color-umber)]/50 px-4 py-10 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--color-cream) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden
          className="bistro-candle pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,133,58,0.2),transparent_70%)]"
        />

        {visible.length === 0 ? (
          <p className="relative z-10 py-16 text-center text-[var(--color-cream-muted)]">
            No tables in this view.
          </p>
        ) : (
          <ul className="relative z-10 grid justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((table) => {
              const busy = updatingId === table.id;
              return (
                <li key={table.id} className="flex w-full max-w-[240px] flex-col items-center gap-4">
                  <button
                    type="button"
                    disabled={!canManage || busy}
                    onClick={() => void cycleStatus(table)}
                    className={[
                      'group relative flex items-center justify-center border-2 bg-gradient-to-b transition duration-300',
                      tableShapeClass(table.capacity),
                      RING[table.status],
                      FILL[table.status],
                      canManage ? 'cursor-pointer hover:scale-[1.03]' : 'cursor-default',
                      busy ? 'opacity-60' : '',
                    ].join(' ')}
                    aria-label={`${table.name}, ${STATUS_LABELS[table.status]}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-[18%] rounded-[inherit] border border-[var(--color-cream)]/10 bg-[var(--color-espresso)]/35"
                    />
                    <span className="relative z-10 text-center">
                      <span className="block font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)] sm:text-3xl">
                        {table.name.replace(/^Table\s+/i, '')}
                      </span>
                      {table.capacity && (
                        <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-[var(--color-cream-muted)]">
                          {table.capacity} seats
                        </span>
                      )}
                    </span>
                  </button>

                  <div className="w-full text-center">
                    <p
                      className={`inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${BADGE[table.status]}`}
                    >
                      {STATUS_LABELS[table.status]}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-cream-muted)]">
                      {STATUS_HINT[table.status]}
                    </p>
                    {canManage && table.status !== 'free' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void releaseTable(table)}
                        className="mt-3 w-full rounded-md border border-[var(--color-cream)]/20 bg-[var(--color-espresso)]/50 px-3 py-2 text-sm font-medium text-[var(--color-cream)] transition hover:border-[var(--color-brass)]/50 disabled:opacity-60"
                      >
                        {table.status === 'reserved' ? 'Cancel hold' : 'Clear table'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canManage && (
        <p className="text-center text-xs text-[var(--color-cream-muted)]">
          Host tip: tap the table surface to cycle Open → Held → Seated.
        </p>
      )}
    </div>
  );
}
