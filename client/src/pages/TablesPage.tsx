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

const STATUS_COLORS: Record<TableStatus, string> = {
  free: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  reserved: 'bg-amber-100 text-amber-800 border-amber-200',
  occupied: 'bg-rose-100 text-rose-800 border-rose-200',
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

  async function cycleStatus(table: RestaurantTable) {
    if (!session?.access_token || !canManage) return;
    setUpdatingId(table.id);
    try {
      const next = NEXT_STATUS[table.status];
      const updated = await updateTableStatus(session.access_token, table.id, next);
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p className="text-stone-600">Loading tables…</p>;
  }

  if (error && tables.length === 0) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Dining floor</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">Tables</h1>
          <p className="mt-2 text-stone-600">
            {canManage
              ? 'Tap a table to cycle its status: free → reserved → occupied.'
              : 'Current table availability across the restaurant.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tables.map((table) => (
          <li key={table.id}>
            <button
              type="button"
              disabled={!canManage || updatingId === table.id}
              onClick={() => void cycleStatus(table)}
              className={`w-full rounded-2xl border p-5 text-left shadow-sm transition hover:shadow-md disabled:cursor-default disabled:opacity-70 ${STATUS_COLORS[table.status]}`}
            >
              <p className="font-[family-name:var(--font-display)] text-xl">{table.name}</p>
              {table.capacity && (
                <p className="mt-1 text-sm opacity-80">Seats {table.capacity}</p>
              )}
              <p className="mt-3 text-sm font-semibold uppercase tracking-wide">
                {STATUS_LABELS[table.status]}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
