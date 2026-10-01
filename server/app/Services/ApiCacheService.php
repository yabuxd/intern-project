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

    private const DASHBOARD_PREFIX = 'api.admin.dashboard.';

    private const USER_ENTITY_PREFIX = 'api.user.entity.';

    private const DRIVERS = 'api.drivers';

    /**
     * Static request-level memory cache (0ms RAM cache for repeated reads within a lifecycle).
     *
     * @var array<string, mixed>
     */
    private static array $memoryCache = [];

    /**
     * Flush request-level in-memory cache.
     */
    public static function flushMemory(): void
    {
        self::$memoryCache = [];
    }

    /**
     * Remember using static memory (RAM) first, then persistent cache.
     */
    private function rememberWithMemory(string $key, int $ttlSeconds, Closure $callback): mixed
    {
        if (array_key_exists($key, self::$memoryCache)) {
            return self::$memoryCache[$key];
        }

        $value = Cache::remember($key, $ttlSeconds, $callback);
        self::$memoryCache[$key] = $value;

        return $value;
    }

    /**
     * Forget from both memory and persistent cache.
     */
    private function forgetWithMemory(string $key): void
    {
        unset(self::$memoryCache[$key]);
        Cache::forget($key);
    }

    public function rememberMenuPublic(Closure $callback): mixed
    {
        return $this->rememberWithMemory(self::MENU_PUBLIC, $this->ttl('menu'), $callback);
    }

    public function rememberMenuManage(Closure $callback): mixed
    {
        return $this->rememberWithMemory(self::MENU_MANAGE, $this->ttl('menu'), $callback);
    }

    public function rememberTables(Closure $callback): mixed
    {
        return $this->rememberWithMemory(self::TABLES, $this->ttl('tables'), $callback);
    }

    public function rememberDrivers(Closure $callback): mixed
    {
        return $this->rememberWithMemory(self::DRIVERS, $this->ttl('admin_catalog'), $callback);
    }

    public function forgetDrivers(): void
    {
        $this->forgetWithMemory(self::DRIVERS);
    }

    /**
     * @return array{roles: list<string>, permissions: list<string>}
     */
    public function rememberUserAuth(string $userId, Closure $callback): array
    {
        /** @var array{roles: list<string>, permissions: list<string>} */
        return $this->rememberWithMemory(
            $this->userAuthKey($userId),
            $this->ttl('user_auth'),
            $callback,
        );
    }

    /**
     * Cached resolved User entity attributes (avoids DB hits in JWT middleware).
     *
     * @return array<string, mixed>|null
     */
    public function rememberUserEntity(string $userId, Closure $callback): ?array
    {
        /** @var array<string, mixed>|null */
        return $this->rememberWithMemory(
            $this->userEntityKey($userId),
            $this->ttl('user_entity'),
            $callback,
        );
    }

    public function rememberPermissionsCatalog(Closure $callback): mixed
    {
        return $this->rememberWithMemory(self::PERMISSIONS_CATALOG, $this->ttl('admin_catalog'), $callback);
    }

    public function rememberRolesCatalog(Closure $callback): mixed
    {
        return $this->rememberWithMemory(self::ROLES_CATALOG, $this->ttl('admin_catalog'), $callback);
    }

    /**
     * Cache computed admin dashboard metrics by date range.
     *
     * @return array<string, mixed>
     */
    public function rememberAdminDashboard(string $fromIso, string $toIso, Closure $callback): array
    {
        $hash = substr(hash('sha256', "{$fromIso}|{$toIso}"), 0, 16);
        $key = self::DASHBOARD_PREFIX.$hash;

        /** @var array<string, mixed> */
        return $this->rememberWithMemory($key, $this->ttl('dashboard'), $callback);
    }

    public function forgetMenu(): void
    {
        $this->forgetWithMemory(self::MENU_PUBLIC);
        $this->forgetWithMemory(self::MENU_MANAGE);
        $this->forgetAdminDashboard();
    }

    public function forgetTables(): void
    {
        $this->forgetWithMemory(self::TABLES);
        $this->forgetAdminDashboard();
    }

    public function forgetUserAuth(string $userId): void
    {
        $this->forgetWithMemory($this->userAuthKey($userId));
    }

    public function forgetUserEntity(string $userId): void
    {
        $this->forgetWithMemory($this->userEntityKey($userId));
    }

    public function forgetAdminDashboard(): void
    {
        // Clear memory cache keys matching dashboard
        foreach (array_keys(self::$memoryCache) as $key) {
            if (str_starts_with($key, self::DASHBOARD_PREFIX)) {
                unset(self::$memoryCache[$key]);
            }
        }
    }

    public function forgetPermissionsCatalog(): void
    {
        $this->forgetWithMemory(self::PERMISSIONS_CATALOG);
    }

    public function forgetRolesCatalog(): void
    {
        $this->forgetWithMemory(self::ROLES_CATALOG);
    }

    public function forgetUsersWithRole(Role $role): void
    {
        $role->loadMissing('users');
        foreach ($role->users as $user) {
            $this->forgetUserAuth($user->id);
            $this->forgetUserEntity($user->id);
        }
    }

    public function forgetAllUserAuth(): void
    {
        self::$memoryCache = [];
        User::query()
            ->select('id')
            ->cursor()
            ->each(function (User $user) {
                $this->forgetUserAuth($user->id);
                $this->forgetUserEntity($user->id);
            });
    }

    private function userAuthKey(string $userId): string
    {
        return "api.user.auth.{$userId}";
    }

    private function userEntityKey(string $userId): string
    {
        return self::USER_ENTITY_PREFIX.$userId;
    }

    private function ttl(string $key): int
    {
        return max(1, (int) config("api_cache.ttl.{$key}", 60));
    }
}
