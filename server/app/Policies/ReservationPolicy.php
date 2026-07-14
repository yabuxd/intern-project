<?php

namespace App\Policies;

use App\Models\Permission;
use App\Models\Reservation;
use App\Models\User;

class ReservationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::CAN_CREATE_RESERVATION)
            || $user->can(Permission::CAN_MANAGE_TABLES);
    }

    public function view(User $user, Reservation $reservation): bool
    {
        return $reservation->user_id === $user->id
            || $user->can(Permission::CAN_MANAGE_TABLES);
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::CAN_CREATE_RESERVATION);
    }

    public function delete(User $user, Reservation $reservation): bool
    {
        if ($reservation->status === Reservation::STATUS_CANCELLED) {
            return false;
        }

        return $reservation->user_id === $user->id
            || $user->can(Permission::CAN_MANAGE_TABLES);
    }
}
