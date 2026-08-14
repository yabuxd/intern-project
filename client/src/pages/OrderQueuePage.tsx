import { useCallback, useEffect, useState } from 'react';
import type { Order, OrderStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { Link, Navigate } from 'react-router-dom';
import { cancelOrder, fetchOrderQueue, updateOrderStatus } from '../services';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { QueuePageSkeleton } from '../components/ui';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

const CANCELLABLE: OrderStatus[] = ['pending', 'preparing', 'ready'];

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10',
  preparing: 'border-[var(--color-cream)]/25 bg-[var(--color-umber)]',
  ready: 'border-emerald-500/40 bg-emerald-500/10',
};

export function OrderQueuePage() {
  const { session, hasPermission } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const canView = hasPermission(PERMISSIONS.CAN_VIEW_ALL_ORDERS);
  const canUpdate = hasPermission(PERMISSIONS.CAN_UPDATE_ORDER_STATUS);
  const canManageDeliveries = hasPermission(PERMISSIONS.CAN_MANAGE_DELIVERIES);

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
    if (order.fulfillment_type === 'delivery' && order.status === 'ready') return;
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

  async function handleCancel(order: Order) {
    if (!session?.access_token || !canUpdate || !CANCELLABLE.includes(order.status)) return;

    setUpdatingId(order.id);
    try {
      await cancelOrder(session.access_token, order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <QueuePageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12 text-left sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="bistro-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            The pass
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)] sm:text-5xl">
            Kitchen queue
          </h1>
          <p className="mt-3 max-w-lg text-[var(--color-cream-muted)]">
            Live tickets for tonight — advance each order through the line.
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

      {error && <p className="text-sm text-[#e8a0a0]">{error}</p>}

      {orders.length === 0 ? (
        <p className="border border-dashed border-[var(--color-brass)]/30 bg-[var(--color-umber)]/40 px-8 py-12 text-center text-[var(--color-cream-muted)]">
          Quiet on the pass — no active tickets.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className={`border p-5 transition ${STATUS_STYLES[order.status] ?? 'border-[var(--color-brass)]/15 bg-[var(--color-umber)]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                    Order #{order.id}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-cream-muted)]">
                    {order.fulfillment_type === 'delivery'
                      ? `Delivery · ${order.delivery_address ?? 'Address pending'}`
                      : `${order.table?.name ?? 'No table'}`}{' '}
                    · {formatEtb(order.total)}
                  </p>
                  {order.user && (
                    <p className="mt-0.5 text-sm text-[var(--color-brass)]">{order.user.email}</p>
                  )}
                </div>
                <span className="border border-[var(--color-cream)]/20 bg-[var(--color-espresso)]/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-cream)]">
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5 border-t border-[var(--color-brass)]/15 pt-4 text-sm text-[var(--color-cream-muted)]">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span className="text-[var(--color-brass)]">{item.quantity}×</span>{' '}
                    {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                  </li>
                ))}
              </ul>
              {canUpdate && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {order.fulfillment_type === 'delivery' && order.status === 'ready' ? (
                    <p className="text-sm text-[var(--color-brass)]">
                      Ready for courier — open Deliveries to assign a driver.
                    </p>
                  ) : (
                    NEXT_STATUS[order.status] && (
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => void advanceStatus(order)}
                        className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
                      >
                        Mark as {STATUS_LABELS[NEXT_STATUS[order.status]!]}
                      </button>
                    )
                  )}
                  {CANCELLABLE.includes(order.status) && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => void handleCancel(order)}
                      className="rounded-md border border-[var(--color-wine)]/50 px-4 py-2 text-sm font-medium text-[#e8a0a0] transition hover:bg-[var(--color-wine)]/20 disabled:opacity-60"
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-4">
        <Link
          to="/orders"
          className="inline-block text-sm text-[var(--color-cream-muted)] transition hover:text-[var(--color-brass)]"
        >
          ← My orders
        </Link>
        {canManageDeliveries && (
          <Link
            to="/orders/deliveries"
            className="inline-block text-sm text-[var(--color-brass)] transition hover:underline"
          >
            Deliveries →
          </Link>
        )}
      </div>
    </div>
  );
}
