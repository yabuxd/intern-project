import { useEffect, useState } from 'react';
import type { MenuCategory } from '@intern/shared';
import { Link } from 'react-router-dom';
import { fetchMenu } from '../services';
import { useAuth } from '../store';
import { PERMISSIONS } from '@intern/shared';

function formatPrice(price: string | number): string {
  const value = typeof price === 'string' ? Number(price) : price;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
}

export function MenuPage() {
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_MENU);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await fetchMenu();
        if (mounted) setCategories(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <p className="text-stone-600">Loading menu…</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Browse</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">Menu</h1>
          <p className="mt-2 text-stone-600">Available dishes by category.</p>
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

      {categories.every((c) => c.items.length === 0) ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          No available items yet.
        </p>
      ) : (
        categories.map((category) =>
          category.items.length === 0 ? null : (
            <section key={category.id} className="space-y-4">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
                {category.name}
              </h2>
              <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                {category.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-semibold text-stone-900">{item.name}</p>
                      {item.description && (
                        <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-medium text-stone-800">{formatPrice(item.price)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )
      )}
    </div>
  );
}
