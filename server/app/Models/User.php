<?php

namespace App\Models;

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
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'user_permissions')
            ->withTimestamps();
    }

    public function hasPermission(string $name): bool
    {
        return $this->permissions->contains('name', $name);
    }

    /**
     * Menu CRUD is allowed for menu managers and full admins.
     */
    public function canManageMenuItems(): bool
    {
        return $this->hasPermission(Permission::CAN_MANAGE_MENU)
            || $this->hasPermission(Permission::CAN_MANAGE_PERMISSIONS);
    }

    /**
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return $this->permissions->pluck('name')->values()->all();
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
