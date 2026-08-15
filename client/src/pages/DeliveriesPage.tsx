import { useState } from 'react';
import type { Order, OrderStatus } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignOrderDriver,
  fetchDeliveries,
  fetchDeliveryDrivers,
  updateOrderStatus,
} from '../services';
import { useOrdersRealtime, DELIVERY_ORDERS_FILTER } from '../hooks/useOrdersRealtime';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { useOpsPaths } from '../utils/adminPaths';
import { QueuePageSkeleton } from '../components/ui';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting acceptance',
  ready: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered — await customer',
};

export function DeliveriesPage() {
  const { session, hasPermission } = useAuth();
  const ops = useOpsPaths();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_DELIVERIES);
  const canAccept = hasPermission(PERMISSIONS.CAN_ACCEPT_DELIVERY_ORDERS);
  const token = session?.access_token;

  const deliveriesQuery = useQuery({
    queryKey: ['orders', 'deliveries', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchDeliveries(token!),
    staleTime: 10_000,
  });

  const driversQuery = useQuery({
    queryKey: ['orders', 'delivery-drivers', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchDeliveryDrivers(token!),
    staleTime: 60_000,
  });

  useOrdersRealtime(() => {
    void queryClient.invalidateQueries({ queryKey: ['orders', 'deliveries'] });
  }, DELIVERY_ORDERS_FILTER);

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  const orders = deliveriesQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const loading = deliveriesQuery.isLoading || driversQuery.isLoading;
  const loadError =
    (deliveriesQuery.error instanceof Error && deliveriesQuery.error.message) ||
    (driversQuery.error instanceof Error && driversQuery.error.message) ||
    error;

  async function setStatus(order: Order, status: OrderStatus) {
    if (!token) return;
    setUpdatingId(order.id);
    setError(null);
    try {
      await updateOrderStatus(token, order.id, status);
      await queryClient.invalidateQueries({ queryKey: ['orders', 'deliveries'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', 'queue'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delivery');
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignDriver(order: Order, driverId: string) {
    if (!token || !driverId) return;
    setUpdatingId(order.id);
    setError(null);
    try {
      await assignOrderDriver(token, order.id, driverId);
      await queryClient.invalidateQueries({ queryKey: ['orders', 'deliveries'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign driver');
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
            Accept new delivery orders, assign a driver when the kitchen is ready, then track the run.
          </p>
        </header>
        <button
          type="button"
          onClick={() => {
            void deliveriesQuery.refetch();
            void driversQuery.refetch();
          }}
          className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm font-medium text-[var(--color-brass)] transition hover:bg-[var(--color-umber)]"
        >
          Refresh
        </button>
      </div>

      {loadError && <p className="text-sm text-[#e8a0a0]">{loadError}</p>}

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
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                    Order #{order.id}
                  </p>
                  <p className="text-sm text-[var(--color-cream-muted)]">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : '—'} ·{' '}
                    {formatEtb(order.total)}
                  </p>
                  {order.user && (
                    <p className="text-sm text-[var(--color-cream)]">
                      Customer: {order.user.name ?? 'Guest'} · {order.user.email}
                    </p>
                  )}
                  <p className="text-sm text-[var(--color-cream)]">
                    Address: {order.delivery_address ?? 'No address'}
                  </p>
                  <p className="text-sm text-[var(--color-cream-muted)]">
                    Phone: {order.delivery_phone ?? '—'}
                  </p>
                  {order.delivery_notes && (
                    <p className="text-sm text-[var(--color-brass)]">Notes: {order.delivery_notes}</p>
                  )}
                  {order.driver && (
                    <p className="text-sm text-[var(--color-cream-muted)]">
                      Driver: {order.driver.name ?? order.driver.email}
                    </p>
                  )}
                </div>
                <span className="border border-[var(--color-cream)]/20 bg-[var(--color-espresso)]/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-cream)]">
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5 border-t border-[var(--color-brass)]/15 pt-4 text-sm text-[var(--color-cream-muted)]">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span>
                      <span className="text-[var(--color-brass)]">{item.quantity}×</span>{' '}
                      {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                    </span>
                    <span className="text-[var(--color-cream)]">{formatEtb(item.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                {order.status === 'pending' && canAccept && (
                  <button
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => void setStatus(order, 'accepted')}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                  >
                    Accept order
                  </button>
                )}
                {order.status === 'pending' && !canAccept && (
                  <p className="text-sm text-[var(--color-brass)]">
                    Waiting for a manager or admin to accept this order.
                  </p>
                )}
                {order.status === 'ready' && (
                  <>
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
                    <button
                      type="button"
                      disabled={updatingId === order.id || !order.driver_id}
                      onClick={() => void setStatus(order, 'out_for_delivery')}
                      className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                    >
                      Start delivery
                    </button>
                  </>
                )}
                {order.status === 'out_for_delivery' && (
                  <button
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => void setStatus(order, 'delivered')}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                  >
                    Mark delivered
                  </button>
                )}
                {order.status === 'delivered' && (
                  <p className="text-sm text-[var(--color-brass)]">
                    Waiting for the customer to confirm they received the order.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        to={ops.queue}
        className="inline-block text-sm text-[var(--color-cream-muted)] transition hover:text-[var(--color-brass)]"
      >
        ← Kitchen queue
      </Link>
    </div>
  );
}
