import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PERMISSIONS, type MenuCategory, type MenuItem } from '@intern/shared';
import {
  createMenuItem,
  deleteMenuItem,
  fetchManageMenu,
  updateMenuItem,
} from '../services';
import { useAuth } from '../store';

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
  const token = session?.access_token;

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const flatItems = useMemo(
    () => categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))),
    [categories],
  );

  async function reload() {
    if (!token) return;
    const data = await fetchManageMenu(token);
    setCategories(data);
    if (data[0] && form.menu_category_id === 0) {
      setForm((prev) => ({ ...prev, menu_category_id: data[0].id }));
    }
  }

  useEffect(() => {
    if (!token || !canManage) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const data = await fetchManageMenu(token);
        if (!mounted) return;
        setCategories(data);
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
  }, [token, canManage]);

  if (authLoading) return <p className="text-stone-600">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  if (!canManage) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-stone-700">You need the can_manage_menu permission.</p>
        <Link to="/menu" className="text-sm font-semibold underline">
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
      if (editingId) {
        await updateMenuItem(token, editingId, payload);
      } else {
        await createMenuItem(token, payload);
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
    if (!window.confirm('Delete this menu item?')) return;
    setError(null);
    try {
      await deleteMenuItem(token, id);
      if (editingId === id) {
        setEditingId(null);
        setForm({ ...emptyForm, menu_category_id: categories[0]?.id || 0 });
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <p className="text-stone-600">Loading manager…</p>;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Staff</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">
            Manage menu
          </h1>
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

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">
          {editingId ? 'Edit item' : 'Add item'}
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
            {saving ? 'Saving…' : editingId ? 'Update item' : 'Create item'}
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
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(item.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
