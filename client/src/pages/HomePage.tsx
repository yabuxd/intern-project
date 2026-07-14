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

const EXPERIENCES = [
  {
    title: 'Browse the menu',
    description: 'Ethiopian classics from sambusa to misir wat, priced in ETB.',
    to: '/menu',
    cta: 'See menu',
  },
  {
    title: 'Reserve a table',
    description: 'Hold a seat for the evening — availability checked when you book.',
    to: '/reservations',
    cta: 'Book a table',
  },
  {
    title: 'Order & track',
    description: 'Place an order from your table and follow it through the kitchen.',
    to: '/orders',
    cta: 'Your orders',
  },
];

const HOURS = [
  { day: 'Monday – Thursday', time: '5:00 PM – 11:00 PM' },
  { day: 'Friday – Saturday', time: '5:00 PM – 12:30 AM' },
  { day: 'Sunday', time: '4:00 PM – 10:00 PM' },
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
      <section className="relative min-h-[min(88vh,760px)] w-full overflow-hidden">
        <img
          src="/images/menu/doro-wat.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[var(--color-espresso)] via-[var(--color-espresso)]/90 to-[var(--color-espresso)]/50"
        />
        <div
          aria-hidden
          className="bistro-candle pointer-events-none absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(200,133,58,0.28),transparent_70%)] sm:h-72 sm:w-72"
        />

        <div className="relative z-10 mx-auto flex min-h-[min(88vh,760px)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 md:px-10">
          <p className="bistro-fade-up font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-cream)] sm:text-5xl md:text-6xl">
            Buna House
          </p>
          <h1 className="bistro-fade-up-delay mt-4 max-w-xl font-[family-name:var(--font-display)] text-2xl italic leading-snug text-[var(--color-brass)] sm:mt-5 sm:text-3xl md:text-4xl">
            {session ? (
              <>Welcome back, {displayName}</>
            ) : (
              <>Candlelight, injera, and a late tableside pour</>
            )}
          </h1>
          <p className="bistro-fade-up-delay-2 mt-4 max-w-md text-sm leading-relaxed text-[var(--color-cream-muted)] sm:text-base md:text-lg">
            {session
              ? 'Reserve a corner table, order from the kitchen, or settle into the evening service.'
              : 'An Ethiopian dining room after dark — berbere warmth, slow stews, and quiet wine.'}
          </p>
          {error && <p className="mt-3 text-sm text-[#e8a0a0]">{error}</p>}
          <div className="bistro-fade-up-delay-2 mt-8 flex flex-wrap gap-3 sm:mt-9">
            {!session ? (
              <>
                <Link
                  to="/login"
                  className="rounded-md bg-[var(--color-brass)] px-5 py-3 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] sm:px-6"
                >
                  Sign in
                </Link>
                <Link
                  to="/menu"
                  className="rounded-md border border-[var(--color-cream)]/25 px-5 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] sm:px-6"
                >
                  View menu
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/menu"
                  className="rounded-md bg-[var(--color-brass)] px-5 py-3 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] sm:px-6"
                >
                  Browse menu
                </Link>
                {(hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION) ||
                  hasPermission(PERMISSIONS.CAN_MANAGE_TABLES)) && (
                  <Link
                    to="/reservations"
                    className="rounded-md border border-[var(--color-cream)]/25 px-5 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] sm:px-6"
                  >
                    Reserve a table
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:px-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
              Our house
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">
              Ethiopian hospitality, late-night mood
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-cream-muted)] sm:text-base">
              Buna House brings Addis flavors to a candlelit room — berbere, niter kibbeh, and bunna
              after dinner. Order from your seat, watch the kitchen pass, and keep the evening soft.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img
              src="/images/menu/kitfo.jpg"
              alt="Kitfo"
              className="h-36 w-full object-cover sm:h-44"
              loading="lazy"
            />
            <img
              src="/images/menu/tibs.jpg"
              alt="Tibs"
              className="mt-6 h-36 w-full object-cover sm:h-44"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--color-brass)]/15 bg-[var(--color-umber)]/35 px-4 py-14 sm:px-6 sm:py-16 md:px-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
              The evening flow
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
              Dine with us
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPERIENCES.map((item) => (
              <li
                key={item.title}
                className="flex h-full flex-col border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5"
              >
                <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-[var(--color-cream-muted)]">{item.description}</p>
                <Link
                  to={item.to}
                  className="mt-5 text-sm font-medium text-[var(--color-brass)] underline-offset-4 hover:underline"
                >
                  {item.cta} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured dishes */}
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-16 md:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            From the kitchen
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">
            Tonight’s favorites
          </h2>
          <p className="mt-2 max-w-lg text-sm text-[var(--color-cream-muted)] sm:text-base">
            Plates that belong with soft light and a long evening.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {FEATURED_DISHES.map((dish) => (
            <li key={dish.name} className="group overflow-hidden bg-[var(--color-umber)]">
              <div className="relative overflow-hidden">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="h-32 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-44"
                  loading="lazy"
                />
                <span className="absolute bottom-2 left-2 bg-[var(--color-wine)] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[var(--color-cream)] sm:bottom-3 sm:left-3 sm:px-2.5 sm:text-xs">
                  {dish.tag}
                </span>
              </div>
              <p className="px-3 py-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-cream)] sm:px-4 sm:py-4 sm:text-xl">
                {dish.name}
              </p>
            </li>
          ))}
        </ul>
        <Link
          to="/menu"
          className="inline-block text-sm font-medium text-[var(--color-brass)] underline-offset-4 hover:underline"
        >
          Full menu →
        </Link>
      </section>

      {/* Hours & visit */}
      <section className="border-t border-[var(--color-brass)]/15 px-4 py-14 sm:px-6 sm:py-16 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
              Hours
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
              When we’re open
            </h2>
            <ul className="mt-6 space-y-3">
              {HOURS.map((row) => (
                <li
                  key={row.day}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-brass)]/15 pb-3 text-sm"
                >
                  <span className="text-[var(--color-cream)]">{row.day}</span>
                  <span className="text-[var(--color-cream-muted)]">{row.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
              Visit
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
              Find the room
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-cream-muted)] sm:text-base">
              Bole Road, near Meskel Square
              <br />
              Addis Ababa, Ethiopia
            </p>
            <p className="mt-4 text-sm text-[var(--color-cream-muted)]">
              Reservations recommended on weekends.
            </p>
            <Link
              to="/tables"
              className="mt-6 inline-block text-sm font-medium text-[var(--color-brass)] underline-offset-4 hover:underline"
            >
              See live table status →
            </Link>
          </div>
        </div>
      </section>

      {session && quickLinks.length > 0 && (
        <section className="border-t border-[var(--color-brass)]/15 bg-[var(--color-umber)]/40 px-4 py-14 sm:px-6 sm:py-16 md:px-10">
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
                    className="flex h-full flex-col border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5 transition hover:border-[var(--color-brass)]/55"
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
        <section className="border-t border-[var(--color-brass)]/15 px-4 py-14 sm:px-6 sm:py-16 md:px-10">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
              Join the evening service
            </h2>
            <p className="mt-3 text-sm text-[var(--color-cream-muted)] sm:text-base">
              Create an account to reserve a table and place orders under candlelight.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
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

      <footer className="border-t border-[var(--color-brass)]/20 bg-[var(--color-espresso)] px-4 py-12 sm:px-6 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
              Buna House
            </p>
            <p className="mt-3 max-w-xs text-sm text-[var(--color-cream-muted)]">
              Late-night Ethiopian dining — tables, orders, and kitchen service in one house.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
              Explore
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-cream-muted)]">
              <li>
                <Link to="/menu" className="hover:text-[var(--color-brass)]">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/tables" className="hover:text-[var(--color-brass)]">
                  Tables
                </Link>
              </li>
              <li>
                <Link to="/reservations" className="hover:text-[var(--color-brass)]">
                  Reservations
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
              Account
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-cream-muted)]">
              <li>
                <Link to="/login" className="hover:text-[var(--color-brass)]">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[var(--color-brass)]">
                  Sign up
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[var(--color-brass)]">
                  Orders
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
              Contact
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-cream-muted)]">
              <li>Bole Road, Addis Ababa</li>
              <li>
                <a href="mailto:hello@bunahouse.et" className="hover:text-[var(--color-brass)]">
                  hello@bunahouse.et
                </a>
              </li>
              <li>+251 11 000 0000</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-[var(--color-brass)]/15 pt-6 text-xs text-[var(--color-cream-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Buna House. All rights reserved.</p>
          <p>Open for dinner · Reservations encouraged</p>
        </div>
      </footer>
    </div>
  );
}
