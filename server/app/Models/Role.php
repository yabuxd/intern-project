<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description'])]
class Role extends Model
{
    public const CUSTOMER = 'customer';

    public const KITCHEN = 'kitchen';

    public const HOST = 'host';

    public const MANAGER = 'manager';

    public const ADMIN = 'admin';

    public const DRIVER = 'driver';

    public const CASHIER = 'cashier';

    /**
     * @return list<string>
     */
    public static function catalog(): array
    {
        return [
            self::CUSTOMER,
            self::KITCHEN,
            self::HOST,
            self::MANAGER,
            self::ADMIN,
            self::DRIVER,
            self::CASHIER,
        ];
    }

    /**
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles')
            ->withTimestamps();
    }

    /**
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return $this->permissions->pluck('name')->values()->all();
    }
}
