import { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '@intern/shared';
import { Link } from 'react-router-dom';
import { fetchOrders } from '../services';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'text-amber-700',
  preparing: 'text-blue-700',
  ready: 'text-emerald-700',
  served: 'text-stone-600',
  cancelled: 'text-red-600',
};

export function OrdersPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!session?.access_token) return;
      try {
        const data = await fetchOrders(session.access_token);
        if (mounted) setOrders(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  if (loading) {
    return <p className="text-stone-600">Loading your orders…</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 text-left">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Your orders</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">
          Order history
        </h1>
        <p className="mt-2 text-stone-600">Track status of orders you have placed.</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-stone-600">No orders yet.</p>
          <Link
            to="/menu"
            className="mt-4 inline-block rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Browse menu
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">Order #{order.id}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : '—'}
                    {order.table?.name ? ` · ${order.table.name}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold uppercase ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </p>
                  <p className="mt-1 font-medium text-stone-800">{formatEtb(order.total)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1 border-t border-stone-100 pt-4 text-sm text-stone-700">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity}× {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                    </span>
                    <span>{formatEtb(item.line_total)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
