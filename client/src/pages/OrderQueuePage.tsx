import { useCallback, useEffect, useState } from 'react';
import type { Order, OrderStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { Link, Navigate } from 'react-router-dom';
import { fetchOrderQueue, updateOrderStatus } from '../services';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50',
  preparing: 'border-blue-200 bg-blue-50',
  ready: 'border-emerald-200 bg-emerald-50',
};

export function OrderQueuePage() {
  const { session, hasPermission } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const canView = hasPermission(PERMISSIONS.CAN_VIEW_ALL_ORDERS);
  const canUpdate = hasPermission(PERMISSIONS.CAN_UPDATE_ORDER_STATUS);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const data = await fetchOrderQueue(session.access_token);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    }
  }, [session?.access_token]);

  useOrdersRealtime(() => {
    void reload();
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!session?.access_token) return;
      try {
        const data = await fetchOrderQueue(session.access_token);
        if (mounted) setOrders(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load queue');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  async function advanceStatus(order: Order) {
    if (!session?.access_token || !canUpdate) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(session.access_token, order.id, next);
      setOrders((prev) => {
        if (updated.status === 'served') {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p className="text-stone-600">Loading kitchen queue…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Kitchen</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">
            Order queue
          </h1>
          <p className="mt-2 text-stone-600">
            Live updates via Supabase Realtime when configured; polls every 5s on local SQLite.
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

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          No active orders in the queue.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className={`rounded-2xl border p-5 shadow-sm ${STATUS_COLORS[order.status] ?? 'bg-white'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-stone-900">Order #{order.id}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {order.table?.name ?? 'No table'} · {formatEtb(order.total)}
                  </p>
                  {order.user && (
                    <p className="text-sm text-stone-500">{order.user.email}</p>
                  )}
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-wide text-stone-700">
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-stone-700">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                  </li>
                ))}
              </ul>
              {canUpdate && NEXT_STATUS[order.status] && (
                <button
                  type="button"
                  disabled={updatingId === order.id}
                  onClick={() => void advanceStatus(order)}
                  className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Mark as {STATUS_LABELS[NEXT_STATUS[order.status]!]}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link to="/orders" className="text-sm text-stone-600 hover:text-stone-900">
        ← My orders
      </Link>
    </div>
  );
}
