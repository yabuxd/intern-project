import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS } from '@intern/shared';
import { fetchAdminDashboard } from '../services';
import { useAuth } from '../store';
import { formatEtb } from '../utils/format';
import { AdminPageSkeleton } from '../components/ui';

type RangePreset = '7d' | '30d' | 'custom';

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function endOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

function BarList({
  items,
  emptyLabel = 'No data in this range',
}: {
  items: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-cream-muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate text-[var(--color-cream)]">{item.label}</span>
            <span className="shrink-0 text-[var(--color-cream-muted)]">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-umber)]">
            <div
              className="h-full rounded-full bg-[var(--color-brass)]"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function KpiCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
}) {
  const content = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brass)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-cream-muted)]">{hint}</p>}
    </>
  );

  const className =
    'rounded-xl border border-[var(--color-brass)]/20 bg-[var(--color-umber)]/50 p-4 transition hover:border-[var(--color-brass)]/40';

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-brass)]/20 bg-[var(--color-umber)]/40 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-brass)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AdminDashboardPage() {
  const { session, hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [customFrom, setCustomFrom] = useState(() =>
    toInputDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
  );
  const [customTo, setCustomTo] = useState(() => toInputDate(new Date()));

  const range = useMemo(() => {
    const now = new Date();
    if (preset === '7d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (preset === '30d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    return {
      from: startOfDayIso(customFrom),
      to: endOfDayIso(customTo),
    };
  }, [preset, customFrom, customTo]);

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard', session?.access_token, range.from, range.to],
    enabled: Boolean(session?.access_token) && canManage,
    queryFn: () => fetchAdminDashboard(session!.access_token, range),
    staleTime: 30_000,
  });

  if (dashboardQuery.isLoading) {
    return <AdminPageSkeleton />;
  }

  const data = dashboardQuery.data;
  const error =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : data
        ? null
        : 'Failed to load dashboard';

  if (error || !data) {
    return (
      <div className="space-y-3 text-[var(--color-cream)]">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Dashboard</h1>
        <p className="text-[#e8a0a0]" role="alert">
          {error ?? 'No data'}
        </p>
      </div>
    );
  }

  const cancelRate =
    data.orders.total > 0
      ? `${((data.orders.cancelled / data.orders.total) * 100).toFixed(1)}%`
      : '0%';

  const statusItems = Object.entries(data.orders.by_status).map(([label, value]) => ({
    label,
    value,
  }));
  const fulfillmentItems = Object.entries(data.orders.by_fulfillment).map(([label, value]) => ({
    label,
    value,
  }));
  const paymentMethodItems = Object.entries(data.payments.by_method).map(([label, value]) => ({
    label,
    value,
  }));
  const floorItems = Object.entries(data.floor.tables_by_status).map(([label, value]) => ({
    label,
    value,
  }));
  const staffItems = Object.entries(data.staff.by_role).map(([label, value]) => ({
    label,
    value,
  }));
  const topDishMax = Math.max(...data.menu.top_items.map((item) => item.quantity_sold), 1);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 text-left text-[var(--color-cream)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass)]">
            Overview
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--color-cream-muted)]">
            Restaurant activity from {new Date(data.range.from).toLocaleDateString()} to{' '}
            {new Date(data.range.to).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['7d', '30d', 'custom'] as RangePreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                preset === key
                  ? 'bg-[var(--color-brass)] text-[var(--color-espresso)]'
                  : 'border border-[var(--color-brass)]/30 text-[var(--color-cream-muted)]'
              }`}
            >
              {key === '7d' ? '7 days' : key === '30d' ? '30 days' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-[var(--color-cream-muted)]">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="ml-2 rounded-md border border-[var(--color-brass)]/30 bg-[var(--color-espresso)] px-2 py-1 text-[var(--color-cream)]"
            />
          </label>
          <label className="text-sm text-[var(--color-cream-muted)]">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="ml-2 rounded-md border border-[var(--color-brass)]/30 bg-[var(--color-espresso)] px-2 py-1 text-[var(--color-cream)]"
            />
          </label>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Orders" value={data.orders.total} hint={`${cancelRate} cancelled`} />
        <KpiCard label="Paid revenue" value={formatEtb(data.orders.revenue_paid)} />
        <KpiCard label="Avg order" value={formatEtb(data.orders.aov)} />
        <KpiCard
          label="Chapa to validate"
          value={data.payments.awaiting_chapa_validation}
          to="/admin/payments"
        />
        <KpiCard label="Open cash" value={data.payments.open_cash} to="/admin/payments" />
        <KpiCard
          label="Unread alerts"
          value={data.staff.unread_notifications}
          to="/admin/payments"
        />
        <KpiCard
          label="Menu approvals"
          value={data.menu_change_requests.pending}
          to="/admin/menu"
        />
        <KpiCard
          label="Active deliveries"
          value={data.deliveries.active}
          hint={`${data.deliveries.unassigned} unassigned`}
          to="/admin/deliveries"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Order status">
          <BarList items={statusItems} />
        </Section>
        <Section title="Fulfillment mix">
          <BarList items={fulfillmentItems} />
        </Section>
        <Section title="Payment methods">
          <BarList items={paymentMethodItems} />
        </Section>
        <Section title="Floor tables">
          <BarList items={floorItems} />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Top dishes">
          {data.menu.top_items.length === 0 ? (
            <p className="text-sm text-[var(--color-cream-muted)]">No sales in this range.</p>
          ) : (
            <ul className="space-y-3">
              {data.menu.top_items.map((item) => (
                <li key={item.menu_item_id} className="space-y-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{item.name}</span>
                    <span className="text-[var(--color-cream-muted)]">
                      {item.quantity_sold} sold · {formatEtb(item.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-espresso)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-brass)]"
                      style={{
                        width: `${Math.max((item.quantity_sold / topDishMax) * 100, 4)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Reservations & staff">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <p>
                Confirmed in range:{' '}
                <span className="text-[var(--color-brass)]">{data.reservations.confirmed}</span>
              </p>
              <p>
                Cancelled in range:{' '}
                <span className="text-[var(--color-brass)]">{data.reservations.cancelled}</span>
              </p>
              <p>
                Upcoming:{' '}
                <span className="text-[var(--color-brass)]">{data.reservations.upcoming}</span>
              </p>
              <p>
                Menu available / hidden:{' '}
                <span className="text-[var(--color-brass)]">
                  {data.menu.available} / {data.menu.unavailable}
                </span>
              </p>
              <p>
                Deliveries completed:{' '}
                <span className="text-[var(--color-brass)]">{data.deliveries.completed}</span>
              </p>
            </div>
            <BarList items={staffItems} emptyLabel="No staff roles yet" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/admin/queue" className="text-[var(--color-brass)] underline">
              Open kitchen queue
            </Link>
            <Link to="/admin/roles" className="text-[var(--color-brass)] underline">
              Manage roles
            </Link>
          </div>
        </Section>
      </div>
    </div>
  );
}
