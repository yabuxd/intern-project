import { useCallback, useEffect, useState } from 'react';
import type { AdminUser, PermissionName, PermissionRecord } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { fetchAdminUsers, fetchPermissionCatalog, updateUserPermissions } from '../services';
import { useAuth } from '../store';

export function AdminPermissionsPage() {
  const { session, hasPermission, refreshMe, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [catalog, setCatalog] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const [usersData, catalogData] = await Promise.all([
        fetchAdminUsers(session.access_token),
        fetchPermissionCatalog(session.access_token),
      ]);
      setUsers(usersData);
      setCatalog(catalogData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !canManage) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const [usersData, catalogData] = await Promise.all([
          fetchAdminUsers(session.access_token),
          fetchPermissionCatalog(session.access_token),
        ]);
        if (mounted) {
          setUsers(usersData);
          setCatalog(catalogData);
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
  }, [session?.access_token, canManage]);

  function togglePermission(user: AdminUser, permission: PermissionName, enabled: boolean) {
    const next = enabled
      ? [...user.permissions, permission]
      : user.permissions.filter((p: PermissionName) => p !== permission);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, permissions: next.sort() } : u)),
    );
  }

  async function saveUser(user: AdminUser) {
    if (!session?.access_token) return;
    setSavingId(user.id);
    setError(null);
    try {
      const updated = await updateUserPermissions(
        session.access_token,
        user.id,
        user.permissions,
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (currentUser?.id === updated.id) {
        await refreshMe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p className="text-stone-600">Loading users…</p>;
  }

  if (!canManage) {
    return (
      <div className="max-w-lg text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">Permissions</h1>
        <p className="mt-3 text-stone-600">You need the can_manage_permissions permission to access this panel.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 text-left">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Administration</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-stone-900">
          Permission management
        </h1>
        <p className="mt-2 text-stone-600">
          Assign or revoke permissions for each user. Changes take effect on their next API call.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-6">
        {users.map((user) => (
          <li
            key={user.id}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-stone-900">{user.name ?? user.email}</p>
                <p className="text-sm text-stone-600">{user.email}</p>
              </div>
              <button
                type="button"
                disabled={savingId === user.id}
                onClick={() => void saveUser(user)}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingId === user.id ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {catalog.map((permission) => {
                const checked = user.permissions.includes(permission.name);
                return (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => togglePermission(user, permission.name, e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-stone-800">{permission.name}</span>
                      {permission.description && (
                        <span className="block text-xs text-stone-500">{permission.description}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
