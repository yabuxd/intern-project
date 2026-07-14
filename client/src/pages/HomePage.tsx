import { Link } from 'react-router-dom';
import { PERMISSIONS } from '@intern/shared';
import { useAuth } from '../store';
import { HeroSkeleton } from '../components/ui';

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
    return <HeroSkeleton />;
  }

  return (
    <div className="w-full text-left">
      {/* Full-bleed hero */}
      <section className="relative min-h-[min(92vh,820px)] w-full overflow-hidden">
        <img
          src="/images/menu/doro-wat.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[var(--color-espresso)] via-[var(--color-espresso)]/88 to-[var(--color-espresso)]/45"
        />
        <div
          aria-hidden
          className="bistro-candle pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(200,133,58,0.28),transparent_70%)]"
        />
        <div
          aria-hidden
          className="bistro-candle pointer-events-none absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(138,46,46,0.22),transparent_70%)]"
          style={{ animationDelay: '2s' }}
        />

        <div className="relative z-10 mx-auto flex min-h-[min(92vh,820px)] max-w-6xl flex-col justify-center px-6 py-20 sm:px-10">
          <p className="bistro-fade-up font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-cream)] sm:text-5xl md:text-6xl">
            Buna House
          </p>
          <h1 className="bistro-fade-up-delay mt-5 max-w-xl font-[family-name:var(--font-display)] text-3xl italic leading-snug text-[var(--color-brass)] sm:text-4xl">
            {session ? (
              <>Welcome back, {displayName}</>
            ) : (
              <>Candlelight, injera, and a late tableside pour</>
            )}
          </h1>
          <p className="bistro-fade-up-delay-2 mt-4 max-w-md text-base leading-relaxed text-[var(--color-cream-muted)] sm:text-lg">
            {session
              ? 'Reserve a corner table, order from the kitchen, or settle into the evening service.'
              : 'An Ethiopian dining room after dark — berbere warmth, slow stews, and quiet wine.'}
          </p>
          {error && <p className="mt-3 text-sm text-[var(--color-wine)]">{error}</p>}
          <div className="bistro-fade-up-delay-2 mt-9 flex flex-wrap gap-3">
            {!session ? (
              <>
                <Link
                  to="/login"
                  className="rounded-md bg-[var(--color-brass)] px-6 py-3 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)]"
                >
                  Sign in
                </Link>
                <Link
                  to="/menu"
                  className="rounded-md border border-[var(--color-cream)]/25 px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
                >
                  View menu
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/menu"
                  className="rounded-md bg-[var(--color-brass)] px-6 py-3 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)]"
                >
                  Browse menu
                </Link>
                {(hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION) ||
                  hasPermission(PERMISSIONS.CAN_MANAGE_TABLES)) && (
                  <Link
                    to="/reservations"
                    className="rounded-md border border-[var(--color-cream)]/25 px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
                  >
                    Reserve a table
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Featured dishes */}
      <section className="mx-auto max-w-6xl space-y-8 px-6 py-16 sm:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            From the kitchen
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">
            Tonight’s favorites
          </h2>
          <p className="mt-2 max-w-lg text-[var(--color-cream-muted)]">
            Plates that belong with soft light and a long evening.
          </p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_DISHES.map((dish) => (
            <li key={dish.name} className="group overflow-hidden bg-[var(--color-umber)]">
              <div className="relative overflow-hidden">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute bottom-3 left-3 bg-[var(--color-wine)] px-2.5 py-0.5 text-xs font-medium tracking-wide text-[var(--color-cream)]">
                  {dish.tag}
                </span>
              </div>
              <p className="px-4 py-4 font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
                {dish.name}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {session && quickLinks.length > 0 && (
        <section className="border-t border-[var(--color-brass)]/15 bg-[var(--color-umber)]/40 px-6 py-16 sm:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
                Your evening
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
                Where to next?
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex h-full flex-col border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5 transition hover:border-[var(--color-brass)]/55 hover:bg-[var(--color-umber)]"
                  >
                    <span className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
                      {link.title}
                    </span>
                    <span className="mt-1 text-sm text-[var(--color-cream-muted)]">{link.description}</span>
                    <span className="mt-auto pt-4 text-sm font-medium text-[var(--color-brass)]">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!session && (
        <section className="border-t border-[var(--color-brass)]/15 px-6 py-16 sm:px-10">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
              Join the evening service
            </h2>
            <p className="mt-3 text-[var(--color-cream-muted)]">
              Create an account to reserve a table and place orders under candlelight.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/signup"
                className="rounded-md bg-[var(--color-wine)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:brightness-110"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-[var(--color-brass)]/35 px-6 py-3 text-sm font-semibold text-[var(--color-brass)] transition hover:border-[var(--color-brass)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
