<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UserPermissionsApiTest extends TestCase
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

    public function test_admin_can_list_users_with_roles(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $customer = $this->userWithRole(Role::CUSTOMER);
        $customer->forceFill(['email' => 'customer@example.com'])->save();

        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users')
            ->assertOk();

        $emails = collect($response->json('data'))->pluck('email')->all();
        $this->assertContains($admin->email, $emails);
        $this->assertContains('customer@example.com', $emails);

        $customerRow = collect($response->json('data'))->firstWhere('email', 'customer@example.com');
        $this->assertContains(Role::CUSTOMER, $customerRow['roles']);
        $this->assertContains(Permission::CAN_PLACE_ORDER, $customerRow['permissions']);
    }

    public function test_admin_can_list_roles_and_permission_catalog(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/permissions')
            ->assertOk()
            ->assertJsonFragment(['name' => Permission::CAN_MANAGE_PERMISSIONS]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonFragment(['name' => Role::ADMIN])
            ->assertJsonFragment(['name' => Role::CUSTOMER]);
    }

    public function test_admin_can_update_user_roles(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $target = User::factory()->create();
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$target->id}/roles", [
                'roles' => [Role::CUSTOMER, Role::KITCHEN],
            ])
            ->assertOk();

        $roles = $response->json('data.roles');
        sort($roles);
        $this->assertEquals([Role::CUSTOMER, Role::KITCHEN], $roles);

        $permissions = $response->json('data.permissions');
        $this->assertContains(Permission::CAN_PLACE_ORDER, $permissions);
        $this->assertContains(Permission::CAN_VIEW_ALL_ORDERS, $permissions);

        $target->load('roles.permissions');
        $this->assertTrue($target->hasPermission(Permission::CAN_PLACE_ORDER));
        $this->assertTrue($target->hasPermission(Permission::CAN_UPDATE_ORDER_STATUS));
    }

    public function test_admin_can_revoke_user_roles(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $target = $this->userWithRole(Role::CUSTOMER);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$target->id}/roles", [
                'roles' => [],
            ])
            ->assertOk()
            ->assertJsonPath('data.roles', [])
            ->assertJsonPath('data.permissions', [Permission::CAN_PLACE_ORDER]);

        $this->assertTrue($target->fresh(['roles.permissions'])->hasPermission(Permission::CAN_PLACE_ORDER));
    }

    public function test_admin_can_update_role_permissions(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $role = Role::query()->where('name', Role::HOST)->firstOrFail();
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/roles/{$role->id}/permissions", [
                'permissions' => [
                    Permission::CAN_MANAGE_TABLES,
                    Permission::CAN_VIEW_ALL_ORDERS,
                ],
            ])
            ->assertOk();

        $names = $response->json('data.permissions');
        sort($names);
        $this->assertEquals([
            Permission::CAN_MANAGE_TABLES,
            Permission::CAN_VIEW_ALL_ORDERS,
        ], $names);
    }

    public function test_user_without_permission_cannot_manage_roles(): void
    {
        $user = User::factory()->create();
        $target = User::factory()->create();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$target->id}/roles", [
                'roles' => [Role::CUSTOMER],
            ])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_user_with_a_role(): void
    {
        config(['services.supabase.service_role_key' => 'test-service-role']);
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users' => Http::response([
                'id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                'email' => 'chef@example.com',
            ], 200),
        ]);

        $admin = $this->userWithRole(Role::ADMIN);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/admin/users', [
                'name' => 'Kitchen Chef',
                'email' => 'chef@example.com',
                'password' => 'password123',
                'roles' => [Role::KITCHEN],
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'chef@example.com')
            ->assertJsonPath('data.roles', [Role::KITCHEN]);

        $this->assertDatabaseHas('users', [
            'id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'email' => 'chef@example.com',
        ]);
    }

    public function test_admin_can_delete_a_user(): void
    {
        config(['services.supabase.service_role_key' => 'test-service-role']);
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/*' => Http::response(null, 200),
        ]);

        $admin = $this->userWithRole(Role::ADMIN);
        $target = $this->userWithRole(Role::CUSTOMER);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/admin/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('message', 'User deleted.');

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_admin_cannot_delete_self(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertForbidden();
    }
}
