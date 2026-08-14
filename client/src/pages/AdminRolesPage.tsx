import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminUser, PermissionName, PermissionRecord, RoleRecord } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import {
  createAdminUser,
  fetchAdminRoles,
  fetchAdminUsers,
  fetchPermissionCatalog,
  updateRolePermissions,
  updateUserRoles,
} from '../services';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAuth } from '../store';
import { AdminPageSkeleton } from '../components/ui';

export function AdminRolesPage() {
  const { session, hasPermission, refreshMe, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [catalog, setCatalog] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'customer' });
  const debouncedUserQuery = useDebouncedValue(userQuery, 300);
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const [usersData, rolesData, catalogData] = await Promise.all([
        fetchAdminUsers(session.access_token),
        fetchAdminRoles(session.access_token),
        fetchPermissionCatalog(session.access_token),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setCatalog(catalogData);
      setSelectedRoleId((prev) => prev ?? rolesData[0]?.id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    }
  }, [session]);

  useEffect(() => {
    if (!session?.access_token || !canManage) {
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const [usersData, rolesData, catalogData] = await Promise.all([
          fetchAdminUsers(session.access_token),
          fetchAdminRoles(session.access_token),
          fetchPermissionCatalog(session.access_token),
        ]);
        if (mounted) {
          setUsers(usersData);
          setRoles(rolesData);
          setCatalog(catalogData);
          setSelectedRoleId(rolesData[0]?.id ?? null);
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
  }, [session, canManage]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const visibleUsers = useMemo(() => {
    const needle = debouncedUserQuery.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(needle) ||
        (user.name ?? '').toLowerCase().includes(needle),
    );
  }, [users, debouncedUserQuery]);

  function toggleUserRole(user: AdminUser, roleName: string, enabled: boolean) {
    const next = enabled
      ? [...user.roles, roleName]
      : user.roles.filter((name) => name !== roleName);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, roles: next.sort() } : u)),
    );
  }

  function toggleRolePermission(permission: PermissionName, enabled: boolean) {
    if (!selectedRole) return;
    const next = enabled
      ? [...selectedRole.permissions, permission]
      : selectedRole.permissions.filter((p) => p !== permission);
    setRoles((prev) =>
      prev.map((role) =>
        role.id === selectedRole.id
          ? { ...role, permissions: [...next].sort() as PermissionName[] }
          : role,
      ),
    );
  }

  async function saveUser(user: AdminUser) {
    if (!session?.access_token) return;
    setSavingUserId(user.id);
    setError(null);
    try {
      const updated = await updateUserRoles(session.access_token, user.id, user.roles);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (currentUser?.id === updated.id) {
        await refreshMe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user roles');
      await reload();
    } finally {
      setSavingUserId(null);
    }
  }

  async function createUser() {
    if (!session?.access_token) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createAdminUser(session.access_token, {
        name: newUser.name.trim() || undefined,
        email: newUser.email.trim(),
        password: newUser.password,
        roles: [newUser.role],
      });
      setUsers((prev) => [created, ...prev]);
      setNewUser({ name: '', email: '', password: '', role: 'customer' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function saveRole() {
    if (!session?.access_token || !selectedRole) return;
    setSavingRoleId(selectedRole.id);
    setError(null);
    try {
      const updated = await updateRolePermissions(
        session.access_token,
        selectedRole.id,
        selectedRole.permissions,
      );
      setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
      await reload();
      if (currentUser) {
        await refreshMe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role permissions');
      await reload();
    } finally {
      setSavingRoleId(null);
    }
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)]">
          Roles
        </h1>
        <p className="text-[var(--color-cream-muted)]">
          You need the can_manage_permissions permission to access this panel.
        </p>
      </div>
    );
  }

  if (loading) {
    return <AdminPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 text-left sm:px-6 sm:py-12 md:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brass)]">
          Administration
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">
          Roles & permissions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-cream-muted)] sm:text-base">
          Assign roles to users, and decide which permissions each role includes.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-[#e8a0a0]">
          {error}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
          Users
        </h2>
        <form
          className="grid gap-3 border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            void createUser();
          }}
        >
          <input
            required
            value={newUser.name}
            onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            className="rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-sm text-[var(--color-cream)]"
          />
          <input
            required
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            className="rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-sm text-[var(--color-cream)]"
          />
          <input
            required
            type="password"
            minLength={8}
            value={newUser.password}
            onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Password (min 8)"
            className="rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-sm text-[var(--color-cream)]"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
            className="rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-sm text-[var(--color-cream)]"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create user'}
          </button>
        </form>
        <input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Filter by name or email"
          className="w-full max-w-md rounded-md border border-[var(--color-brass)]/25 bg-[var(--color-espresso)] px-3 py-2 text-sm text-[var(--color-cream)]"
        />
        <ul className="space-y-4">
          {visibleUsers.map((user) => (
            <li
              key={user.id}
              className="border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--color-cream)]">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-sm text-[var(--color-cream-muted)]">{user.email}</p>
                  <p className="mt-1 text-xs text-[var(--color-cream-muted)]">
                    Effective: {user.permissions.length ? user.permissions.join(', ') : 'none'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingUserId === user.id}
                  onClick={() => void saveUser(user)}
                  className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                >
                  {savingUserId === user.id ? 'Saving…' : 'Save roles'}
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => {
                  const checked = user.roles.includes(role.name);
                  return (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-start gap-3 border border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/40 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleUserRole(user, role.name, e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--color-cream)]">
                          {role.name}
                        </span>
                        {role.description && (
                          <span className="block text-xs text-[var(--color-cream-muted)]">
                            {role.description}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
            Role permissions
          </h2>
          <button
            type="button"
            disabled={!selectedRole || savingRoleId === selectedRole?.id}
            onClick={() => void saveRole()}
            className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
          >
            {savingRoleId === selectedRole?.id ? 'Saving…' : 'Save role'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={[
                'rounded-md border px-3 py-1.5 text-sm transition',
                selectedRoleId === role.id
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/15 text-[var(--color-brass)]'
                  : 'border-[var(--color-brass)]/25 text-[var(--color-cream-muted)] hover:border-[var(--color-brass)]/50',
              ].join(' ')}
            >
              {role.name}
            </button>
          ))}
        </div>

        {selectedRole && (
          <div className="border border-[var(--color-brass)]/20 bg-[var(--color-umber)] p-5 sm:p-6">
            <p className="text-sm text-[var(--color-cream-muted)]">
              {selectedRole.description ?? `Permissions for ${selectedRole.name}`}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {catalog.map((permission) => {
                const checked = selectedRole.permissions.includes(permission.name);
                return (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-3 border border-[var(--color-brass)]/15 bg-[var(--color-espresso)]/40 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleRolePermission(permission.name, e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[var(--color-cream)]">
                        {permission.name}
                      </span>
                      {permission.description && (
                        <span className="block text-xs text-[var(--color-cream-muted)]">
                          {permission.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
