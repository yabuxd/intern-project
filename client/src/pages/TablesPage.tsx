import { useCallback, useEffect, useState } from 'react';
import type { RestaurantTable, TableStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { fetchTables, updateTableStatus } from '../services';
import { useAuth } from '../store';

const STATUS_LABELS: Record<TableStatus, string> = {
  free: 'Free',
  reserved: 'Reserved',
  occupied: 'Occupied',
};

const STATUS_STYLES: Record<TableStatus, string> = {
  free: 'border-emerald-500/35 bg-emerald-500/10',
  reserved: 'border-[var(--color-brass)]/45 bg-[var(--color-brass)]/10',
  occupied: 'border-[var(--color-wine)]/45 bg-[var(--color-wine)]/15',
};

const STATUS_DOT: Record<TableStatus, string> = {
  free: 'bg-emerald-400',
  reserved: 'bg-[var(--color-brass)]',
  occupied: 'bg-[var(--color-wine)]',
};

const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  free: 'reserved',
  reserved: 'occupied',
  occupied: 'free',
};

export function TablesPage() {
  const { session, hasPermission } = useAuth();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
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

  if (loading) {
    return (
      <p className="px-6 py-16 text-center text-[var(--color-cream-muted)]">Reading the floor plan…</p>
    );
  }

  if (error && tables.length === 0) {
    return <p className="px-6 py-16 text-center text-[#e8a0a0]">{error}</p>;
  }

  const freeCount = tables.filter((t) => t.status === 'free').length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12 text-left sm:px-10">
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
              ? 'Tap a table to advance status, or free a reserved seat for the next guest.'
              : `${freeCount} of ${tables.length} tables open for the evening.`}
          </p>
        </header>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm font-medium text-[var(--color-brass)] transition hover:border-[var(--color-brass)] hover:bg-[var(--color-umber)]"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-[#e8a0a0]">{error}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tables.map((table) => (
          <li
            key={table.id}
            className={`border p-5 transition ${STATUS_STYLES[table.status]}`}
          >
            <button
              type="button"
              disabled={!canManage || updatingId === table.id}
              onClick={() => void cycleStatus(table)}
              className="w-full text-left disabled:cursor-default"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                  {table.name}
                </p>
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[table.status]}`} />
              </div>
              {table.capacity && (
                <p className="mt-2 text-sm text-[var(--color-cream-muted)]">Seats {table.capacity}</p>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-cream)]">
                {STATUS_LABELS[table.status]}
              </p>
            </button>
            {canManage && table.status !== 'free' && (
              <button
                type="button"
                disabled={updatingId === table.id}
                onClick={() => void releaseTable(table)}
                className="mt-4 w-full rounded-md border border-[var(--color-cream)]/20 bg-[var(--color-espresso)]/40 px-3 py-2 text-sm font-medium text-[var(--color-cream)] transition hover:border-[var(--color-brass)]/50 disabled:opacity-60"
              >
                {table.status === 'reserved' ? 'Cancel reservation' : 'Set free'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
