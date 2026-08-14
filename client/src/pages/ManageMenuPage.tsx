import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PERMISSIONS, type MenuCategory, type MenuChangeRequest, type MenuItem } from '@intern/shared';
import {
  approveMenuChangeRequest,
  createMenuChangeRequest,
  createMenuItem,
  deleteMenuItem,
  fetchManageMenu,
  fetchMenuChangeRequests,
  rejectMenuChangeRequest,
  updateMenuItem,
} from '../services';
import { useAuth } from '../store';
import { MenuSkeleton } from '../components/ui';

const emptyForm = {
  menu_category_id: 0,
  name: '',
  description: '',
  image_url: '',
  price: '',
  is_available: true,
};

export function ManageMenuPage() {
  const { session, hasPermission, loading: authLoading } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_MENU);
  const canPropose = hasPermission(PERMISSIONS.CAN_PROPOSE_MENU_CHANGES);
  const canAccess = canManage || canPropose;
  const token = session?.access_token;

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [requests, setRequests] = useState<MenuChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const flatItems = useMemo(
    () => categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))),
    [categories],
  );
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests],
  );

  async function reload() {
    if (!token) return;
    const [data, changeRequests] = await Promise.all([
      fetchManageMenu(token),
      fetchMenuChangeRequests(token, canManage ? 'pending' : undefined),
    ]);
    setCategories(data);
    setRequests(changeRequests);
    if (data[0] && form.menu_category_id === 0) {
      setForm((prev) => ({ ...prev, menu_category_id: data[0].id }));
    }
  }

  useEffect(() => {
    if (!token || !canAccess) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const [data, changeRequests] = await Promise.all([
          fetchManageMenu(token),
          fetchMenuChangeRequests(token, canManage ? 'pending' : undefined),
        ]);
        if (!mounted) return;
        setCategories(data);
        setRequests(changeRequests);
        setForm((prev) => ({
          ...prev,
          menu_category_id: prev.menu_category_id || data[0]?.id || 0,
        }));
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, canAccess, canManage]);

  if (authLoading) return <MenuSkeleton />;
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccess) {
    return (
      <div className="space-y-3 px-6 py-16 text-center text-[var(--color-cream)]">
        <p className="text-[var(--color-cream-muted)]">You need kitchen, manager, or admin access to manage the menu.</p>
        <Link to="/menu" className="text-sm font-semibold text-[var(--color-brass)] underline">
          Back to menu
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        menu_category_id: Number(form.menu_category_id),
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        price: Number(form.price),
        is_available: form.is_available,
      };
      if (editingId && canManage) {
        await updateMenuItem(token, editingId, payload);
      } else if (canManage) {
        await createMenuItem(token, payload);
      } else {
        await createMenuChangeRequest(token, { action: 'create', ...payload });
      }
      setForm({
        ...emptyForm,
        menu_category_id: categories[0]?.id || 0,
      });
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setForm({
      menu_category_id: item.menu_category_id,
      name: item.name,
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      price: String(item.price),
      is_available: item.is_available,
    });
  }

  async function onDelete(id: number) {
    if (!token) return;
    const confirmed = window.confirm(
      canManage ? 'Delete this menu item?' : 'Send a remove request for manager or admin approval?',
    );
    if (!confirmed) return;
    setError(null);
    try {
      if (canManage) {
        await deleteMenuItem(token, id);
      } else {
        await createMenuChangeRequest(token, { action: 'delete', menu_item_id: id });
      }
      if (editingId === id) {
        setEditingId(null);
        setForm({ ...emptyForm, menu_category_id: categories[0]?.id || 0 });
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function review(id: number, decision: 'approve' | 'reject') {
    if (!token) return;
    setReviewingId(id);
    setError(null);
    try {
      if (decision === 'approve') {
        await approveMenuChangeRequest(token, id);
      } else {
        await rejectMenuChangeRequest(token, id);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) return <MenuSkeleton />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Staff</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">
            Manage menu
          </h1>
          {!canManage && (
            <p className="mt-2 text-sm text-stone-600">
              Add and remove requests wait for a manager or admin to approve.
            </p>
          )}
        </div>
        <Link to="/menu" className="text-sm font-semibold text-stone-700 underline">
          View public menu
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {pendingRequests.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-stone-900">
            {canManage ? 'Pending approval' : 'Your pending requests'}
          </h2>
          <ul className="space-y-3">
            {pendingRequests.map((change) => (
              <li key={change.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">
                    {change.action === 'create'
                      ? `Add “${change.payload?.name ?? 'item'}”`
                      : `Remove “${change.menu_item?.name ?? `item #${change.menu_item_id}`}”`}
                  </p>
                  <p className="text-stone-600">
                    {change.requester?.email ?? 'Kitchen'} · waiting
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={reviewingId === change.id}
                      onClick={() => void review(change.id, 'approve')}
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={reviewingId === change.id}
                      onClick={() => void review(change.id, 'reject')}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">
          {editingId ? 'Edit item' : canManage ? 'Add item' : 'Request a new item'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-stone-700">Category</span>
            <select
              required
              value={form.menu_category_id}
              onChange={(e) => setForm((prev) => ({ ...prev, menu_category_id: Number(e.target.value) }))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-stone-700">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-stone-700">Price (ETB)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-stone-700">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-20 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-stone-700">Image URL</span>
            <input
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="/images/menu/doro-wat.jpg"
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm((prev) => ({ ...prev, is_available: e.target.checked }))}
            />
            <span>Available on public menu</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || categories.length === 0}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving
              ? 'Saving…'
              : editingId
                ? 'Update item'
                : canManage
                  ? 'Create item'
                  : 'Send for approval'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ ...emptyForm, menu_category_id: categories[0]?.id || 0 });
              }}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {flatItems.length === 0 ? (
          <li className="px-5 py-8 text-center text-stone-600">No items yet. Create one above.</li>
        ) : (
          flatItems.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-100 text-[10px] text-stone-400">
                    N/A
                  </div>
                )}
                <div>
                  <p className="font-semibold text-stone-900">
                    {item.name}{' '}
                    <span className="text-xs font-normal text-stone-500">({item.categoryName})</span>
                  </p>
                  <p className="text-sm text-stone-600">
                    {Number(item.price).toFixed(2)} ETB · {item.is_available ? 'Available' : 'Hidden'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onDelete(item.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                >
                  {canManage ? 'Delete' : 'Request remove'}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
