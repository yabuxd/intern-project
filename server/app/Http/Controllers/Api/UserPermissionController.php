<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserPermissionsRequest;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserPermissionController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->with('permissions')
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

    public function update(UpdateUserPermissionsRequest $request, User $user): JsonResponse
    {
        $this->authorize('updatePermissions', $user);

        $permissionIds = Permission::query()
            ->whereIn('name', $request->validated('permissions'))
            ->pluck('id');

        $user->permissions()->sync($permissionIds);
        $user->load('permissions');

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($user),
            'message' => 'Permissions updated.',
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
            'permissions' => $user->permissionNames(),
        ];
    }
}
