import { Link } from 'react-router-dom';
import { PERMISSIONS } from '@intern/shared';
import { useAuth } from '../store';

const FEATURED_DISHES = [
  { name: 'Doro Wat', image: '/images/menu/doro-wat.jpg', tag: 'Signature stew' },
  { name: 'Tibs', image: '/images/menu/tibs.jpg', tag: 'Sizzling plate' },
  { name: 'Kitfo', image: '/images/menu/kitfo.jpg', tag: 'House favorite' },
  { name: 'Sambusa', image: '/images/menu/sambusa.jpg', tag: 'Crisp starter' },
];

interface QuickLink {
  to: string;
  title: string;
  description: string;
}

function useQuickLinks(
  session: ReturnType<typeof useAuth>['session'],
  hasPermission: ReturnType<typeof useAuth>['hasPermission'],
): QuickLink[] {
  const canManageTables = hasPermission(PERMISSIONS.CAN_MANAGE_TABLES);
  const canViewQueue = hasPermission(PERMISSIONS.CAN_VIEW_ALL_ORDERS);
  const canPlaceOrder = hasPermission(PERMISSIONS.CAN_PLACE_ORDER);
  const canReserve = hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION);
  const canManagePermissions = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);
  const canManageMenu = hasPermission(PERMISSIONS.CAN_MANAGE_MENU);

  if (!session) return [];

  const links: QuickLink[] = [
    { to: '/menu', title: 'Browse menu', description: 'Traditional dishes from our kitchen' },
    { to: '/tables', title: 'View tables', description: 'See what is available now' },
  ];

  if (canReserve || canManageTables) {
    links.push({
      to: '/reservations',
      title: 'Reservations',
      description: 'Book a table or manage bookings',
    });
  }
  if (canPlaceOrder) {
    links.push({ to: '/orders', title: 'Your orders', description: 'Track and place orders' });
  }
  if (canViewQueue) {
    links.push({ to: '/orders/queue', title: 'Kitchen queue', description: 'Orders waiting to be served' });
  }
  if (canManageMenu) {
    links.push({ to: '/menu/manage', title: 'Manage menu', description: 'Update dishes and pricing' });
  }
  if (canManagePermissions) {
    links.push({
      to: '/admin/permissions',
      title: 'Permissions',
      description: 'Manage staff access',
    });
  }

  return links;
}

export function HomePage() {
  const { user, loading, session, error, hasPermission } = useAuth();
  const quickLinks = useQuickLinks(session, hasPermission);
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Guest';

  if (loading) {
    return <p className="text-stone-600">Loading session…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 text-left">
      <section className="relative overflow-hidden rounded-2xl bg-[var(--color-ink)] px-6 py-12 text-[var(--color-mist)] shadow-lg sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(194,164,107,0.35),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(46,110,84,0.4),transparent_70%)]"
        />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-brass)]">
            Ethiopian kitchen
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
            {session ? (
              <>
                Welcome back, <span className="italic text-[var(--color-brass)]">{displayName}</span>
              </>
            ) : (
              <>Flavors of Addis, served fresh</>
            )}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--color-mist)]/85 sm:text-lg">
            {session
              ? 'Explore our menu, reserve a table, or check on your order — everything you need is right here.'
              : 'Injera, berbere spice, and slow-cooked stews. Sign in to browse the menu, reserve a table, and place orders.'}
          </p>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          {!session ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-xl bg-[var(--color-brass)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-brass-deep)]"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-xl border border-[var(--color-mist)]/30 px-5 py-2.5 text-sm font-semibold text-[var(--color-mist)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
              >
                Create account
              </Link>
              <Link
                to="/menu"
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-[var(--color-mist)]/80 underline-offset-4 hover:text-[var(--color-brass)] hover:underline"
              >
                View menu
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="rounded-xl bg-[var(--color-brass)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-brass-deep)]"
              >
                Browse menu
              </Link>
              {(hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION) ||
                hasPermission(PERMISSIONS.CAN_MANAGE_TABLES)) && (
                <Link
                  to="/reservations"
                  className="rounded-xl border border-[var(--color-mist)]/30 px-5 py-2.5 text-sm font-semibold text-[var(--color-mist)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
                >
                  Reserve a table
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">From our kitchen</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900">
            Taste Ethiopia
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_DISHES.map((dish) => (
            <li
              key={dish.name}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="relative overflow-hidden">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-[var(--color-ink)]/75 px-2.5 py-0.5 text-xs font-medium text-[var(--color-mist)]">
                  {dish.tag}
                </span>
              </div>
              <p className="px-4 py-3 font-semibold text-stone-900">{dish.name}</p>
            </li>
          ))}
        </ul>
      </section>

      {session && quickLinks.length > 0 && (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Quick access</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900">
              Where to next?
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[var(--color-brass)] hover:shadow-md"
                >
                  <span className="font-semibold text-stone-900">{link.title}</span>
                  <span className="mt-1 text-sm text-stone-600">{link.description}</span>
                  <span className="mt-auto pt-4 text-sm font-medium text-[var(--color-brass-deep)]">
                    Go →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!session && (
        <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
            Ready to dine with us?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-stone-600">
            Create an account to place orders, reserve tables, and enjoy the full restaurant experience.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-800"
            >
              Sign in
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
