<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffNotification;
use App\Models\User;
use Database\Seeders\MenuCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.jwt_secret' => 'test-supabase-jwt-secret-for-feature-tests',
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.anon_key' => 'test-anon-key',
            'services.chapa.secret_key' => 'CHASECK_TEST-fake',
            'services.chapa.public_key' => 'CHAPUBK_TEST-fake',
            'services.chapa.base_url' => 'https://api.chapa.co',
            'app.url' => 'http://localhost:8000',
        ]);

        $this->seed([PermissionSeeder::class, RoleSeeder::class, MenuCategorySeeder::class]);
    }

    public function test_cash_order_is_visible_in_kitchen_queue(): void
    {
        $customer = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $kitchen = $this->userWithPermissions([
            Permission::CAN_VIEW_ALL_ORDERS,
            Permission::CAN_UPDATE_ORDER_STATUS,
        ]);
        $manager = $this->userWithRole(Role::MANAGER);
        $menuItem = $this->createMenuItem();

        $customerToken = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);
        $kitchenToken = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);

        $created = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->postJson('/api/orders', [
                'payment_method' => Order::PAYMENT_METHOD_CASH,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'cash')
            ->assertJsonPath('data.payment_status', 'not_required');

        $this->assertDatabaseHas('staff_notifications', [
            'user_id' => $manager->id,
            'order_id' => $created->json('data.id'),
            'type' => StaffNotification::TYPE_ORDER_CASH,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->getJson('/api/orders/queue')
            ->assertOk()
            ->assertJsonPath('data.0.id', $created->json('data.id'));
    }

    public function test_chapa_order_needs_cashier_approval_before_kitchen(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'message' => 'Hosted Link',
                'data' => [
                    'checkout_url' => 'https://checkout.chapa.co/checkout/test-payment',
                ],
            ], 200),
            'https://api.chapa.co/v1/transaction/verify/*' => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'success',
                    'amount' => 12.99,
                ],
            ], 200),
        ]);

        $customer = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $kitchen = $this->userWithPermissions([
            Permission::CAN_VIEW_ALL_ORDERS,
            Permission::CAN_UPDATE_ORDER_STATUS,
        ]);
        $cashier = $this->userWithRole(Role::CASHIER);
        $menuItem = $this->createMenuItem();

        $customerToken = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);
        $kitchenToken = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);
        $cashierToken = $this->makeToken([
            'sub' => $cashier->id,
            'email' => $cashier->email,
            'exp' => time() + 3600,
        ]);

        $created = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->postJson('/api/orders', [
                'payment_method' => Order::PAYMENT_METHOD_CHAPA,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.payment_status', 'pending');

        $orderId = $created->json('data.id');
        $txRef = $created->json('data.payment_reference');

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson("/api/orders/{$orderId}/payment/verify?trx_ref={$txRef}")
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'paid');

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->getJson('/api/orders/queue')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeader('Authorization', 'Bearer '.$cashierToken)
            ->getJson('/api/payments/desk')
            ->assertOk()
            ->assertJsonPath('data.awaiting_chapa_validation.0.id', $orderId);

        $approved = $this->withHeader('Authorization', 'Bearer '.$cashierToken)
            ->postJson("/api/orders/{$orderId}/cashier/approve")
            ->assertOk();

        $this->assertNotEmpty($approved->json('data.cashier_approved_at'));

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->getJson('/api/orders/queue')
            ->assertOk()
            ->assertJsonPath('data.0.id', $orderId);

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson("/api/orders/{$orderId}/receipt")
            ->assertOk()
            ->assertJsonPath('data.receipt_number', 'R-'.$orderId);
    }

    public function test_chapa_webhook_marks_order_paid(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/*' => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'success',
                    'amount' => 20,
                ],
            ], 200),
        ]);

        $customer = User::factory()->create();
        $order = Order::query()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PENDING,
            'total' => 20,
            'payment_method' => Order::PAYMENT_METHOD_CHAPA,
            'payment_status' => Order::PAYMENT_PENDING,
            'payment_reference' => 'order-99-abcd',
        ]);

        $payload = json_encode(['trx_ref' => 'order-99-abcd', 'status' => 'success'], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $payload, 'CHASECK_TEST-fake');

        $this->call(
            'POST',
            '/api/payments/chapa/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_CHAPA_SIGNATURE' => $signature,
            ],
            $payload,
        )->assertOk();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => Order::PAYMENT_PAID,
        ]);
    }

    private function createMenuItem(): MenuItem
    {
        $category = MenuCategory::query()->firstOrFail();

        return MenuItem::query()->create([
            'menu_category_id' => $category->id,
            'name' => 'Tibs',
            'price' => 12.99,
            'is_available' => true,
        ]);
    }
}
