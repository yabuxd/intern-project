<?php

namespace App\Models;

use App\Services\ApiCacheService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['id', 'name', 'email', 'email_verified_at', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    /**
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')
            ->withTimestamps();
    }

    public function hasPermission(string $name): bool
    {
        return in_array($name, $this->permissionNames(), true);
    }

    /**
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return $this->authProfile()['permissions'];
    }

    /**
     * @return list<string>
     */
    public function roleNames(): array
    {
        return $this->authProfile()['roles'];
    }

    /**
     * Cached roles and effective permissions for API responses and gates.
     *
     * @return array{roles: list<string>, permissions: list<string>}
     */
    public function authProfile(): array
    {
        return app(ApiCacheService::class)->rememberUserAuth(
            $this->id,
            fn () => $this->buildAuthProfile(),
        );
    }

    /**
     * @return array{roles: list<string>, permissions: list<string>}
     */
    private function buildAuthProfile(): array
    {
        $this->loadMissing('roles.permissions');

        return [
            'roles' => $this->roles->pluck('name')->sort()->values()->all(),
            'permissions' => $this->roles
                ->flatMap(fn (Role $role) => $role->permissions->pluck('name'))
                ->push(Permission::CAN_PLACE_ORDER)
                ->unique()
                ->sort()
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
