import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS, type Order } from '@intern/shared';
import {
  approveCashierPayment,
  collectCashPayment,
  fetchPaymentDesk,
} from '../services';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { QueuePageSkeleton } from '../components/ui';

export function PaymentsPage() {
  const { session, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_PAYMENTS);
  const token = session?.access_token;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const deskQuery = useQuery({
    queryKey: ['payments', 'desk', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchPaymentDesk(token!),
    staleTime: 5_000,
    placeholderData: (prev) => prev,
  });

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  if (deskQuery.isLoading && !deskQuery.data) {
    return <QueuePageSkeleton />;
  }

  const awaiting = deskQuery.data?.awaiting_chapa_validation ?? [];
  const openCash = deskQuery.data?.open_cash ?? [];
  const loadError =
    deskQuery.error instanceof Error ? deskQuery.error.message : error;

  async function approve(order: Order) {
    if (!token) return;
    setBusyId(order.id);
    setError(null);
    try {
      await approveCashierPayment(token, order.id);
      await queryClient.invalidateQueries({ queryKey: ['payments', 'desk'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', 'queue'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate payment');
    } finally {
      setBusyId(null);
    }
  }

  async function collect(order: Order) {
    if (!token) return;
    setBusyId(order.id);
    setError(null);
    try {
      await collectCashPayment(token, order.id);
      await queryClient.invalidateQueries({ queryKey: ['payments', 'desk'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark cash collected');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12 text-left sm:px-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
          Cashier
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)]">
          Payments desk
        </h1>
        <p className="mt-3 max-w-xl text-[var(--color-cream-muted)]">
          Validate Chapa payments before the kitchen starts, and record cash collected at the counter.
        </p>
      </header>

      {loadError && <p className="text-sm text-[#e8a0a0]">{loadError}</p>}

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
          Awaiting Chapa validation
        </h2>
        {awaiting.length === 0 ? (
          <p className="text-sm text-[var(--color-cream-muted)]">No online payments waiting.</p>
        ) : (
          <ul className="space-y-3">
            {awaiting.map((order) => (
              <li
                key={order.id}
                className="border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 text-sm text-[var(--color-cream-muted)]">
                    <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
                      Order #{order.id}
                    </p>
                    <p>{formatEtb(order.total)} · Chapa paid</p>
                    {order.user && (
                      <p>
                        {order.user.name ?? 'Guest'} · {order.user.email}
                      </p>
                    )}
                    <ul className="mt-2 space-y-0.5">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity}× {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void approve(order)}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                  >
                    Validate for kitchen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
          Open cash orders
        </h2>
        {openCash.length === 0 ? (
          <p className="text-sm text-[var(--color-cream-muted)]">No open cash tickets.</p>
        ) : (
          <ul className="space-y-3">
            {openCash.map((order) => (
              <li
                key={order.id}
                className="border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 text-sm text-[var(--color-cream-muted)]">
                    <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
                      Order #{order.id}
                    </p>
                    <p>
                      {formatEtb(order.total)} · {order.fulfillment_type === 'delivery' ? 'Delivery' : 'Dine-in'}
                    </p>
                    {order.user && (
                      <p>
                        {order.user.name ?? 'Guest'} · {order.user.email}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void collect(order)}
                    className="rounded-md border border-[var(--color-brass)]/40 px-4 py-2 text-sm font-medium text-[var(--color-brass)] disabled:opacity-60"
                  >
                    Mark cash collected
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        to="/orders"
        className="inline-block text-sm text-[var(--color-cream-muted)] hover:text-[var(--color-brass)]"
      >
        ← Orders
      </Link>
    </div>
  );
}
