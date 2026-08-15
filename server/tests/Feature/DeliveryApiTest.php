<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\MenuCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.jwt_secret' => 'test-supabase-jwt-secret-for-feature-tests',
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.anon_key' => 'test-anon-key',
        ]);

        $this->seed([PermissionSeeder::class, RoleSeeder::class, MenuCategorySeeder::class]);
    }

    public function test_customer_can_place_delivery_order(): void
    {
        $user = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $menuItem = $this->createMenuItem();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/orders', [
                'fulfillment_type' => Order::FULFILLMENT_DELIVERY,
                'delivery_address' => 'Bole Road, Addis Ababa',
                'delivery_phone' => '+251911000000',
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.fulfillment_type', 'delivery')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.delivery_address', 'Bole Road, Addis Ababa')
            ->assertJsonPath('data.table_id', null);
    }

    public function test_new_delivery_order_appears_in_deliveries_for_manager(): void
    {
        $manager = $this->userWithPermission(Permission::CAN_MANAGE_DELIVERIES);
        $customer = User::factory()->create();
        $order = Order::query()->create([
            'user_id' => $customer->id,
            'fulfillment_type' => Order::FULFILLMENT_DELIVERY,
            'delivery_address' => 'Bole',
            'delivery_phone' => '0911',
            'status' => Order::STATUS_PENDING,
            'total' => 20,
        ]);

        $token = $this->makeToken([
            'sub' => $manager->id,
            'email' => $manager->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/deliveries')
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_manager_accepts_then_kitchen_and_driver_and_customer_complete_flow(): void
    {
        $manager = $this->userWithPermissions([
            Permission::CAN_ACCEPT_DELIVERY_ORDERS,
            Permission::CAN_MANAGE_DELIVERIES,
        ]);
        $kitchen = $this->userWithPermissions([
            Permission::CAN_VIEW_ALL_ORDERS,
            Permission::CAN_UPDATE_ORDER_STATUS,
        ]);
        $driver = $this->userWithRole(Role::DRIVER);
        $customer = User::factory()->create();
        $order = Order::query()->create([
            'user_id' => $customer->id,
            'fulfillment_type' => Order::FULFILLMENT_DELIVERY,
            'delivery_address' => 'Bole Road',
            'delivery_phone' => '0911000000',
            'delivery_notes' => 'Gate 2',
            'status' => Order::STATUS_PENDING,
            'total' => 20,
        ]);

        $managerToken = $this->makeToken([
            'sub' => $manager->id,
            'email' => $manager->email,
            'exp' => time() + 3600,
        ]);
        $kitchenToken = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);
        $driverToken = $this->makeToken([
            'sub' => $driver->id,
            'email' => $driver->email,
            'exp' => time() + 3600,
        ]);
        $customerToken = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertUnprocessable();

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->getJson('/api/orders/queue')
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->id);

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertOk()
            ->assertJsonPath('data.status', 'preparing');

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'ready'])
            ->assertOk()
            ->assertJsonPath('data.status', 'ready');

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->patchJson("/api/orders/{$order->id}/driver", ['driver_id' => $driver->id])
            ->assertOk()
            ->assertJsonPath('data.driver_id', $driver->id);

        $this->withHeader('Authorization', 'Bearer '.$driverToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'out_for_delivery'])
            ->assertOk()
            ->assertJsonPath('data.status', 'out_for_delivery');

        $this->withHeader('Authorization', 'Bearer '.$driverToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'received'])
            ->assertOk()
            ->assertJsonPath('data.status', 'received');
    }

    public function test_delivery_order_requires_address_and_phone(): void
    {
        $user = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $menuItem = $this->createMenuItem();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/orders', [
                'fulfillment_type' => Order::FULFILLMENT_DELIVERY,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_address', 'delivery_phone']);
    }

    public function test_ready_delivery_cannot_be_marked_served(): void
    {
        $kitchen = $this->userWithPermission(Permission::CAN_UPDATE_ORDER_STATUS);
        $customer = User::factory()->create();
        $order = Order::query()->create([
            'user_id' => $customer->id,
            'fulfillment_type' => Order::FULFILLMENT_DELIVERY,
            'delivery_address' => 'Bole',
            'delivery_phone' => '0911',
            'status' => Order::STATUS_READY,
            'total' => 20,
        ]);

        $token = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'served'])
            ->assertUnprocessable();
    }

    public function test_cannot_start_delivery_without_driver(): void
    {
        $dispatcher = $this->userWithPermission(Permission::CAN_MANAGE_DELIVERIES);
        $customer = User::factory()->create();
        $order = Order::query()->create([
            'user_id' => $customer->id,
            'fulfillment_type' => Order::FULFILLMENT_DELIVERY,
            'delivery_address' => 'Bole',
            'delivery_phone' => '0911',
            'status' => Order::STATUS_READY,
            'total' => 20,
        ]);

        $token = $this->makeToken([
            'sub' => $dispatcher->id,
            'email' => $dispatcher->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'out_for_delivery'])
            ->assertUnprocessable();
    }

    public function test_user_without_delivery_permission_cannot_view_queue(): void
    {
        $user = User::factory()->create();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/deliveries')
            ->assertForbidden();
    }

    private function createMenuItem(): MenuItem
    {
        $category = MenuCategory::query()->firstOrFail();

        return MenuItem::query()->create([
            'menu_category_id' => $category->id,
            'name' => 'Injera',
            'price' => 12.99,
            'is_available' => true,
        ]);
    }
}
