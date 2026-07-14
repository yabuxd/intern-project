import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PERMISSIONS } from '@intern/shared';
import { useAuth } from '../store';

interface AppLayoutProps {
  children: ReactNode;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium tracking-wide transition',
    isActive
      ? 'bg-[var(--color-brass)]/15 text-[var(--color-brass)]'
      : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]',
  ].join(' ');

export function AppLayout({ children }: AppLayoutProps) {
  const { session, user, signOut, loading, hasPermission } = useAuth();
  const canManageTables = hasPermission(PERMISSIONS.CAN_MANAGE_TABLES);
  const canViewQueue = hasPermission(PERMISSIONS.CAN_VIEW_ALL_ORDERS);
  const canPlaceOrder = hasPermission(PERMISSIONS.CAN_PLACE_ORDER);
  const canReserve = hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION);
  const canManagePermissions = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-espresso)] text-[var(--color-cream)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className="mr-2 shrink-0 font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-cream)] sm:mr-4 sm:text-2xl"
            >
              <span className="hidden sm:inline">Buna House</span>
              <span className="sm:hidden">Buna</span>
            </Link>
            <nav className="flex min-w-0 flex-wrap items-center gap-0.5 sm:gap-1">
              <NavLink to="/menu" className={navLinkClass}>
                Menu
              </NavLink>
              <NavLink to="/tables" className={navLinkClass}>
                Tables
              </NavLink>
              {session && (canReserve || canManageTables) && (
                <NavLink to="/reservations" className={navLinkClass}>
                  Reservations
                </NavLink>
              )}
              {session && canPlaceOrder && (
                <NavLink to="/orders" className={navLinkClass} end>
                  Orders
                </NavLink>
              )}
              {session && canViewQueue && (
                <NavLink to="/orders/queue" className={navLinkClass} end>
                  Queue
                </NavLink>
              )}
              {canManagePermissions && (
                <NavLink to="/admin/permissions" className={navLinkClass}>
                  Permissions
                </NavLink>
              )}
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
                  className="rounded-md bg-[var(--color-brass)] px-3.5 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)]"
                >
                  Sign up
                </Link>
              </>
            )}
            {!loading && session && (
              <>
                <span className="hidden max-w-[160px] truncate text-[var(--color-cream-muted)] lg:inline">
                  {user?.name ?? user?.email ?? 'Signed in'}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-md border border-[var(--color-brass)]/30 px-3.5 py-2 font-medium text-[var(--color-cream)] transition hover:border-[var(--color-brass)] hover:bg-[var(--color-umber)]"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
