import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { PERMISSIONS } from '@intern/shared';
import { useAuth } from '../store';
import { HeroSkeleton } from '../components/ui';
import {
  cancelPrefetch,
  debouncePrefetch,
  prefetchAdminDashboard,
  prefetchAdminRolesData,
  prefetchDeliveriesData,
  prefetchManageMenuData,
  prefetchOrderQueue,
  prefetchPaymentDeskData,
  prefetchReservationsData,
  prefetchTables,
} from '../services';

const sideLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-md px-3 py-3 text-base font-medium transition md:py-2 md:text-sm',
    isActive
      ? 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]'
      : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]',
  ].join(' ');

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/roles': 'Roles',
  '/admin/queue': 'Queue',
  '/admin/deliveries': 'Deliveries',
  '/admin/payments': 'Payments',
  '/admin/menu': 'Manage menu',
  '/admin/reservations': 'Reservations',
  '/admin/tables': 'Tables',
};

export function AdminLayout() {
  const { session, loading, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);
  const canViewQueue = hasPermission(PERMISSIONS.CAN_VIEW_ALL_ORDERS);
  const canManageDeliveries = hasPermission(PERMISSIONS.CAN_MANAGE_DELIVERIES);
  const canManagePayments = hasPermission(PERMISSIONS.CAN_MANAGE_PAYMENTS);
  const canManageMenu =
    hasPermission(PERMISSIONS.CAN_MANAGE_MENU) ||
    hasPermission(PERMISSIONS.CAN_PROPOSE_MENU_CHANGES);
  const canReserve =
    hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION) ||
    hasPermission(PERMISSIONS.CAN_MANAGE_TABLES);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Admin';

  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  if (loading) return <HeroSkeleton />;
  if (!canManage) return <Navigate to="/" replace />;

  const close = () => setSidebarOpen(false);
  const token = session?.access_token;

  const nav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Admin navigation">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
        Admin
      </p>
      <NavLink
        to="/admin"
        end
        className={sideLinkClass}
        onClick={close}
        onMouseEnter={() => debouncePrefetch(() => prefetchAdminDashboard(token))}
        onMouseLeave={cancelPrefetch}
        onFocus={() => prefetchAdminDashboard(token)}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/admin/roles"
        className={sideLinkClass}
        onClick={close}
        onMouseEnter={() => debouncePrefetch(() => prefetchAdminRolesData(token))}
        onMouseLeave={cancelPrefetch}
        onFocus={() => prefetchAdminRolesData(token)}
      >
        Roles
      </NavLink>

      <p className="mt-4 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
        Operations
      </p>
      {canViewQueue && (
        <NavLink
          to="/admin/queue"
          className={sideLinkClass}
          onClick={close}
          onMouseEnter={() => debouncePrefetch(() => prefetchOrderQueue(token))}
          onMouseLeave={cancelPrefetch}
          onFocus={() => prefetchOrderQueue(token)}
        >
          Queue
        </NavLink>
      )}
      {canManageDeliveries && (
        <NavLink
          to="/admin/deliveries"
          className={sideLinkClass}
          onClick={close}
          onMouseEnter={() => debouncePrefetch(() => prefetchDeliveriesData(token))}
          onMouseLeave={cancelPrefetch}
          onFocus={() => prefetchDeliveriesData(token)}
        >
          Deliveries
        </NavLink>
      )}
      {canManagePayments && (
        <NavLink
          to="/admin/payments"
          className={sideLinkClass}
          onClick={close}
          onMouseEnter={() => debouncePrefetch(() => prefetchPaymentDeskData(token))}
          onMouseLeave={cancelPrefetch}
          onFocus={() => prefetchPaymentDeskData(token)}
        >
          Payments
        </NavLink>
      )}
      {canManageMenu && (
        <NavLink
          to="/admin/menu"
          className={sideLinkClass}
          onClick={close}
          onMouseEnter={() => debouncePrefetch(() => prefetchManageMenuData(token))}
          onMouseLeave={cancelPrefetch}
          onFocus={() => prefetchManageMenuData(token)}
        >
          Manage menu
        </NavLink>
      )}
      {canReserve && (
        <NavLink
          to="/admin/reservations"
          className={sideLinkClass}
          onClick={close}
          onMouseEnter={() => debouncePrefetch(() => prefetchReservationsData(token))}
          onMouseLeave={cancelPrefetch}
          onFocus={() => prefetchReservationsData(token)}
        >
          Reservations
        </NavLink>
      )}
      <NavLink
        to="/admin/tables"
        className={sideLinkClass}
        onClick={close}
        onMouseEnter={() => debouncePrefetch(() => prefetchTables())}
        onMouseLeave={cancelPrefetch}
        onFocus={() => prefetchTables()}
      >
        Tables
      </NavLink>
    </nav>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-[var(--color-brass)]/15 bg-[var(--color-espresso)] md:block">
        {nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/95 px-3 py-2.5 backdrop-blur-md md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-brass)]/30 text-[var(--color-cream)]"
            aria-expanded={sidebarOpen}
            aria-controls="admin-mobile-nav"
            aria-label="Open admin menu"
          >
            <span className="flex flex-col gap-1.5" aria-hidden>
              <span className="h-0.5 w-5 bg-current" />
              <span className="h-0.5 w-5 bg-current" />
              <span className="h-0.5 w-5 bg-current" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brass)]">
              Admin
            </p>
            <p className="truncate text-sm font-medium text-[var(--color-cream)]">{pageTitle}</p>
          </div>
        </div>

        {/* Mobile horizontal shortcuts */}
        <div className="border-b border-[var(--color-brass)]/10 md:hidden">
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                [
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                  isActive
                    ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                    : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                ].join(' ')
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/roles"
              className={({ isActive }) =>
                [
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                  isActive
                    ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                    : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                ].join(' ')
              }
            >
              Roles
            </NavLink>
            {canViewQueue && (
              <NavLink
                to="/admin/queue"
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    isActive
                      ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                      : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                  ].join(' ')
                }
              >
                Queue
              </NavLink>
            )}
            {canManageDeliveries && (
              <NavLink
                to="/admin/deliveries"
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    isActive
                      ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                      : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                  ].join(' ')
                }
              >
                Deliveries
              </NavLink>
            )}
            {canManagePayments && (
              <NavLink
                to="/admin/payments"
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    isActive
                      ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                      : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                  ].join(' ')
                }
              >
                Payments
              </NavLink>
            )}
            {canManageMenu && (
              <NavLink
                to="/admin/menu"
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    isActive
                      ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                      : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                  ].join(' ')
                }
              >
                Menu
              </NavLink>
            )}
            {canReserve && (
              <NavLink
                to="/admin/reservations"
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    isActive
                      ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                      : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                  ].join(' ')
                }
              >
                Reservations
              </NavLink>
            )}
            <NavLink
              to="/admin/tables"
              className={({ isActive }) =>
                [
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                  isActive
                    ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                    : 'border border-[var(--color-brass)]/25 text-[var(--color-cream-muted)]',
                ].join(' ')
              }
            >
              Tables
            </NavLink>
          </div>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-[60] md:hidden" id="admin-mobile-nav">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close admin menu"
              onClick={close}
            />
            <aside className="absolute bottom-0 left-0 top-0 flex w-[min(20rem,88vw)] flex-col border-r border-[var(--color-brass)]/20 bg-[var(--color-espresso)] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--color-brass)]/15 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
                    Admin menu
                  </p>
                  <p className="text-sm text-[var(--color-cream)]">{pageTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-brass)]/30 text-[var(--color-cream)]"
                  aria-label="Close"
                >
                  <span aria-hidden className="text-lg leading-none">
                    ×
                  </span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">{nav}</div>
            </aside>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
