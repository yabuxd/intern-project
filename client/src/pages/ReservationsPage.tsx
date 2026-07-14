import { useCallback, useEffect, useState } from 'react';
import type { CreateReservationInput, Reservation, RestaurantTable } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { cancelReservation, createReservation, fetchReservations, fetchTables } from '../services';
import { useAuth } from '../store';

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
  }, [session?.access_token]);

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
  }, [session?.access_token]);

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
    return <p className="text-stone-600">Loading reservations…</p>;
  }

  if (!canCreate && !canManageAll) {
    return (
      <div className="max-w-lg text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">Reservations</h1>
        <p className="mt-3 text-stone-600">You need the can_create_reservation permission to book a table.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 text-left">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Book a table</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">Reservations</h1>
        <p className="mt-2 text-stone-600">
          {canManageAll
            ? 'View all bookings or create your own. Overlapping slots are blocked server-side.'
            : 'Pick a table and time. Availability is checked when you submit.'}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {canCreate && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="font-medium text-stone-700">Table</span>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : '')}
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
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
            <span className="font-medium text-stone-700">Party size</span>
            <input
              type="number"
              min={1}
              max={50}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-stone-700">Start time</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-stone-700">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || tableId === ''}
              className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? 'Booking…' : 'Book table'}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            {canManageAll ? 'All reservations' : 'Your reservations'}
          </h2>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800"
          >
            Refresh
          </button>
        </div>

        {reservations.length === 0 ? (
          <p className="text-stone-600">No reservations yet.</p>
        ) : (
          <ul className="space-y-3">
            {reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {reservation.table?.name ?? `Table #${reservation.table_id}`} · {reservation.party_size}{' '}
                    guests
                  </p>
                  <p className="text-sm text-stone-600">
                    {formatWhen(reservation.starts_at)} – {formatWhen(reservation.ends_at)}
                  </p>
                  {canManageAll && reservation.user && (
                    <p className="text-sm text-stone-500">{reservation.user.email}</p>
                  )}
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {reservation.status}
                  </p>
                </div>
                {reservation.status === 'confirmed' && (
                  <button
                    type="button"
                    disabled={cancellingId === reservation.id}
                    onClick={() => void handleCancel(reservation)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
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
