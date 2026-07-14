<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Permission;
use App\Models\RestaurantTable;
use App\Models\User;
use Database\Seeders\MenuCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\TableSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrdersApiTest extends TestCase
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

        $this->seed([PermissionSeeder::class, MenuCategorySeeder::class, TableSeeder::class]);
    }

    public function test_customer_can_place_order(): void
    {
        $user = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $menuItem = $this->createMenuItem();
        $table = RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/orders', [
                'table_id' => $table->id,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.total', '25.98');

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'user_id' => $user->id,
            'table_id' => $table->id,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('order_items', [
            'menu_item_id' => $menuItem->id,
            'quantity' => 2,
            'unit_price' => 12.99,
            'line_total' => 25.98,
        ]);
    }

    public function test_customer_sees_own_orders_only(): void
    {
        $customer = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $other = User::factory()->create();
        $menuItem = $this->createMenuItem();

        $ownOrder = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PENDING,
            'total' => 10,
        ]);

        Order::query()->create([
            'user_id' => $other->id,
            'status' => Order::STATUS_PENDING,
            'total' => 20,
        ]);

        $token = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/orders')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($ownOrder->id, $response->json('data.0.id'));
    }

    public function test_staff_can_view_queue(): void
    {
        $staff = $this->userWithPermission(Permission::CAN_VIEW_ALL_ORDERS);
        $customer = User::factory()->create();

        Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PENDING,
            'total' => 15,
        ]);

        Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_SERVED,
            'total' => 30,
        ]);

        $token = $this->makeToken([
            'sub' => $staff->id,
            'email' => $staff->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/orders/queue')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('pending', $response->json('data.0.status'));
    }

    public function test_staff_can_advance_order_status(): void
    {
        $staff = $this->userWithPermission(Permission::CAN_UPDATE_ORDER_STATUS);
        $customer = User::factory()->create();

        $order = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PENDING,
            'total' => 10,
        ]);

        $token = $this->makeToken([
            'sub' => $staff->id,
            'email' => $staff->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertOk()
            ->assertJsonPath('data.status', 'preparing');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'ready'])
            ->assertOk()
            ->assertJsonPath('data.status', 'ready');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'served'])
            ->assertOk()
            ->assertJsonPath('data.status', 'served');
    }

    public function test_invalid_status_transition_is_rejected(): void
    {
        $staff = $this->userWithPermission(Permission::CAN_UPDATE_ORDER_STATUS);
        $customer = User::factory()->create();

        $order = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PENDING,
            'total' => 10,
        ]);

        $token = $this->makeToken([
            'sub' => $staff->id,
            'email' => $staff->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'served'])
            ->assertUnprocessable();
    }

    public function test_customer_can_cancel_own_pending_order(): void
    {
        $customer = $this->userWithPermission(Permission::CAN_PLACE_ORDER);

        $order = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PENDING,
            'total' => 10,
        ]);

        $token = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_CANCELLED)
            ->assertJsonPath('message', 'Order cancelled.');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => Order::STATUS_CANCELLED,
        ]);
    }

    public function test_customer_cannot_cancel_another_users_order(): void
    {
        $customer = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $other = User::factory()->create();

        $order = Order::query()->create([
            'user_id' => $other->id,
            'status' => Order::STATUS_PENDING,
            'total' => 10,
        ]);

        $token = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/orders/{$order->id}")
            ->assertForbidden();
    }

    public function test_staff_can_cancel_any_order(): void
    {
        $staff = $this->userWithPermission(Permission::CAN_UPDATE_ORDER_STATUS);
        $customer = User::factory()->create();

        $order = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PREPARING,
            'total' => 10,
        ]);

        $token = $this->makeToken([
            'sub' => $staff->id,
            'email' => $staff->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_CANCELLED);
    }

    public function test_served_order_cannot_be_cancelled(): void
    {
        $customer = $this->userWithPermission(Permission::CAN_PLACE_ORDER);

        $order = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_SERVED,
            'total' => 10,
        ]);

        $token = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/orders/{$order->id}")
            ->assertForbidden();
    }

    public function test_user_without_permission_cannot_place_order(): void
    {
        $user = User::factory()->create();
        $menuItem = $this->createMenuItem();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/orders', [
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
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

    private function userWithPermission(string $permissionName): User
    {
        $user = User::factory()->create();
        $permission = Permission::query()->where('name', $permissionName)->firstOrFail();
        $user->permissions()->attach($permission);

        return $user->fresh(['permissions']);
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function makeToken(array $claims): string
    {
        $secret = (string) config('services.supabase.jwt_secret');
        $header = $this->b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->b64(json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = $this->b64(hash_hmac('sha256', $header.'.'.$payload, $secret, true));

        return $header.'.'.$payload.'.'.$signature;
    }

    private function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
