<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ApiCacheService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\TableSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ApiCacheTest extends TestCase
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

        $this->seed([PermissionSeeder::class, RoleSeeder::class, TableSeeder::class]);
    }

    public function test_user_auth_cache_is_invalidated_when_roles_change(): void
    {
        $admin = $this->userWithRole(Role::ADMIN);
        $target = User::factory()->create();
        $adminToken = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $targetToken = $this->makeToken([
            'sub' => $target->id,
            'email' => $target->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$targetToken)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.permissions', []);

        $this->withHeader('Authorization', 'Bearer '.$adminToken)
            ->putJson("/api/admin/users/{$target->id}/roles", [
                'roles' => [Role::CUSTOMER],
            ])
            ->assertOk()
            ->assertJsonFragment(['can_place_order']);

        $this->withHeader('Authorization', 'Bearer '.$targetToken)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonFragment(['can_place_order']);
    }

    public function test_tables_cache_is_invalidated_on_update(): void
    {
        $staff = $this->userWithPermission(Permission::CAN_MANAGE_TABLES);
        $table = \App\Models\RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $staff->id,
            'email' => $staff->email,
            'exp' => time() + 3600,
        ]);

        $this->getJson('/api/tables')->assertOk();
        $this->assertTrue(Cache::has('api.tables'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/tables/{$table->id}", ['status' => 'occupied'])
            ->assertOk();

        $this->assertFalse(Cache::has('api.tables'));
    }
}
