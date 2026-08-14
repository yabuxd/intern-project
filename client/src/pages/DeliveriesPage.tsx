import { useCallback, useEffect, useState } from 'react';
import type { Order, OrderDriver, OrderStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { Link, Navigate } from 'react-router-dom';
import {
  assignOrderDriver,
  fetchDeliveries,
  fetchDeliveryDrivers,
  updateOrderStatus,
} from '../services';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { QueuePageSkeleton } from '../components/ui';
import { DeliveryMap } from '../components/DeliveryMap';

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

export function DeliveriesPage() {
  const { session, hasPermission } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<OrderDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_DELIVERIES);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const [deliveryData, driverData] = await Promise.all([
        fetchDeliveries(session.access_token),
        fetchDeliveryDrivers(session.access_token),
      ]);
      setOrders(deliveryData);
      setDrivers(driverData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliveries');
    }
  }, [session]);

  useOrdersRealtime(() => {
    void reload();
  });

  useEffect(() => {
    if (!session?.access_token || !canManage) {
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const [deliveryData, driverData] = await Promise.all([
          fetchDeliveries(session.access_token),
          fetchDeliveryDrivers(session.access_token),
        ]);
        if (mounted) {
          setOrders(deliveryData);
          setDrivers(driverData);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load deliveries');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session, canManage]);

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  async function assignDriver(order: Order, driverId: string) {
    if (!session?.access_token || !driverId) return;
    setUpdatingId(order.id);
    try {
      const updated = await assignOrderDriver(session.access_token, order.id, driverId);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign driver');
    } finally {
      setUpdatingId(null);
    }
  }

  async function advance(order: Order, status: OrderStatus) {
    if (!session?.access_token) return;
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(session.access_token, order.id, status);
      setOrders((prev) => {
        if (updated.status === 'delivered') {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delivery');
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
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            Courier
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)] sm:text-5xl">
            Deliveries
          </h1>
          <p className="mt-3 max-w-lg text-[var(--color-cream-muted)]">
            Assign a driver once the kitchen marks an order ready, then track it to the door.
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
          No delivery tickets waiting.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                    Order #{order.id}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-cream-muted)]">
                    {order.delivery_address ?? 'No address'}
                    {order.delivery_phone ? ` · ${order.delivery_phone}` : ''}
                  </p>
                  {order.delivery_address && (
                    <DeliveryMap address={order.delivery_address} className="mt-3 max-w-md" />
                  )}
                  {order.delivery_notes && (
                    <p className="mt-1 text-sm text-[var(--color-brass)]">{order.delivery_notes}</p>
                  )}
                  {order.user && (
                    <p className="mt-0.5 text-sm text-[var(--color-cream-muted)]">{order.user.email}</p>
                  )}
                  <p className="mt-2 text-sm text-[var(--color-cream)]">{formatEtb(order.total)}</p>
                </div>
                <span className="border border-[var(--color-cream)]/20 bg-[var(--color-espresso)]/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-cream)]">
                  {STATUS_LABELS[order.status] ?? order.status}
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
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <label className="text-sm text-[var(--color-cream-muted)]">
                  Driver
                  <select
                    value={order.driver_id ?? ''}
                    disabled={updatingId === order.id}
                    onChange={(e) => void assignDriver(order, e.target.value)}
                    className="mt-1 block min-w-48 rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-[var(--color-cream)]"
                  >
                    <option value="">Unassigned</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name ?? driver.email}
                      </option>
                    ))}
                  </select>
                </label>
                {order.status === 'ready' && order.driver_id && (
                  <button
                    type="button"
                    disabled={updatingId === order.id || !order.driver_id}
                    onClick={() => void advance(order, 'out_for_delivery')}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                  >
                    Out for delivery
                  </button>
                )}
                {order.status === 'out_for_delivery' && (
                  <button
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => void advance(order, 'delivered')}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                  >
                    Mark delivered
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/orders/queue"
        className="inline-block text-sm text-[var(--color-cream-muted)] transition hover:text-[var(--color-brass)]"
      >
        ← Kitchen queue
      </Link>
    </div>
  );
}
