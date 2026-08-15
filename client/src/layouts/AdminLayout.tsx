import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { PERMISSIONS } from '@intern/shared';
import { useAuth } from '../store';
import { HeroSkeleton } from '../components/ui';

const sideLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-md px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]'
      : 'text-[var(--color-cream-muted)] hover:bg-[var(--color-umber)] hover:text-[var(--color-cream)]',
  ].join(' ');

export function AdminLayout() {
  const { loading, hasPermission } = useAuth();
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

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  if (loading) return <HeroSkeleton />;
  if (!canManage) return <Navigate to="/" replace />;

  const close = () => setSidebarOpen(false);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
        Admin
      </p>
      <NavLink to="/admin" end className={sideLinkClass} onClick={close}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/roles" className={sideLinkClass} onClick={close}>
        Roles
      </NavLink>

      <p className="mt-4 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
        Operations
      </p>
      {canViewQueue && (
        <NavLink to="/admin/queue" className={sideLinkClass} onClick={close}>
          Queue
        </NavLink>
      )}
      {canManageDeliveries && (
        <NavLink to="/admin/deliveries" className={sideLinkClass} onClick={close}>
          Deliveries
        </NavLink>
      )}
      {canManagePayments && (
        <NavLink to="/admin/payments" className={sideLinkClass} onClick={close}>
          Payments
        </NavLink>
      )}
      {canManageMenu && (
        <NavLink to="/admin/menu" className={sideLinkClass} onClick={close}>
          Manage menu
        </NavLink>
      )}
      {canReserve && (
        <NavLink to="/admin/reservations" className={sideLinkClass} onClick={close}>
          Reservations
        </NavLink>
      )}
      <NavLink to="/admin/tables" className={sideLinkClass} onClick={close}>
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
        <div className="flex items-center gap-3 border-b border-[var(--color-brass)]/15 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md border border-[var(--color-brass)]/30 px-3 py-1.5 text-sm text-[var(--color-cream)]"
          >
            Admin menu
          </button>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close sidebar"
              onClick={close}
            />
            <aside className="absolute left-0 top-0 h-full w-64 overflow-y-auto border-r border-[var(--color-brass)]/15 bg-[var(--color-espresso)] shadow-xl">
              <div className="flex justify-end p-3">
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-[var(--color-cream-muted)]"
                >
                  Close
                </button>
              </div>
              {nav}
            </aside>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
