import { useMemo, useState } from 'react';
import type { FulfillmentType, MenuItem } from '@intern/shared';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createOrder, fetchMenu, fetchTables } from '../services';
import { useAuth } from '../store';
import { PERMISSIONS } from '@intern/shared';
import { formatEtb } from '../utils/format';
import { MenuSkeleton } from '../components/ui';
import { DeliveryMap } from '../components/DeliveryMap';

interface CartLine {
  item: MenuItem;
  quantity: number;
}

export function MenuPage() {
  const navigate = useNavigate();
  const { session, hasPermission } = useAuth();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableId, setTableId] = useState<number | ''>('');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('dine_in');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const canManage =
    hasPermission(PERMISSIONS.CAN_MANAGE_MENU) ||
    hasPermission(PERMISSIONS.CAN_PROPOSE_MENU_CHANGES);
  const menuQuery = useQuery({ queryKey: ['menu'], queryFn: fetchMenu, staleTime: 60_000 });
  const tablesQuery = useQuery({ queryKey: ['tables'], queryFn: fetchTables, staleTime: 15_000 });
  const categories = menuQuery.data ?? [];
  const tables = tablesQuery.data ?? [];
  const loading = menuQuery.isLoading || tablesQuery.isLoading;
  const error = menuQuery.error instanceof Error
    ? menuQuery.error.message
    : tablesQuery.error instanceof Error
      ? tablesQuery.error.message
      : null;

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const price = typeof line.item.price === 'string' ? Number(line.item.price) : line.item.price;
        return sum + price * line.quantity;
      }, 0),
    [cart],
  );

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }

  function updateQuantity(itemId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.item.id === itemId ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  async function checkout() {
    if (!session?.access_token || cart.length === 0) return;
    if (fulfillment === 'delivery') {
      if (!deliveryAddress.trim() || !deliveryPhone.trim()) {
        setCheckoutError('Delivery needs an address and phone number.');
        return;
      }
    }
    setPlacing(true);
    setCheckoutError(null);
    try {
      await createOrder(session.access_token, {
        items: cart.map((line) => ({
          menu_item_id: line.item.id,
          quantity: line.quantity,
        })),
        fulfillment_type: fulfillment,
        table_id: fulfillment === 'dine_in' && tableId !== '' ? tableId : null,
        delivery_address: fulfillment === 'delivery' ? deliveryAddress.trim() : null,
        delivery_phone: fulfillment === 'delivery' ? deliveryPhone.trim() : null,
        delivery_notes: fulfillment === 'delivery' ? deliveryNotes.trim() || null : null,
      });
      setCart([]);
      setTableId('');
      setDeliveryAddress('');
      setDeliveryPhone('');
      setDeliveryNotes('');
      navigate('/orders');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 text-left sm:space-y-10 sm:px-6 sm:py-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            Ethiopian kitchen
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">
            Menu
          </h1>
          <p className="mt-2 text-sm text-[var(--color-cream-muted)] sm:text-base">
            Traditional dishes, from sambusa to doro wat.
          </p>
        </div>
        {canManage && (
          <Link
            to="/menu/manage"
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Manage menu
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {categories.every((c) => c.items.length === 0) ? (
            <p className="rounded-xl border border-dashed border-[var(--color-brass)]/30 bg-[var(--color-umber)]/40 p-8 text-center text-[var(--color-cream-muted)]">
              No available items yet.
            </p>
          ) : (
            categories.map((category) =>
              category.items.length === 0 ? null : (
                <section key={category.id} className="space-y-4">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
                    {category.name}
                  </h2>
                  <ul className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {category.items.map((item) => (
                      <li
                        key={item.id}
                        className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm sm:rounded-2xl"
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-24 w-full object-cover sm:h-40 md:h-44"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center bg-stone-100 text-xs text-stone-500 sm:h-40 sm:text-sm md:h-44">
                            No photo
                          </div>
                        )}
                        <div className="p-2.5 sm:p-4">
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug text-stone-900 sm:text-base">
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <p className="shrink-0 text-xs font-medium text-stone-800 sm:text-sm">
                              {formatEtb(item.price)}
                            </p>
                          </div>
                          {session && (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="mt-2 w-full rounded-lg border border-stone-300 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 sm:mt-3 sm:rounded-xl sm:py-2 sm:text-sm"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">Cart</h2>
          {!session ? (
            <p className="mt-3 text-sm text-stone-600">
              <Link to="/login" className="font-medium text-stone-900 underline">
                Sign in
              </Link>{' '}
              to place an order.
            </p>
          ) : cart.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">Your cart is empty.</p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {cart.map((line) => (
                  <li key={line.item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 text-stone-800">{line.item.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.item.id, -1)}
                        className="h-7 w-7 rounded border border-stone-300 text-stone-700"
                      >
                        −
                      </button>
                      <span className="w-5 text-center">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.item.id, 1)}
                        className="h-7 w-7 rounded border border-stone-300 text-stone-700"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-semibold text-stone-900">{formatEtb(cartTotal)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setFulfillment('dine_in')}
                  className={`rounded-lg border py-2 font-medium ${
                    fulfillment === 'dine_in'
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-800'
                  }`}
                >
                  Dine-in
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillment('delivery')}
                  className={`rounded-lg border py-2 font-medium ${
                    fulfillment === 'delivery'
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-800'
                  }`}
                >
                  Delivery
                </button>
              </div>
              {fulfillment === 'dine_in' ? (
                <label className="mt-4 block text-sm text-stone-600">
                  Table (optional)
                  <select
                    value={tableId}
                    onChange={(e) =>
                      setTableId(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                  >
                    <option value="">No table</option>
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-stone-600">
                    Address
                    <input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                      placeholder="Street, neighborhood, Addis Ababa"
                    />
                  </label>
                  <DeliveryMap address={deliveryAddress} compact className="rounded-lg" />
                  <label className="block text-sm text-stone-600">
                    Phone
                    <input
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                      placeholder="+251…"
                    />
                  </label>
                  <label className="block text-sm text-stone-600">
                    Notes (optional)
                    <input
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                      placeholder="Gate code, landmark…"
                    />
                  </label>
                </div>
              )}
              {checkoutError && <p className="mt-2 text-sm text-red-600">{checkoutError}</p>}
              <button
                type="button"
                disabled={placing}
                onClick={() => void checkout()}
                className="mt-4 w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {placing ? 'Placing…' : 'Place order'}
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
