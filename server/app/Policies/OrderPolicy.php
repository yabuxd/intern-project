<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\Permission;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::CAN_VIEW_ALL_ORDERS);
    }

    public function view(User $user, Order $order): bool
    {
        return $user->can(Permission::CAN_VIEW_ALL_ORDERS) || $user->id === $order->user_id;
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::CAN_PLACE_ORDER);
    }

    public function updateStatus(User $user, Order $order): bool
    {
        return $user->can(Permission::CAN_UPDATE_ORDER_STATUS);
    }

    public function cancel(User $user, Order $order): bool
    {
        if (! $order->isCancellable()) {
            return false;
        }

        return $user->id === $order->user_id
            || $user->can(Permission::CAN_UPDATE_ORDER_STATUS);
    }
}
