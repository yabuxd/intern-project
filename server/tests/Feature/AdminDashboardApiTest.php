<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardApiTest extends TestCase
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

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_non_admin_cannot_view_dashboard(): void
    {
        $customer = $this->userWithRole(Role::CUSTOMER);
        $token = $this->makeToken([
            'sub' => $customer->id,
            'email' => $customer->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_admin_can_view_dashboard_shape(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'range' => ['from', 'to'],
                    'orders' => [
                        'total',
                        'by_status',
                        'by_fulfillment',
                        'cancelled',
                        'revenue_paid',
                        'aov',
                    ],
                    'payments' => [
                        'by_method',
                        'by_status',
                        'awaiting_chapa_validation',
                        'open_cash',
                    ],
                    'deliveries' => ['active', 'unassigned', 'completed'],
                    'reservations' => ['confirmed', 'cancelled', 'upcoming'],
                    'menu' => ['available', 'unavailable', 'top_items'],
                    'floor' => ['tables_by_status'],
                    'staff' => ['by_role', 'unread_notifications'],
                    'menu_change_requests' => ['pending'],
                ],
            ]);
    }

    public function test_manage_permissions_user_can_view_dashboard(): void
    {
        $user = $this->userWithPermission(Permission::CAN_MANAGE_PERMISSIONS);
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/dashboard')
            ->assertOk();
    }
}
