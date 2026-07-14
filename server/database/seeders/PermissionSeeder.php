<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $descriptions = [
            Permission::CAN_MANAGE_MENU => 'Create, update, and delete menu items',
            Permission::CAN_VIEW_ALL_ORDERS => 'View the full order queue',
            Permission::CAN_UPDATE_ORDER_STATUS => 'Update order status through the kitchen flow',
            Permission::CAN_MANAGE_TABLES => 'View and update table availability',
            Permission::CAN_PLACE_ORDER => 'Place customer orders',
            Permission::CAN_CREATE_RESERVATION => 'Book restaurant tables',
            Permission::CAN_MANAGE_PERMISSIONS => 'Assign and revoke user permissions',
        ];

        foreach (Permission::catalog() as $name) {
            Permission::query()->updateOrCreate(
                ['name' => $name],
                ['description' => $descriptions[$name] ?? null],
            );
        }
    }
}
