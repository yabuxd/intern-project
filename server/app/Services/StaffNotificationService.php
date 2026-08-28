<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Role;
use App\Models\StaffNotification;
use App\Models\User;

class StaffNotificationService
{
    public function notifyManagersOfCashOrder(Order $order): void
    {
        $this->notifyManagers(
            $order,
            StaffNotification::TYPE_ORDER_CASH,
            'Cash order #'.$order->id,
            'A cash / pay-later order totaling '.$order->total.' ETB was placed.',
        );
    }

    public function notifyManagersOfChapaPaid(Order $order): void
    {
        $this->notifyManagers(
            $order,
            StaffNotification::TYPE_ORDER_CHAPA_PAID,
            'Chapa payment #'.$order->id,
            'Order #'.$order->id.' was paid online ('.$order->total.' ETB). Awaiting cashier validation.',
        );
    }

    private function notifyManagers(Order $order, string $type, string $title, string $body): void
    {
        $recipientIds = User::query()
            ->whereHas('roles', fn ($query) => $query->whereIn('name', [Role::ADMIN, Role::MANAGER]))
            ->pluck('id');

        if ($recipientIds->isEmpty()) {
            return;
        }

        $now = now();
        $records = $recipientIds->map(fn ($userId) => [
            'user_id' => $userId,
            'order_id' => $order->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        StaffNotification::query()->insert($records);
    }
}
