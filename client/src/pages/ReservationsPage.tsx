import { useCallback, useEffect, useState } from 'react';
import type { CreateReservationInput, Reservation, RestaurantTable } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { cancelReservation, createReservation, fetchReservations, fetchTables } from '../services';
import { useAuth } from '../store';
import { ReservationsPageSkeleton } from '../components/ui';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const fieldClass =
  'mt-1.5 w-full border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2.5 text-[var(--color-cream)] outline-none transition focus:border-[var(--color-brass)]';

export function ReservationsPage() {
  const { session, hasPermission } = useAuth();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const canCreate = hasPermission(PERMISSIONS.CAN_CREATE_RESERVATION);
  const canManageAll = hasPermission(PERMISSIONS.CAN_MANAGE_TABLES);

  const [tableId, setTableId] = useState<number | ''>('');
  const [partySize, setPartySize] = useState(2);
  const [startsAt, setStartsAt] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setMinutes(0, 0, 0);
    return toLocalInputValue(next);
  });
  const [notes, setNotes] = useState('');

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const [tablesData, reservationsData] = await Promise.all([
        fetchTables(),
        fetchReservations(session.access_token),
      ]);
      setTables(tablesData);
      setReservations(reservationsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const tablesData = await fetchTables();
        if (mounted) setTables(tablesData);
        if (session?.access_token) {
          const reservationsData = await fetchReservations(session.access_token);
          if (mounted) setReservations(reservationsData);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.access_token || !canCreate || tableId === '') return;

    setSubmitting(true);
    setError(null);
    try {
      const input: CreateReservationInput = {
        table_id: tableId,
        party_size: partySize,
        starts_at: new Date(startsAt).toISOString(),
        notes: notes.trim() || undefined,
      };
      const created = await createReservation(session.access_token, input);
      setReservations((prev) => [created, ...prev]);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(reservation: Reservation) {
    if (!session?.access_token || reservation.status === 'cancelled') return;
    setCancellingId(reservation.id);
    try {
      const updated = await cancelReservation(session.access_token, reservation.id);
      setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return <ReservationsPageSkeleton />;
  }

  if (!canCreate && !canManageAll) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
          Reservations
        </h1>
        <p className="mt-3 text-[var(--color-cream-muted)]">
          You need booking permission to reserve a table.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-6 py-12 text-left sm:px-10">
      <header className="bistro-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
          Book a seat
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)] sm:text-5xl">
          Reservations
        </h1>
        <p className="mt-3 max-w-lg text-[var(--color-cream-muted)]">
          {canManageAll
            ? 'Hold a table for the night — overlapping bookings are blocked automatically.'
            : 'Choose a table and time. We hold the evening for two hours by default.'}
        </p>
      </header>

      {error && <p className="text-sm text-[#e8a0a0]">{error}</p>}

      {canCreate && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="grid gap-5 border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-6 sm:grid-cols-2 sm:p-8"
        >
          <label className="block text-sm">
            <span className="font-medium text-[var(--color-cream)]">Table</span>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : '')}
              required
              className={fieldClass}
            >
              <option value="">Select a table</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                  {table.capacity ? ` (${table.capacity} seats)` : ''} — {table.status}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[var(--color-cream)]">Party size</span>
            <input
              type="number"
              min={1}
              max={50}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              required
              className={fieldClass}
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-[var(--color-cream)]">Start time</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className={`${fieldClass} [color-scheme:dark]`}
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-[var(--color-cream)]">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className={fieldClass}
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || tableId === ''}
              className="rounded-md bg-[var(--color-brass)] px-6 py-3 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
            >
              {submitting ? 'Booking…' : 'Book table'}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
            {canManageAll ? 'Tonight’s book' : 'Your bookings'}
          </h2>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm font-medium text-[var(--color-brass)] transition hover:bg-[var(--color-umber)]"
          >
            Refresh
          </button>
        </div>

        {reservations.length === 0 ? (
          <p className="border border-dashed border-[var(--color-brass)]/25 bg-[var(--color-umber)]/40 px-6 py-10 text-center text-[var(--color-cream-muted)]">
            No reservations yet. The book is open.
          </p>
        ) : (
          <ul className="space-y-3">
            {reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-[var(--color-brass)]/15 bg-[var(--color-umber)] p-5"
              >
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
                    {reservation.table?.name ?? `Table #${reservation.table_id}`} ·{' '}
                    {reservation.party_size} guests
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-cream-muted)]">
                    {formatWhen(reservation.starts_at)} – {formatWhen(reservation.ends_at)}
                  </p>
                  {canManageAll && reservation.user && (
                    <p className="mt-1 text-sm text-[var(--color-brass)]">
                      {reservation.user.email}
                    </p>
                  )}
                  <p
                    className={`mt-2 inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      reservation.status === 'confirmed'
                        ? 'bg-[var(--color-brass)]/20 text-[var(--color-brass)]'
                        : 'bg-[var(--color-wine)]/25 text-[#e8a0a0]'
                    }`}
                  >
                    {reservation.status}
                  </p>
                </div>
                {reservation.status === 'confirmed' && (
                  <button
                    type="button"
                    disabled={cancellingId === reservation.id}
                    onClick={() => void handleCancel(reservation)}
                    className="rounded-md border border-[var(--color-wine)]/50 px-4 py-2 text-sm font-medium text-[#e8a0a0] transition hover:bg-[var(--color-wine)]/20 disabled:opacity-60"
                  >
                    {cancellingId === reservation.id ? 'Cancelling…' : 'Cancel reservation'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
