<?php

namespace App\Policies;

use App\Models\MenuItem;
use App\Models\Permission;
use App\Models\User;

class MenuItemPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::CAN_MANAGE_MENU);
    }

    public function view(User $user, MenuItem $menuItem): bool
    {
        return $user->can(Permission::CAN_MANAGE_MENU);
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::CAN_MANAGE_MENU);
    }

    public function update(User $user, MenuItem $menuItem): bool
    {
        return $user->can(Permission::CAN_MANAGE_MENU);
    }

    public function delete(User $user, MenuItem $menuItem): bool
    {
        return $user->can(Permission::CAN_MANAGE_MENU);
    }
}
