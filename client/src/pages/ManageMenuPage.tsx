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
import { MenuSkeleton } from '../components/ui';
import { formatEtb } from '../utils/format';

const emptyForm = {
  menu_category_id: 0,
  name: '',
  description: '',
  price: '',
  is_available: true,
};

const fieldClass =
  'w-full rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-[var(--color-cream)] outline-none transition focus:border-[var(--color-brass)]';

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const flatItems = useMemo(
    () =>
      categories.flatMap((category) =>
        category.items.map((item) => ({ ...item, categoryName: category.name })),
      ),
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

  if (authLoading) return <MenuSkeleton />;
  if (!session) return <Navigate to="/login" replace />;
  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center sm:px-6">
        <p className="text-[var(--color-cream-muted)]">You need the can_manage_menu permission.</p>
        <Link to="/menu" className="text-sm font-semibold text-[var(--color-brass)] underline">
          Back to menu
        </Link>
      </div>
    );
  }

  function clearImageSelection() {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function resetFormFields(categoryId = categories[0]?.id || 0) {
    setForm({ ...emptyForm, menu_category_id: categoryId });
    setEditingId(null);
    setExistingImageUrl(null);
    clearImageSelection();
  }

  function onImageChange(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    clearImageSelection();
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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
        price: Number(form.price),
        is_available: form.is_available,
      };
      if (editingId) {
        await updateMenuItem(token, editingId, payload, imageFile);
      } else {
        await createMenuItem(token, payload, imageFile);
      }
      resetFormFields(categories[0]?.id || 0);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: MenuItem) {
    clearImageSelection();
    setEditingId(item.id);
    setExistingImageUrl(item.image_url);
    setForm({
      menu_category_id: item.menu_category_id,
      name: item.name,
      description: item.description ?? '',
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
        resetFormFields(categories[0]?.id || 0);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <MenuSkeleton />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 text-left sm:space-y-10 sm:px-6 sm:py-12 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
            Staff
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">
            Manage menu
          </h1>
          <p className="mt-2 text-sm text-[var(--color-cream-muted)]">
            Add dishes, update prices, or hide items from the public menu.
          </p>
        </div>
        <Link
          to="/menu"
          className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm font-medium text-[var(--color-brass)] transition hover:bg-[var(--color-umber)]"
        >
          View public menu
        </Link>
      </div>

      {error && (
        <p
          className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-[#e8a0a0]"
          role="alert"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5 sm:p-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
          {editingId ? 'Edit item' : 'Add item'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-[var(--color-cream-muted)]">Category</span>
            <select
              required
              value={form.menu_category_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, menu_category_id: Number(e.target.value) }))
              }
              className={fieldClass}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--color-cream-muted)]">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--color-cream-muted)]">Price (ETB)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-[var(--color-cream-muted)]">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className={`min-h-20 ${fieldClass}`}
            />
          </label>
          <label className="block space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-[var(--color-cream-muted)]">Dish image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => onImageChange(e.target.files)}
              className="block w-full text-sm text-[var(--color-cream-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brass)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-espresso)]"
            />
            <p className="text-xs text-[var(--color-cream-muted)]">
              Choose a photo from your computer (JPEG, PNG, WebP, or GIF, max 5 MB).
            </p>
            {(imagePreview || existingImageUrl) && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={imagePreview ?? existingImageUrl ?? undefined}
                  alt="Dish preview"
                  className="h-20 w-20 object-cover"
                />
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => clearImageSelection()}
                    className="text-sm text-[var(--color-brass)] underline"
                  >
                    Remove selected file
                  </button>
                )}
              </div>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-cream)] md:col-span-2">
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
            className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] transition hover:bg-[var(--color-brass-deep)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Update item' : 'Create item'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => resetFormFields(categories[0]?.id || 0)}
              className="rounded-md border border-[var(--color-brass)]/35 px-4 py-2 text-sm text-[var(--color-cream)] transition hover:bg-[var(--color-espresso)]"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <ul className="divide-y divide-[var(--color-brass)]/15 overflow-hidden border border-[var(--color-brass)]/20 bg-[var(--color-umber)]">
        {flatItems.length === 0 ? (
          <li className="px-5 py-8 text-center text-[var(--color-cream-muted)]">
            No items yet. Create one above.
          </li>
        ) : (
          flatItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-14 w-14 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center bg-[var(--color-espresso)] text-[10px] text-[var(--color-cream-muted)]">
                    N/A
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[var(--color-cream)]">
                    {item.name}{' '}
                    <span className="text-xs font-normal text-[var(--color-cream-muted)]">
                      ({item.categoryName})
                    </span>
                  </p>
                  <p className="text-sm text-[var(--color-cream-muted)]">
                    {formatEtb(item.price)} · {item.is_available ? 'Available' : 'Hidden'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-md border border-[var(--color-brass)]/35 px-3 py-1.5 text-sm text-[var(--color-cream)] transition hover:bg-[var(--color-espresso)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(item.id)}
                  className="rounded-md border border-red-400/30 px-3 py-1.5 text-sm text-[#e8a0a0] transition hover:bg-red-500/10"
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
