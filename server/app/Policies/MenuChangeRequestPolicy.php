<?php

namespace App\Policies;

use App\Models\MenuChangeRequest;
use App\Models\Permission;
use App\Models\User;

class MenuChangeRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::CAN_PROPOSE_MENU_CHANGES)
            || $user->can(Permission::CAN_MANAGE_MENU);
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::CAN_PROPOSE_MENU_CHANGES)
            || $user->can(Permission::CAN_MANAGE_MENU);
    }

    public function review(User $user, MenuChangeRequest $request): bool
    {
        return $user->can(Permission::CAN_MANAGE_MENU);
    }
}
