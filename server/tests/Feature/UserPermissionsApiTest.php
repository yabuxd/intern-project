<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

        $this->seed(PermissionSeeder::class);
    }

    public function test_admin_can_list_users_with_permissions(): void
    {
        $admin = $this->userWithPermission(Permission::CAN_MANAGE_PERMISSIONS);
        $customer = User::factory()->create(['email' => 'customer@example.com']);
        $placeOrder = Permission::query()->where('name', Permission::CAN_PLACE_ORDER)->firstOrFail();
        $customer->permissions()->attach($placeOrder);

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
    }

    public function test_admin_can_list_permission_catalog(): void
    {
        $admin = $this->userWithPermission(Permission::CAN_MANAGE_PERMISSIONS);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/permissions')
            ->assertOk()
            ->assertJsonFragment(['name' => Permission::CAN_MANAGE_PERMISSIONS]);
    }

    public function test_admin_can_update_user_permissions(): void
    {
        $admin = $this->userWithPermission(Permission::CAN_MANAGE_PERMISSIONS);
        $target = User::factory()->create();
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$target->id}/permissions", [
                'permissions' => [
                    Permission::CAN_PLACE_ORDER,
                    Permission::CAN_CREATE_RESERVATION,
                ],
            ])
            ->assertOk();

        $names = $response->json('data.permissions');
        sort($names);
        $this->assertEquals([
            Permission::CAN_CREATE_RESERVATION,
            Permission::CAN_PLACE_ORDER,
        ], $names);

        $target->load('permissions');
        $this->assertTrue($target->hasPermission(Permission::CAN_PLACE_ORDER));
        $this->assertTrue($target->hasPermission(Permission::CAN_CREATE_RESERVATION));
    }

    public function test_admin_can_revoke_permissions(): void
    {
        $admin = $this->userWithPermission(Permission::CAN_MANAGE_PERMISSIONS);
        $target = $this->userWithPermission(Permission::CAN_PLACE_ORDER);
        $token = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$target->id}/permissions", [
                'permissions' => [],
            ])
            ->assertOk()
            ->assertJsonPath('data.permissions', []);

        $this->assertFalse($target->fresh(['permissions'])->hasPermission(Permission::CAN_PLACE_ORDER));
    }

    public function test_user_without_permission_cannot_manage_permissions(): void
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
            ->putJson("/api/admin/users/{$target->id}/permissions", [
                'permissions' => [Permission::CAN_PLACE_ORDER],
            ])
            ->assertForbidden();
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
