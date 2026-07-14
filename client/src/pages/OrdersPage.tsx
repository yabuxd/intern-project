import { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '@intern/shared';
import { Link } from 'react-router-dom';
import { cancelOrder, fetchOrders } from '../services';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]',
  preparing: 'bg-[var(--color-cream)]/10 text-[var(--color-cream)]',
  ready: 'bg-emerald-500/20 text-emerald-300',
  served: 'bg-[var(--color-umber)] text-[var(--color-cream-muted)]',
  cancelled: 'bg-[var(--color-wine)]/25 text-[#e8a0a0]',
};

const CANCELLABLE: OrderStatus[] = ['pending', 'preparing', 'ready'];

export function OrdersPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

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

  async function handleCancel(order: Order) {
    if (!session?.access_token || !CANCELLABLE.includes(order.status)) return;
    setCancellingId(order.id);
    setError(null);
    try {
      const updated = await cancelOrder(session.access_token, order.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <p className="px-6 py-16 text-center text-[var(--color-cream-muted)]">Fetching your orders…</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12 text-left sm:px-10">
      <header className="bistro-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
          Dining room
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)] sm:text-5xl">
          Your orders
        </h1>
        <p className="mt-3 max-w-md text-[var(--color-cream-muted)]">
          Follow each plate from the kitchen back to your table.
        </p>
      </header>

      {error && <p className="text-sm text-[#e8a0a0]">{error}</p>}

      {orders.length === 0 ? (
        <div className="border border-dashed border-[var(--color-brass)]/30 bg-[var(--color-umber)]/50 px-8 py-12 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
            No tickets yet
          </p>
          <p className="mt-2 text-sm text-[var(--color-cream-muted)]">
            Start with the menu — the kitchen is open tonight.
          </p>
          <Link
            to="/menu"
            className="mt-6 inline-block rounded-md bg-[var(--color-brass)] px-5 py-2.5 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)]"
          >
            Browse menu
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="border border-[var(--color-brass)]/15 bg-[var(--color-umber)] p-5 transition hover:border-[var(--color-brass)]/35"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                    Order #{order.id}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-cream-muted)]">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                    {order.table?.name ? ` · ${order.table.name}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <p className="mt-2 font-medium text-[var(--color-brass)]">{formatEtb(order.total)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-t border-[var(--color-brass)]/15 pt-4 text-sm text-[var(--color-cream-muted)]">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span>
                      {item.quantity}× {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                    </span>
                    <span className="text-[var(--color-cream)]">{formatEtb(item.line_total)}</span>
                  </li>
                ))}
              </ul>
              {CANCELLABLE.includes(order.status) && (
                <button
                  type="button"
                  disabled={cancellingId === order.id}
                  onClick={() => void handleCancel(order)}
                  className="mt-4 rounded-md border border-[var(--color-wine)]/50 px-4 py-2 text-sm font-medium text-[#e8a0a0] transition hover:bg-[var(--color-wine)]/20 disabled:opacity-60"
                >
                  {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
