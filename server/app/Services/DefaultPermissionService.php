<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\User;

class DefaultPermissionService
{
    /**
     * @return list<string>
     */
    public static function names(): array
    {
        return [
            Permission::CAN_CREATE_RESERVATION,
            Permission::CAN_PLACE_ORDER,
            Permission::CAN_VIEW_ALL_ORDERS,
        ];
    }

    public function grantToNewUser(User $user): void
    {
        $permissionIds = Permission::query()
            ->whereIn('name', self::names())
            ->pluck('id');

        $user->permissions()->syncWithoutDetaching($permissionIds);
    }
}
