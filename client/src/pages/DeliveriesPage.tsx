import { useMemo, useState } from 'react';
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

type DeliveryTab = 'all' | 'active' | 'awaiting_customer' | 'prep' | 'completed';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeClass: string; step: number }
> = {
  pending: {
    label: 'Pending Acceptance',
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    step: 0,
  },
  accepted: {
    label: 'Accepted / Queued',
    badgeClass: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    step: 1,
  },
  preparing: {
    label: 'Kitchen Preparing',
    badgeClass: 'border-[var(--color-cream)]/30 bg-[var(--color-umber)] text-[var(--color-cream)]',
    step: 1,
  },
  ready: {
    label: 'Ready for Pickup',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    step: 2,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    badgeClass: 'border-[var(--color-brass)]/50 bg-[var(--color-brass)]/20 text-[var(--color-brass)]',
    step: 3,
  },
  delivered: {
    label: 'Delivered (Courier Validated)',
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-200',
    step: 4,
  },
  received: {
    label: 'Dual-Validated & Completed',
    badgeClass: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200 font-semibold',
    step: 5,
  },
  served: {
    label: 'Served',
    badgeClass: 'border-stone-500/40 bg-stone-500/10 text-stone-300',
    step: 5,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'border-red-500/40 bg-red-500/15 text-[#e8a0a0]',
    step: -1,
  },
};

