import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PERMISSIONS, type MenuItem } from '@intern/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveMenuChangeRequest,
  createMenuChangeRequest,
  createMenuItem,
  deleteMenuItem,
  fetchManageMenu,
  fetchMenuChangeRequests,
  rejectMenuChangeRequest,
  updateMenuItem,
  uploadMenuImage,
} from '../services';
import { useAuth } from '../store';
import { ConfirmModal, MenuSkeleton } from '../components/ui';
import { resolveMenuImageSrc } from '../utils/menuImage';

const emptyForm = {
  menu_category_id: 0,
  name: '',
  description: '',
  image_url: '',
  price: '',
  is_available: true,
};

type ImageSource = 'url' | 'device';

export function ManageMenuPage() {
  const { session, hasPermission, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_MENU);
  const canPropose = hasPermission(PERMISSIONS.CAN_PROPOSE_MENU_CHANGES);
  const canAccess = canManage || canPropose;
  const token = session?.access_token;

  const menuQuery = useQuery({
    queryKey: ['menu', 'manage', token],
    enabled: Boolean(token) && canAccess,
    queryFn: () => fetchManageMenu(token!),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const requestsQuery = useQuery({
    queryKey: ['menu', 'change-requests', token, canManage ? 'pending' : 'all'],
    enabled: Boolean(token) && canAccess,
    queryFn: () => fetchMenuChangeRequests(token!, canManage ? 'pending' : undefined),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const categories = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);

  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatItems = useMemo(
    () => categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))),
    [categories],
  );
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests],
  );

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function resetImageFields() {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setImageSource('url');
  }

  async function reload() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['menu'] }),
      queryClient.invalidateQueries({ queryKey: ['menu', 'manage'] }),
      queryClient.invalidateQueries({ queryKey: ['menu', 'change-requests'] }),
    ]);
  }

  const loading = (menuQuery.isLoading || requestsQuery.isLoading) && categories.length === 0;

  if (authLoading || loading) return <MenuSkeleton />;
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

  async function resolveImageUrl(): Promise<string | null> {
    if (imageSource === 'device') {
      if (!imageFile) {
        return form.image_url.trim() || null;
      }
      if (!token) return null;
      setUploadingImage(true);
      try {
        const uploaded = await uploadMenuImage(token, imageFile);
        return uploaded.image_url || null;
      } finally {
        setUploadingImage(false);
      }
    }

    const value = form.image_url.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
      return value;
    }
    throw new Error('Use a full image URL (https://…) or upload a file from your device.');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrl = await resolveImageUrl();
      const catId = form.menu_category_id || categories[0]?.id || 0;
      const payload = {
        menu_category_id: Number(catId),
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: imageUrl,
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
      setForm(emptyForm);
      setEditingId(null);
      resetImageFields();
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
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(resolveMenuImageSrc(item.image_url));
    setImageSource('url');
  }

  function onPickFile(file: File | null) {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    if (file) {
      setForm((prev) => ({ ...prev, image_url: '' }));
    }
  }

  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function requestDeleteItem(item: MenuItem) {
    if (!token) return;
    setError(null);
    setItemToDelete(item);
  }

  async function handleConfirmDelete() {
    if (!token || !itemToDelete) return;
    const item = itemToDelete;
    setDeleting(true);
    setError(null);
    try {
      if (canManage) {
        await deleteMenuItem(token, item.id);
      } else {
        await createMenuChangeRequest(token, { action: 'delete', menu_item_id: item.id });
      }
      if (editingId === item.id) {
        setEditingId(null);
        setForm({ ...emptyForm, menu_category_id: categories[0]?.id || 0 });
        resetImageFields();
      }
      setItemToDelete(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
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

  const previewSrc = imagePreview ?? resolveMenuImageSrc(form.image_url);

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
              value={form.menu_category_id || categories[0]?.id || ''}
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

          <div className="space-y-3 md:col-span-2">
            <p className="text-sm font-medium text-stone-700">Dish image</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageSource('url');
                  onPickFile(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  imageSource === 'url'
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 text-stone-700'
                }`}
              >
                Image URL
              </button>
              <button
                type="button"
                onClick={() => setImageSource('device')}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  imageSource === 'device'
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 text-stone-700'
                }`}
              >
                Upload from device
              </button>
            </div>

            {imageSource === 'url' ? (
              <label className="block space-y-1 text-sm">
                <span className="text-stone-600">Paste an internet image URL</span>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, image_url: e.target.value }));
                    setImagePreview(null);
                  }}
                  placeholder="https://example.com/dish.jpg"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2"
                />
              </label>
            ) : (
              <label className="block space-y-1 text-sm">
                <span className="text-stone-600">
                  Choose a photo from this device (JPEG, PNG, WebP, GIF · max 5MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                />
              </label>
            )}

            {previewSrc && (
              <div className="flex items-center gap-3">
                <img
                  src={previewSrc}
                  alt="Dish preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, image_url: '' }));
                    onPickFile(null);
                  }}
                  className="text-sm text-stone-600 underline"
                >
                  Clear image
                </button>
              </div>
            )}
          </div>

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
            disabled={saving || uploadingImage || categories.length === 0}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving || uploadingImage
              ? uploadingImage
                ? 'Uploading image…'
                : 'Saving…'
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
                resetImageFields();
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
          flatItems.map((item) => {
            const src = resolveMenuImageSrc(item.image_url);
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  {src ? (
                    <img
                      src={src}
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
                    onClick={() => requestDeleteItem(item)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 transition"
                  >
                    {canManage ? 'Delete' : 'Request remove'}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Attractive Menu Item Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={canManage ? 'Delete Menu Dish' : 'Request Dish Removal'}
        description={
          canManage
            ? 'Are you sure you want to delete this dish from the menu? It will be removed from all customer ordering screens immediately.'
            : 'Submit a formal request to remove this item from the active menu? A manager or admin will review your proposal.'
        }
        confirmText={canManage ? 'Delete Dish' : 'Submit Removal Request'}
        cancelText="Keep Dish"
        variant={canManage ? 'danger' : 'warning'}
        isLoading={deleting}
        details={[
          { label: 'Dish Name', value: itemToDelete?.name || '—' },
          {
            label: 'Price',
            value: itemToDelete ? `${Number(itemToDelete.price).toFixed(2)} ETB` : '—',
          },
          {
            label: 'Current Availability',
            value: (
              <span className={itemToDelete?.is_available ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                {itemToDelete?.is_available ? 'Available' : 'Hidden'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
