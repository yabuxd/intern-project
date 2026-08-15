<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ApiCacheService;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $descriptions = [
            Role::CUSTOMER => 'Place orders and book tables',
            Role::KITCHEN => 'Run the kitchen queue and propose menu add/remove for approval',
            Role::HOST => 'Manage dining tables and reservations',
            Role::MANAGER => 'Run menu, floor, and kitchen operations',
            Role::ADMIN => 'Full access including role assignment',
            Role::DRIVER => 'Pick up ready orders and mark them delivered',
            Role::CASHIER => 'Validate online payments and collect cash before kitchen prep',
        ];

        $permissionMap = [
            Role::CUSTOMER => [
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_CREATE_RESERVATION,
            ],
            Role::KITCHEN => [
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_VIEW_ALL_ORDERS,
                Permission::CAN_UPDATE_ORDER_STATUS,
                Permission::CAN_PROPOSE_MENU_CHANGES,
            ],
            Role::HOST => [
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_MANAGE_TABLES,
                Permission::CAN_CREATE_RESERVATION,
            ],
            Role::MANAGER => [
                Permission::CAN_MANAGE_MENU,
                Permission::CAN_MANAGE_TABLES,
                Permission::CAN_VIEW_ALL_ORDERS,
                Permission::CAN_UPDATE_ORDER_STATUS,
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_CREATE_RESERVATION,
                Permission::CAN_MANAGE_DELIVERIES,
                Permission::CAN_ACCEPT_DELIVERY_ORDERS,
                Permission::CAN_MANAGE_PAYMENTS,
            ],
            Role::ADMIN => Permission::catalog(),
            Role::DRIVER => [
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_MANAGE_DELIVERIES,
            ],
            Role::CASHIER => [
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_MANAGE_PAYMENTS,
            ],
        ];

        $permissionIds = Permission::query()
            ->whereIn('name', Permission::catalog())
            ->pluck('id', 'name');

        foreach (Role::catalog() as $name) {
            $role = Role::query()->updateOrCreate(
                ['name' => $name],
                ['description' => $descriptions[$name] ?? null],
            );

            $ids = collect($permissionMap[$name] ?? [])
                ->map(fn (string $permissionName) => $permissionIds[$permissionName] ?? null)
                ->filter()
                ->values()
                ->all();

            $role->permissions()->sync($ids);
        }

        $customerId = Role::query()->where('name', Role::CUSTOMER)->value('id');
        if ($customerId) {
            User::query()
                ->whereDoesntHave('roles')
                ->each(fn (User $user) => $user->roles()->syncWithoutDetaching([$customerId]));
        }

        $cache = app(ApiCacheService::class);
        $cache->forgetRolesCatalog();
        $cache->forgetAllUserAuth();
    }
}