export function DeliveriesPage() {
  const { session, hasPermission } = useAuth();
  const ops = useOpsPaths();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DeliveryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    placeholderData: (prev) => prev,
  });

  const driversQuery = useQuery({
    queryKey: ['orders', 'delivery-drivers', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchDeliveryDrivers(token!),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  useOrdersRealtime(() => {
    void queryClient.invalidateQueries({ queryKey: ['orders', 'deliveries'] });
  }, DELIVERY_ORDERS_FILTER);

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  const allOrders = deliveriesQuery.data ?? [];
  const couriers = driversQuery.data ?? [];
  const loading = deliveriesQuery.isLoading && allOrders.length === 0;
  const loadError =
    (deliveriesQuery.error instanceof Error && deliveriesQuery.error.message) ||
    (driversQuery.error instanceof Error && driversQuery.error.message) ||
    error;

  const filteredOrders = useMemo(() => {
    let list = allOrders;

    if (activeTab === 'active') {
      list = list.filter((o) => ['ready', 'out_for_delivery'].includes(o.status));
    } else if (activeTab === 'awaiting_customer') {
      list = list.filter((o) => o.status === 'delivered');
    } else if (activeTab === 'prep') {
      list = list.filter((o) => ['pending', 'accepted', 'preparing'].includes(o.status));
    } else if (activeTab === 'completed') {
      list = list.filter((o) => ['received', 'served'].includes(o.status));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          o.user?.name?.toLowerCase().includes(q) ||
          o.user?.email.toLowerCase().includes(q) ||
          o.delivery_address?.toLowerCase().includes(q) ||
          o.delivery_phone?.includes(q) ||
          o.driver?.name?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [allOrders, activeTab, searchQuery]);

  const counts = useMemo(
    () => ({
      all: allOrders.length,
      active: allOrders.filter((o) => ['ready', 'out_for_delivery'].includes(o.status)).length,
      awaiting_customer: allOrders.filter((o) => o.status === 'delivered').length,
      prep: allOrders.filter((o) => ['pending', 'accepted', 'preparing'].includes(o.status)).length,
      completed: allOrders.filter((o) => ['received', 'served'].includes(o.status)).length,
    }),
    [allOrders],
  );

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

  async function assignCourier(order: Order, courierId: string) {
    if (!token || !courierId) return;
    setUpdatingId(order.id);
    setError(null);
    try {
      await assignOrderDriver(token, order.id, courierId);
      await queryClient.invalidateQueries({ queryKey: ['orders', 'deliveries'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign delivery courier');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <QueuePageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 text-left sm:px-6 sm:py-12 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            Courier & Logistics
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl md:text-5xl">
            Deliveries
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-cream-muted)] sm:text-base">
            Accept delivery orders, assign couriers, monitor active routes, and track dual-validated customer drop-offs.
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

      {loadError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-[#e8a0a0]">
          {loadError}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-brass)]/20 pb-4">
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'all'
                ? 'bg-[var(--color-brass)] text-[var(--color-espresso)] font-semibold'
                : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]'
            }`}
          >
            All Tickets ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'active'
                ? 'bg-[var(--color-brass)] text-[var(--color-espresso)] font-semibold'
                : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]'
            }`}
          >
            Active Runs ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('awaiting_customer')}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'awaiting_customer'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]'
            }`}
          >
            Awaiting Customer ({counts.awaiting_customer})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prep')}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'prep'
                ? 'bg-[var(--color-brass)] text-[var(--color-espresso)] font-semibold'
                : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]'
            }`}
          >
            In Prep ({counts.prep})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'completed'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]'
            }`}
          >
            Validated ({counts.completed})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, phone…"
            className="w-full rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-1.5 text-xs sm:text-sm text-[var(--color-cream)] placeholder-[var(--color-cream-muted)]/50 focus:border-[var(--color-brass)] focus:outline-none"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-brass)]/30 bg-[var(--color-umber)]/40 px-8 py-16 text-center text-[var(--color-cream-muted)]">
          <p className="text-base font-medium text-[var(--color-cream)]">No delivery orders found</p>
          <p className="mt-1 text-sm">No delivery tickets match the selected filter or search criteria.</p>
        </div>
      ) : (
        <ul className="space-y-6">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] ?? {
              label: order.status,
              badgeClass: 'border-stone-500/40 bg-stone-500/10 text-stone-300',
              step: 0,
            };
            const isDeliveredAwaitingCustomer = order.status === 'delivered';
            const isDualValidated = order.status === 'received';

            return (
              <li
                key={order.id}
                className="overflow-hidden rounded-xl border border-[var(--color-brass)]/20 bg-[var(--color-umber)] shadow-lg transition hover:border-[var(--color-brass)]/40"
              >
                {/* Order Top Bar */}
                <div className="border-b border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/60 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                      Order #{order.id}
                    </span>
                    <span className="rounded border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-brass)]">
                      Delivery
                    </span>
                    <span
                      className={`rounded border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
                        order.payment_status === 'paid'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {order.payment_method === 'chapa'
                        ? order.payment_status === 'paid'
                          ? 'Chapa Online (Paid)'
                          : 'Chapa (Pending Payment)'
                        : 'Cash on Delivery'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${config.badgeClass}`}>
                      {config.label}
                    </span>
                    <span className="font-semibold text-lg text-[var(--color-brass)]">
                      {formatEtb(order.total)}
                    </span>
                  </div>
                </div>

                {/* Dual-Validation Tracker Banner */}
                <div className="border-b border-[var(--color-brass)]/10 bg-[var(--color-espresso)]/30 px-5 py-3 text-xs sm:text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-brass)]">Delivery Lifecycle:</span>
                      <span className="text-[var(--color-cream-muted)]">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                      </span>
                    </div>

                    {isDeliveredAwaitingCustomer && (
                      <div className="flex items-center gap-2 text-purple-300 font-medium bg-purple-950/50 border border-purple-500/30 rounded px-2.5 py-1">
                        <span>✓ Step 1: Courier marked delivered</span>
                        <span className="text-purple-400">·</span>
                        <span className="animate-pulse">Waiting for Customer Confirmation (Step 2)</span>
                      </div>
                    )}

                    {isDualValidated && (
                      <div className="flex items-center gap-2 text-emerald-300 font-medium bg-emerald-950/50 border border-emerald-500/30 rounded px-2.5 py-1">
                        <span>✓ Dual-Validated: Courier drop-off & Customer receipt confirmed</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Body: Customer Info, Destination, Notes & Courier */}
                <div className="grid gap-6 p-5 md:grid-cols-2">
                  {/* Left Column: Customer & Address Information */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brass)]">
                        Customer & Contact
                      </h4>
                      <p className="mt-1 font-medium text-[var(--color-cream)]">
                        {order.user?.name ?? 'Customer'}
                      </p>
                      <p className="text-xs text-[var(--color-cream-muted)]">{order.user?.email}</p>
                      {order.delivery_phone ? (
                        <p className="mt-1 text-sm">
                          <span className="text-[var(--color-cream-muted)]">Phone: </span>
                          <a
                            href={`tel:${order.delivery_phone}`}
                            className="font-medium text-[var(--color-brass)] underline hover:text-[var(--color-cream)]"
                          >
                            {order.delivery_phone}
                          </a>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--color-cream-muted)]">No phone specified</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/40 p-3.5 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brass)]">
                        Delivery Destination
                      </h4>
                      <p className="text-sm font-medium leading-relaxed text-[var(--color-cream)]">
                        {order.delivery_address || 'Address not specified'}
                      </p>
                      {order.delivery_notes && (
                        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                          <span className="font-semibold text-amber-300">Instructions: </span>
                          {order.delivery_notes}
                        </div>
                      )}
                    </div>

                    {/* Assigned Courier Card */}
                    <div className="rounded-lg border border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/40 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brass)]">
                            Assigned Courier
                          </h4>
                          {order.driver ? (
                            <p className="mt-1 text-sm font-medium text-[var(--color-cream)]">
                              {order.driver.name ?? order.driver.email}
                              <span className="ml-2 text-xs text-[var(--color-cream-muted)]">
                                ({order.driver.email})
                              </span>
                            </p>
                          ) : (
                            <p className="mt-1 text-xs font-medium text-amber-300">
                              No courier assigned yet
                            </p>
                          )}
                        </div>

                        {/* Courier Re-assignment Selector */}
                        {['pending', 'accepted', 'preparing', 'ready'].includes(order.status) && (
                          <div className="min-w-44">
                            <select
                              value={order.driver_id ?? ''}
                              disabled={updatingId === order.id}
                              onChange={(e) => void assignCourier(order, e.target.value)}
                              className="w-full rounded border border-[var(--color-brass)]/30 bg-[var(--color-espresso)] px-2.5 py-1 text-xs text-[var(--color-cream)]"
                            >
                              <option value="">Choose courier…</option>
                              {couriers.map((courier) => (
                                <option key={courier.id} value={courier.id}>
                                  {courier.name ?? courier.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Ordered Items Breakdown */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brass)]">
                        Ordered Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
                      </h4>
                      <ul className="divide-y divide-[var(--color-brass)]/15 rounded-lg border border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/40 px-3.5 py-1">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-[var(--color-brass)]">
                                {item.quantity}×
                              </span>{' '}
                              <span className="font-medium text-[var(--color-cream)]">
                                {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                              </span>
                              <p className="text-xs text-[var(--color-cream-muted)]">
                                Unit: {formatEtb(item.unit_price)}
                              </p>
                            </div>
                            <span className="shrink-0 font-medium text-[var(--color-cream)]">
                              {formatEtb(item.line_total)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between px-2 text-sm font-semibold text-[var(--color-cream)]">
                        <span>Total</span>
                        <span className="text-[var(--color-brass)]">{formatEtb(order.total)}</span>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-brass)]/15 pt-4">
                      {order.status === 'pending' && canAccept && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => void setStatus(order, 'accepted')}
                          className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
                        >
                          Accept delivery order
                        </button>
                      )}

                      {order.status === 'pending' && !canAccept && (
                        <p className="text-xs text-[var(--color-brass)]">
                          Waiting for manager approval to accept.
                        </p>
                      )}

                      {order.status === 'accepted' && (
                        <span className="text-xs text-[var(--color-cream-muted)]">
                          Accepted · Order sent to kitchen queue.
                        </span>
                      )}

                      {order.status === 'preparing' && (
                        <span className="text-xs text-[var(--color-cream-muted)]">
                          Kitchen is currently preparing dishes.
                        </span>
                      )}

                      {order.status === 'ready' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id || !order.driver_id}
                          onClick={() => void setStatus(order, 'out_for_delivery')}
                          className="rounded-md bg-[var(--color-brass)] px-5 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
                        >
                          {order.driver_id ? 'Start delivery run' : 'Assign courier first'}
                        </button>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => void setStatus(order, 'delivered')}
                          className="rounded-md bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                        >
                          {updatingId === order.id ? 'Updating…' : '✓ Mark Delivered (Courier Validation)'}
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-purple-300">
                            Awaiting customer receipt confirmation.
                          </span>
                          <button
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => void setStatus(order, 'received')}
                            className="rounded-md border border-[var(--color-brass)]/40 px-3 py-1.5 text-xs font-medium text-[var(--color-brass)] transition hover:bg-[var(--color-umber)]"
                          >
                            Manual confirm receipt (Manager override)
                          </button>
                        </div>
                      )}

                      {order.status === 'received' && (
                        <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span>Complete · Dual-validated by courier and customer.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-4">
        <Link
          to={ops.queue}
          className="inline-block text-sm text-[var(--color-cream-muted)] transition hover:text-[var(--color-brass)]"
        >
          ← Go to kitchen queue
        </Link>
      </div>
    </div>
  );
}
