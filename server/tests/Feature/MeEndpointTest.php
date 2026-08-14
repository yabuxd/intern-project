<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.supabase.jwt_secret' => 'test-supabase-jwt-secret-for-feature-tests']);
        $this->seed(PermissionSeeder::class);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_returns_user_roles_and_permissions(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@example.com',
            'name' => 'Staff User',
        ]);

        $permission = Permission::query()->where('name', Permission::CAN_PLACE_ORDER)->firstOrFail();
        $role = Role::query()->create([
            'name' => 'me_test_customer',
            'description' => 'Test',
        ]);
        $role->permissions()->attach($permission);
        $user->roles()->attach($role);

        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
            'user_metadata' => ['full_name' => 'Staff User'],
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', 'staff@example.com')
            ->assertJsonPath('data.roles', ['me_test_customer'])
            ->assertJsonPath('data.permissions', [Permission::CAN_PLACE_ORDER]);
    }

    public function test_me_creates_user_from_token_when_missing(): void
    {
        $supabaseId = '22222222-2222-2222-2222-222222222222';
        $token = $this->makeToken([
            'sub' => $supabaseId,
            'email' => 'new@example.com',
            'exp' => time() + 3600,
            'email_verified' => true,
            'user_metadata' => ['name' => 'New Diner'],
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.id', $supabaseId)
            ->assertJsonPath('data.email', 'new@example.com')
            ->assertJsonPath('data.roles', [])
            ->assertJsonPath('data.permissions', [Permission::CAN_PLACE_ORDER]);

        $this->assertDatabaseHas('users', [
            'id' => $supabaseId,
            'email' => 'new@example.com',
        ]);
    }

    public function test_new_users_receive_the_customer_role_by_default(): void
    {
        $this->seed(RoleSeeder::class);

        $supabaseId = '33333333-3333-3333-3333-333333333333';
        $token = $this->makeToken([
            'sub' => $supabaseId,
            'email' => 'diner@example.com',
            'exp' => time() + 3600,
            'email_verified' => true,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.roles', [Role::CUSTOMER])
            ->assertJsonFragment(['can_place_order']);
    }
}
