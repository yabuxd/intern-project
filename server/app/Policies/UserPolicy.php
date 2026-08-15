<?php

namespace App\Policies;

use App\Models\Permission;
use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::CAN_MANAGE_PERMISSIONS);
    }

    public function updatePermissions(User $actor, User $target): bool
    {
        return $actor->can(Permission::CAN_MANAGE_PERMISSIONS);
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::CAN_MANAGE_PERMISSIONS);
    }

    public function delete(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return false;
        }

        return $actor->can(Permission::CAN_MANAGE_PERMISSIONS);
    }
}
