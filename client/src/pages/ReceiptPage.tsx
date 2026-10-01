import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderReceipt } from '../services';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { OrdersPageSkeleton } from '../components/ui';

export function ReceiptPage() {
  const { orderId } = useParams();
  const { session } = useAuth();
  const id = Number(orderId);

  const receiptQuery = useQuery({
    queryKey: ['receipt', session?.access_token, id],
    enabled: Boolean(session?.access_token) && Number.isFinite(id),
    queryFn: () => fetchOrderReceipt(session!.access_token, id),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (receiptQuery.isLoading) {
    return <OrdersPageSkeleton />;
  }

  const receipt = receiptQuery.data;
  const error = receiptQuery.error instanceof Error ? receiptQuery.error.message : null;

  if (error || !receipt) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12 text-[var(--color-cream)]">
        <p className="text-[#e8a0a0]">{error ?? 'Receipt not found.'}</p>
        <Link to="/orders" className="mt-4 inline-block text-[var(--color-brass)]">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const order = receipt.order;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-6 py-12 text-left">
      <div className="print:hidden flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)]"
        >
          Print receipt
        </button>
        <Link
          to="/orders"
          className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm text-[var(--color-brass)]"
        >
          Back to orders
        </Link>
      </div>

      <article className="border border-[var(--color-brass)]/25 bg-[var(--color-umber)] p-6 text-[var(--color-cream)] print:border-black print:bg-white print:text-black">
        <header className="border-b border-[var(--color-brass)]/20 pb-4 print:border-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)] print:text-stone-600">
            Receipt
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            {receipt.receipt_number}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-cream-muted)] print:text-stone-600">
            Issued {new Date(receipt.issued_at).toLocaleString()}
          </p>
        </header>

        <div className="mt-4 space-y-1 text-sm">
          <p>Order #{order.id}</p>
          <p>
            {order.fulfillment_type === 'delivery' ? 'Delivery' : 'Dine-in'}
            {order.table?.name ? ` · ${order.table.name}` : ''}
          </p>
          <p>
            Payment:{' '}
            {order.payment_method === 'chapa' ? 'Chapa (online)' : 'Cash / later'} ·{' '}
            {order.payment_status}
          </p>
          {order.user && (
            <p>
              Customer: {order.user.name ?? 'Guest'} · {order.user.email}
            </p>
          )}
          {order.fulfillment_type === 'delivery' && (
            <>
              <p>Address: {order.delivery_address ?? '—'}</p>
              <p>Phone: {order.delivery_phone ?? '—'}</p>
            </>
          )}
        </div>

        <ul className="mt-6 space-y-2 border-t border-[var(--color-brass)]/20 pt-4 text-sm print:border-black/20">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.quantity}× {item.menu_item?.name ?? `Item #${item.menu_item_id}`}
              </span>
              <span>{formatEtb(item.line_total)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex justify-between border-t border-[var(--color-brass)]/20 pt-4 text-base font-semibold print:border-black/20">
          <span>Total</span>
          <span>{formatEtb(order.total)}</span>
        </p>
      </article>
    </div>
  );
}
