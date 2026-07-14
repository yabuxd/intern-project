<?php

namespace App\Policies;

use App\Models\Permission;
use App\Models\RestaurantTable;
use App\Models\User;

class RestaurantTablePolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, RestaurantTable $table): bool
    {
        return true;
    }

    public function update(User $user, RestaurantTable $table): bool
    {
        return $user->can(Permission::CAN_MANAGE_TABLES);
    }
}
