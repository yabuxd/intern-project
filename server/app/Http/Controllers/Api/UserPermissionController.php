<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdminUserRequest;
use App\Http\Requests\UpdateRolePermissionsRequest;
use App\Http\Requests\UpdateUserRolesRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ApiCacheService;
use App\Services\SupabaseAdminUserService;
use App\Support\KeysetPaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class UserPermissionController extends Controller
{
    public function __construct(
        private readonly ApiCacheService $cache,
        private readonly SupabaseAdminUserService $authUsers,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->with([
                'roles:id,name',
                'roles.permissions:id,name',
            ]);

        [$users, $meta] = KeysetPaginator::paginate($query, $request, 'id', 'asc');

        return response()->json([
            'success' => true,
            'data' => $users->map(fn (User $user) => $this->transformUser($user))->values(),
            'meta' => $meta,
        ]);
    }

    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $email = strtolower(trim($request->validated('email')));
        $name = trim((string) ($request->validated('name') ?? ''));
        if ($name === '') {
            $local = strstr($email, '@', true);
            $name = is_string($local) && $local !== '' ? $local : $email;
        }

        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['A user with this email already exists.'],
            ]);
        }

        if ($this->usesLocalAuth()) {
            $user = User::query()->create([
                'email' => $email,
                'name' => $name,
                'password' => $request->validated('password'),
                'email_verified_at' => now(),
            ]);
        } else {
            try {
                $auth = $this->authUsers->createUser($email, $request->validated('password'), $name);
            } catch (RuntimeException $e) {
                throw ValidationException::withMessages([
                    'email' => [$e->getMessage()],
                ]);
            }

            $user = User::query()->create([
                'id' => $auth['id'],
                'email' => $auth['email'],
                'name' => $name,
                'email_verified_at' => now(),
            ]);
        }

        $roleNames = $request->validated('roles') ?? [Role::CUSTOMER];
        $roleIds = Role::query()->whereIn('name', $roleNames)->pluck('id');
        $user->roles()->sync($roleIds);
        $user->load('roles.permissions');
        $this->cache->forgetUserAuth($user->id);
        $this->cache->forgetDrivers();

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($user),
            'message' => 'User created.',
        ], 201);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($request->user()?->id === $user->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own account.'],
            ]);
        }

        if (! $this->usesLocalAuth()) {
            try {
                $this->authUsers->deleteUser($user->id);
            } catch (RuntimeException $e) {
                throw ValidationException::withMessages([
                    'user' => [$e->getMessage()],
                ]);
            }
        }

        $userId = $user->id;
        $user->roles()->detach();
        $user->delete();
        $this->cache->forgetUserAuth($userId);
        $this->cache->forgetDrivers();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'User deleted.',
        ]);
    }

    public function permissions(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $permissions = $this->cache->rememberPermissionsCatalog(function () {
            return Permission::query()
                ->select(['id', 'name', 'description'])
                ->orderBy('name')
                ->get()
                ->map(fn (Permission $permission) => [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'description' => $permission->description,
                ])
                ->all();
        });

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    public function roles(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $roles = $this->cache->rememberRolesCatalog(function () {
            return Role::query()
                ->select(['id', 'name', 'description'])
                ->with('permissions:id,name')
                ->orderBy('name')
                ->get()
                ->map(fn (Role $role) => $this->transformRole($role))
                ->all();
        });

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
        $this->cache->forgetUserAuth($user->id);
        $this->cache->forgetDrivers();

        return response()->json([
            'success' => true,
            'data' => $this->transformUser($user),
            'message' => 'Roles updated.',
        ]);
    }

    public function updateRolePermissions(UpdateRolePermissionsRequest $request, Role $role): JsonResponse
    {
        abort_unless($request->user()?->can(Permission::CAN_MANAGE_PERMISSIONS), 403);

        $permissionIds = Permission::query()
            ->whereIn('name', $request->validated('permissions'))
            ->pluck('id');

        $role->permissions()->sync($permissionIds);
        $role->load('permissions');
        $this->cache->forgetRolesCatalog();
        $this->cache->forgetUsersWithRole($role);

        return response()->json([
            'success' => true,
            'data' => $this->transformRole($role),
            'message' => 'Role permissions updated.',
        ]);
    }

    private function usesLocalAuth(): bool
    {
        return (string) config('services.auth.driver', 'supabase') === 'local';
    }

    /**
     * @return array<string, mixed>
     */
    private function transformUser(User $user): array
    {
        if ($user->relationLoaded('roles')) {
            $roles = $user->roles->pluck('name')->sort()->values()->all();
            $permissions = $user->roles
                ->flatMap(fn ($role) => $role->relationLoaded('permissions') ? $role->permissions->pluck('name') : [])
                ->push(Permission::CAN_PLACE_ORDER)
                ->unique()
                ->sort()
                ->values()
                ->all();

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $roles,
                'permissions' => $permissions,
            ];
        }

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
