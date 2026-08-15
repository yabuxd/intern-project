import { useEffect, useState } from 'react';
import type { Order, OrderStatus, PaymentStatus } from '@intern/shared';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { cancelOrder, fetchOrdersPage, updateOrderStatus, verifyOrderPayment } from '../services';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { OrdersPageSkeleton } from '../components/ui';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending acceptance',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  received: 'Received',
  cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]',
  accepted: 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]',
  preparing: 'bg-[var(--color-cream)]/10 text-[var(--color-cream)]',
  ready: 'bg-emerald-500/20 text-emerald-300',
  served: 'bg-[var(--color-umber)] text-[var(--color-cream-muted)]',
  out_for_delivery: 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]',
  delivered: 'bg-emerald-500/20 text-emerald-300',
  received: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-[var(--color-wine)]/25 text-[#e8a0a0]',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  not_required: 'Cash / later',
};

const CANCELLABLE: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'];

export function OrdersPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const token = session?.access_token;

  const ordersQuery = useInfiniteQuery({
    queryKey: ['orders', token],
    enabled: Boolean(token),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchOrdersPage(token!, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.meta?.has_more ? Number(lastPage.meta.next_cursor) : undefined,
  });

  useEffect(() => {
    if (!token) return;
    const orderIdRaw = searchParams.get('order_id');
    const txRef = searchParams.get('trx_ref') ?? searchParams.get('tx_ref');
    if (!orderIdRaw) return;
    const orderId = Number(orderIdRaw);
    if (!Number.isFinite(orderId)) return;

    let cancelled = false;
    void (async () => {
      try {
        await verifyOrderPayment(token, orderId, txRef);
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: ['orders'] });
          setSearchParams({}, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not verify payment');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, searchParams, queryClient, setSearchParams]);

  const orders: Order[] = ordersQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const loading = ordersQuery.isLoading;
  const loadError = ordersQuery.error instanceof Error ? ordersQuery.error.message : error;

  async function handleCancel(order: Order) {
    if (!session?.access_token || !CANCELLABLE.includes(order.status)) return;
    setCancellingId(order.id);
    setError(null);
    try {
      await cancelOrder(session.access_token, order.id);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  }

  async function handleConfirmReceived(order: Order) {
    if (!token || order.status !== 'delivered') return;
    setConfirmingId(order.id);
    setError(null);
    try {
      await updateOrderStatus(token, order.id, 'received');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm delivery');
    } finally {
      setConfirmingId(null);
    }
  }

  if (loading) {
    return <OrdersPageSkeleton />;
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
          Follow each plate from the kitchen — or confirm delivery when it arrives.
        </p>
      </header>

      {loadError && <p className="text-sm text-[#e8a0a0]">{loadError}</p>}

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
                <div className="space-y-1">
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                    Order #{order.id}
                  </p>
                  <p className="text-sm text-[var(--color-cream-muted)]">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                    {order.fulfillment_type === 'delivery'
                      ? ' · Delivery'
                      : order.table?.name
                        ? ` · ${order.table.name}`
                        : ''}
                  </p>
                  {order.fulfillment_type === 'delivery' && (
                    <>
                      <p className="text-sm text-[var(--color-cream)]">
                        Address: {order.delivery_address ?? '—'}
                      </p>
                      <p className="text-sm text-[var(--color-cream-muted)]">
                        Phone: {order.delivery_phone ?? '—'}
                      </p>
                      {order.delivery_notes && (
                        <p className="text-sm text-[var(--color-brass)]">
                          Notes: {order.delivery_notes}
                        </p>
                      )}
                      {order.driver && (
                        <p className="text-sm text-[var(--color-cream-muted)]">
                          Driver: {order.driver.name ?? order.driver.email}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--color-cream-muted)]">
                    {PAYMENT_LABELS[order.payment_status ?? 'not_required']}
                  </p>
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
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === 'delivered' && (
                  <button
                    type="button"
                    disabled={confirmingId === order.id}
                    onClick={() => void handleConfirmReceived(order)}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
                  >
                    {confirmingId === order.id ? 'Confirming…' : 'Confirm I received it'}
                  </button>
                )}
                {CANCELLABLE.includes(order.status) && (
                  <button
                    type="button"
                    disabled={cancellingId === order.id}
                    onClick={() => void handleCancel(order)}
                    className="rounded-md border border-[var(--color-wine)]/50 px-4 py-2 text-sm font-medium text-[#e8a0a0] transition hover:bg-[var(--color-wine)]/20 disabled:opacity-60"
                  >
                    Cancel order
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/menu"
        className="inline-block text-sm text-[var(--color-cream-muted)] transition hover:text-[var(--color-brass)]"
      >
        ← Back to menu
      </Link>
    </div>
  );
}
