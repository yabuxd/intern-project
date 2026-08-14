<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Cache;

class ApiCacheService
{
    private const MENU_PUBLIC = 'api.menu.public.v2';

    private const MENU_MANAGE = 'api.menu.manage.v2';

    private const TABLES = 'api.tables';

    private const PERMISSIONS_CATALOG = 'api.admin.permissions';

    private const ROLES_CATALOG = 'api.admin.roles';

    public function rememberMenuPublic(Closure $callback): mixed
    {
        return Cache::remember(self::MENU_PUBLIC, $this->ttl('menu'), $callback);
    }

    public function rememberMenuManage(Closure $callback): mixed
    {
        return Cache::remember(self::MENU_MANAGE, $this->ttl('menu'), $callback);
    }

    public function rememberTables(Closure $callback): mixed
    {
        return Cache::remember(self::TABLES, $this->ttl('tables'), $callback);
    }

    /**
     * @return array{roles: list<string>, permissions: list<string>}
     */
    public function rememberUserAuth(string $userId, Closure $callback): array
    {
        /** @var array{roles: list<string>, permissions: list<string>} */
        return Cache::remember(
            $this->userAuthKey($userId),
            $this->ttl('user_auth'),
            $callback,
        );
    }

    public function rememberPermissionsCatalog(Closure $callback): mixed
    {
        return Cache::remember(self::PERMISSIONS_CATALOG, $this->ttl('admin_catalog'), $callback);
    }

    public function rememberRolesCatalog(Closure $callback): mixed
    {
        return Cache::remember(self::ROLES_CATALOG, $this->ttl('admin_catalog'), $callback);
    }

    public function forgetMenu(): void
    {
        Cache::forget(self::MENU_PUBLIC);
        Cache::forget(self::MENU_MANAGE);
    }

    public function forgetTables(): void
    {
        Cache::forget(self::TABLES);
    }

    public function forgetUserAuth(string $userId): void
    {
        Cache::forget($this->userAuthKey($userId));
    }

    public function forgetPermissionsCatalog(): void
    {
        Cache::forget(self::PERMISSIONS_CATALOG);
    }

    public function forgetRolesCatalog(): void
    {
        Cache::forget(self::ROLES_CATALOG);
    }

    public function forgetUsersWithRole(Role $role): void
    {
        $role->loadMissing('users');
        foreach ($role->users as $user) {
            $this->forgetUserAuth($user->id);
        }
    }

    public function forgetAllUserAuth(): void
    {
        User::query()
            ->select('id')
            ->cursor()
            ->each(fn (User $user) => $this->forgetUserAuth($user->id));
    }

    private function userAuthKey(string $userId): string
    {
        return "api.user.auth.{$userId}";
    }

    private function ttl(string $key): int
    {
        return max(1, (int) config("api_cache.ttl.{$key}", 60));
    }
}
