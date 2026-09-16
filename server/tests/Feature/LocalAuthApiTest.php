<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalAuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.auth.driver' => 'local',
            'services.supabase.jwt_secret' => 'test-supabase-jwt-secret-for-feature-tests',
        ]);

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_local_auth_is_hidden_when_disabled(): void
    {
        config(['services.auth.driver' => 'supabase']);

        $this->postJson('/api/auth/login', [
            'email' => 'diner@example.com',
            'password' => 'secret1',
        ])->assertNotFound();
    }

    public function test_login_returns_a_token_the_me_endpoint_accepts(): void
    {
        $user = User::factory()->create([
            'email' => 'diner@example.com',
            'password' => 'secret1',
        ]);
        $user->roles()->attach(Role::query()->where('name', Role::CUSTOMER)->value('id'));

        $login = $this->postJson('/api/auth/login', [
            'email' => 'diner@example.com',
            'password' => 'secret1',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'diner@example.com');

        $token = $login->json('data.access_token');
        $this->assertIsString($token);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'diner@example.com')
            ->assertJsonPath('data.roles', [Role::CUSTOMER]);
    }

    public function test_login_rejects_bad_credentials(): void
    {
        User::factory()->create([
            'email' => 'diner@example.com',
            'password' => 'secret1',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'diner@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }

    public function test_register_creates_a_customer_and_returns_a_token(): void
    {
        $register = $this->postJson('/api/auth/register', [
            'email' => 'new@example.com',
            'password' => 'secret1',
            'full_name' => 'New Diner',
        ])->assertCreated()
            ->assertJsonPath('data.user.email', 'new@example.com');

        $token = $register->json('data.access_token');
        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'New Diner')
            ->assertJsonPath('data.roles', [Role::CUSTOMER]);
    }
}
