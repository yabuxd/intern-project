import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS, ROLES } from '@intern/shared';
import { fetchStaffNotifications, markStaffNotificationRead } from '../services';
import { useAuth } from '../store';

interface AppLayoutProps {
  children: ReactNode;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-md px-3 py-2 text-sm font-medium tracking-wide transition md:inline-block md:py-1.5',
    isActive
      ? 'bg-[var(--color-brass)]/15 text-[var(--color-brass)]'
      : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]',
  ].join(' ');

export function AppLayout({ children }: AppLayoutProps) {
  const { session, user, signOut, loading, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const canManageTables = hasPermission(PERMISSIONS.CAN_MANAGE_TABLES);
  const canViewQueue = hasPermission(PERMISSIONS.CAN_VIEW_ALL_ORDERS);
  const canReserve = hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION);
  const canManagePermissions = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);
  const canManageDeliveries = hasPermission(PERMISSIONS.CAN_MANAGE_DELIVERIES);
  const canManagePayments = hasPermission(PERMISSIONS.CAN_MANAGE_PAYMENTS);
  const canManageMenu =
    hasPermission(PERMISSIONS.CAN_MANAGE_MENU) ||
    hasPermission(PERMISSIONS.CAN_PROPOSE_MENU_CHANGES);
  const canSeeNotifications =
    Boolean(user?.roles?.includes(ROLES.ADMIN) || user?.roles?.includes(ROLES.MANAGER)) ||
    canManagePermissions;

  const notificationsQuery = useQuery({
    queryKey: ['notifications', session?.access_token],
    enabled: Boolean(session?.access_token) && canSeeNotifications,
    queryFn: () => fetchStaffNotifications(session!.access_token),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function markRead(id: number) {
    if (!session?.access_token) return;
    try {
      await markStaffNotificationRead(session.access_token, id);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // ignore
    }
  }

  const navLinks = (
    <>
      <NavLink to="/menu" className={navLinkClass} onClick={closeMenu}>
        Menu
      </NavLink>
      <NavLink to="/tables" className={navLinkClass} onClick={closeMenu}>
        Tables
      </NavLink>
      {session && (
        <NavLink to="/orders" className={navLinkClass} end onClick={closeMenu}>
          Orders
        </NavLink>
      )}
      {canManagePermissions ? (
        <NavLink to="/admin" className={navLinkClass} onClick={closeMenu}>
          Admin
        </NavLink>
      ) : (
        <>
          {session && (canReserve || canManageTables) && (
            <NavLink to="/reservations" className={navLinkClass} onClick={closeMenu}>
              Reservations
            </NavLink>
          )}
          {session && canViewQueue && (
            <NavLink to="/orders/queue" className={navLinkClass} end onClick={closeMenu}>
              Queue
            </NavLink>
          )}
          {session && canManageDeliveries && (
            <NavLink to="/orders/deliveries" className={navLinkClass} onClick={closeMenu}>
              Deliveries
            </NavLink>
          )}
          {session && canManagePayments && (
            <NavLink to="/payments" className={navLinkClass} onClick={closeMenu}>
              Payments
            </NavLink>
          )}
          {session && canManageMenu && (
            <NavLink to="/menu/manage" className={navLinkClass} onClick={closeMenu}>
              Manage menu
            </NavLink>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-espresso)] text-[var(--color-cream)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-brass)]/25 text-[var(--color-cream)] md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">Menu</span>
              <span className="flex flex-col gap-1.5" aria-hidden>
                <span
                  className={`h-0.5 w-5 bg-current transition ${menuOpen ? 'translate-y-2 rotate-45' : ''}`}
                />
                <span className={`h-0.5 w-5 bg-current transition ${menuOpen ? 'opacity-0' : ''}`} />
                <span
                  className={`h-0.5 w-5 bg-current transition ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`}
                />
              </span>
            </button>
            <Link
              to="/"
              className="shrink-0 font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-cream)] sm:text-2xl"
              onClick={closeMenu}
            >
              Buna House
            </Link>
            <nav className="ml-2 hidden min-w-0 flex-wrap items-center gap-0.5 md:flex md:gap-1">
              {navLinks}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm">
            {!loading && !session && (
              <>
                <Link
                  to="/login"
                  className="hidden font-medium text-[var(--color-cream-muted)] hover:text-[var(--color-brass)] sm:inline"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-md bg-[var(--color-brass)] px-3 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] sm:px-3.5"
                >
                  Sign up
                </Link>
              </>
            )}
            {!loading && session && (
              <>
                {canSeeNotifications && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotesOpen((open) => !open)}
                      className="relative rounded-md border border-[var(--color-brass)]/30 px-3 py-2 font-medium text-[var(--color-cream)]"
                      aria-label="Payment notifications"
                    >
                      Alerts
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-[var(--color-brass)] px-1.5 text-[10px] font-bold text-[var(--color-espresso)]">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    {notesOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] p-2 shadow-lg">
                        {notifications.length === 0 ? (
                          <p className="px-2 py-3 text-sm text-[var(--color-cream-muted)]">
                            No payment alerts yet.
                          </p>
                        ) : (
                          <ul className="max-h-80 space-y-1 overflow-y-auto">
                            {notifications.map((note) => (
                              <li key={note.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void markRead(note.id);
                                    setNotesOpen(false);
                                  }}
                                  className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                                    note.read_at
                                      ? 'text-[var(--color-cream-muted)]'
                                      : 'bg-[var(--color-umber)] text-[var(--color-cream)]'
                                  }`}
                                >
                                  <p className="font-medium">{note.title}</p>
                                  <p className="mt-0.5 text-xs opacity-80">{note.body}</p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          to="/payments"
                          onClick={() => setNotesOpen(false)}
                          className="mt-2 block border-t border-[var(--color-brass)]/20 px-2 pt-2 text-xs text-[var(--color-brass)]"
                        >
                          Open payments desk →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <span className="hidden max-w-[140px] truncate text-[var(--color-cream-muted)] lg:inline">
                  {user?.name ?? user?.email ?? 'Signed in'}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-md border border-[var(--color-brass)]/30 px-3 py-2 font-medium text-[var(--color-cream)] transition hover:border-[var(--color-brass)] hover:bg-[var(--color-umber)] sm:px-3.5"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-nav"
            className="border-t border-[var(--color-brass)]/15 bg-[var(--color-espresso)] px-4 py-4 md:hidden"
          >
            <nav className="flex flex-col gap-1">{navLinks}</nav>
            {!loading && !session && (
              <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-brass)]/15 pt-4 sm:hidden">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="rounded-md border border-[var(--color-brass)]/30 px-3 py-2 text-center text-sm font-medium"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
