import { useMemo, useState } from 'react';
import type { AdminUser, PermissionName } from '@intern/shared';
import { PERMISSIONS } from '@intern/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminRoles,
  fetchAdminUsers,
  fetchPermissionCatalog,
  updateRolePermissions,
  updateUserRoles,
} from '../services';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAuth } from '../store';
import { AdminPageSkeleton, ConfirmModal } from '../components/ui';

export function AdminRolesPage() {
  const { session, hasPermission, refreshMe, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission(PERMISSIONS.CAN_MANAGE_PERMISSIONS);
  const token = session?.access_token;

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchAdminUsers(token!),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchAdminRoles(token!),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const catalogQuery = useQuery({
    queryKey: ['admin', 'permissions', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchPermissionCatalog(token!),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);

  const [userRoleEdits, setUserRoleEdits] = useState<Record<string, string[]>>({});
  const [rolePermEdits, setRolePermEdits] = useState<Record<number, PermissionName[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'customer' });
  const debouncedUserQuery = useDebouncedValue(userQuery, 300);

  const users = useMemo(() => {
    const base = usersQuery.data ?? [];
    return base.map((u) => ({
      ...u,
      roles: userRoleEdits[u.id] ?? u.roles,
    }));
  }, [usersQuery.data, userRoleEdits]);

  const roles = useMemo(() => {
    const base = rolesQuery.data ?? [];
    return base.map((r) => ({
      ...r,
      permissions: rolePermEdits[r.id] ?? r.permissions,
    }));
  }, [rolesQuery.data, rolePermEdits]);

  const reload = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] }),
    ]);
  };

  const activeRoleId = selectedRoleId ?? roles[0]?.id ?? null;
  const selectedRole = roles.find((role) => role.id === activeRoleId) ?? null;

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
    const current = userRoleEdits[user.id] ?? user.roles;
    const next = enabled
      ? [...current, roleName]
      : current.filter((name) => name !== roleName);
    setUserRoleEdits((prev) => ({ ...prev, [user.id]: next.sort() }));
  }

  function toggleRolePermission(permission: PermissionName, enabled: boolean) {
    if (!selectedRole) return;
    const current = rolePermEdits[selectedRole.id] ?? selectedRole.permissions;
    const next = enabled
      ? [...current, permission]
      : current.filter((p) => p !== permission);
    setRolePermEdits((prev) => ({
      ...prev,
      [selectedRole.id]: [...next].sort() as PermissionName[],
    }));
  }

  async function saveUser(user: AdminUser) {
    if (!session?.access_token) return;
    setSavingUserId(user.id);
    setError(null);
    try {
      const updated = await updateUserRoles(session.access_token, user.id, user.roles);
      setUserRoleEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
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
      await createAdminUser(session.access_token, {
        name: newUser.name.trim() || undefined,
        email: newUser.email.trim(),
        password: newUser.password,
        roles: [newUser.role],
      });
      setNewUser({ name: '', email: '', password: '', role: 'customer' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  function requestDeleteUser(user: AdminUser) {
    if (user.id === currentUser?.id) {
      setError('You cannot delete your own account.');
      return;
    }
    setError(null);
    setUserToDelete(user);
  }

  async function handleConfirmDeleteUser() {
    if (!session?.access_token || !userToDelete) return;
    const target = userToDelete;
    setDeletingUserId(target.id);
    setError(null);
    try {
      await deleteAdminUser(session.access_token, target.id);
      setUserRoleEdits((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      setUserToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  }

  async function saveRole() {
    if (!session?.access_token || !selectedRole) return;
    setSavingRoleId(selectedRole.id);
    setError(null);
    try {
      await updateRolePermissions(
        session.access_token,
        selectedRole.id,
        selectedRole.permissions,
      );
      setRolePermEdits((prev) => {
        const next = { ...prev };
        delete next[selectedRole.id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
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

  const isLoading =
    (usersQuery.isLoading || rolesQuery.isLoading || catalogQuery.isLoading) &&
    users.length === 0 &&
    roles.length === 0;

  if (isLoading) {
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingUserId === user.id || deletingUserId === user.id}
                    onClick={() => void saveUser(user)}
                    className="rounded-md bg-[var(--color-brass)] px-4 py-2 text-sm font-semibold text-[var(--color-espresso)] disabled:opacity-60"
                  >
                    {savingUserId === user.id ? 'Saving…' : 'Save roles'}
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      type="button"
                      disabled={deletingUserId === user.id || savingUserId === user.id}
                      onClick={() => requestDeleteUser(user)}
                      className="rounded-md border border-[var(--color-wine)]/50 px-4 py-2 text-sm font-medium text-[#e8a0a0] transition hover:bg-[var(--color-wine)]/15 disabled:opacity-60"
                    >
                      {deletingUserId === user.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
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

      {/* Attractive User Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User Account"
        description="Are you sure you want to permanently delete this user? Their account access, authentication credentials, and all assigned role permissions will be immediately revoked."
        confirmText="Delete User"
        cancelText="Keep Account"
        variant="danger"
        isLoading={Boolean(deletingUserId)}
        details={[
          { label: 'User Name', value: userToDelete?.name || '—' },
          { label: 'Email Address', value: userToDelete?.email || '—' },
          {
            label: 'Assigned Roles',
            value: (
              <span className="inline-flex flex-wrap gap-1">
                {(userToDelete?.roles.length ? userToDelete.roles : ['customer']).map((r) => (
                  <span
                    key={r}
                    className="rounded bg-[var(--color-brass)]/15 px-1.5 py-0.5 text-xs font-medium text-[var(--color-brass)] border border-[var(--color-brass)]/30"
                  >
                    {r}
                  </span>
                ))}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
