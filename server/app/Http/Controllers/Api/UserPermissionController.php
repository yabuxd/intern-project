<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateRolePermissionsRequest;
use App\Http\Requests\UpdateUserRolesRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserPermissionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->with('roles.permissions')
            ->orderBy('email')
            ->get()
            ->map(fn (User $user) => $this->transformUser($user));

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function permissions(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'description' => $permission->description,
            ]);

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    public function roles(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $roles = Role::query()
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->transformRole($role));

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    public function updateUserRoles(UpdateUserRolesRequest $request, User $user): JsonResponse
    {
        $this->authorize('updatePermissions', $user);

        $roleIds = Role::query()
            ->whereIn('name', $request->validated('roles'))
            ->pluck('id');

        $user->roles()->sync($roleIds);
        $user->load('roles.permissions');

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($user),
            'message' => 'Roles updated.',
        ]);
    }

    public function updateRolePermissions(UpdateRolePermissionsRequest $request, Role $role): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $permissionIds = Permission::query()
            ->whereIn('name', $request->validated('permissions'))
            ->pluck('id');

        $role->permissions()->sync($permissionIds);
        $role->load('permissions');

        return response()->json([
            'success' => true,
            'data' => $this->transformRole($role),
            'message' => 'Role permissions updated.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roleNames(),
            'permissions' => $user->permissionNames(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'permissions' => $role->permissionNames(),
        ];
    }
}
