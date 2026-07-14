<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
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

    public function test_me_returns_user_and_permissions(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@example.com',
            'name' => 'Staff User',
        ]);

        $permission = Permission::query()->where('name', Permission::CAN_PLACE_ORDER)->firstOrFail();
        $user->permissions()->attach($permission);

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

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.id', $supabaseId)
            ->assertJsonPath('data.email', 'new@example.com');

        $this->assertEqualsCanonicalizing(
            [
                Permission::CAN_CREATE_RESERVATION,
                Permission::CAN_PLACE_ORDER,
                Permission::CAN_VIEW_ALL_ORDERS,
            ],
            $response->json('data.permissions'),
        );

        $this->assertDatabaseHas('users', [
            'id' => $supabaseId,
            'email' => 'new@example.com',
        ]);
    }

    public function test_existing_user_keeps_custom_permissions_on_authentication(): void
    {
        $user = User::factory()->create([
            'email' => 'custom@example.com',
            'name' => 'Custom User',
        ]);

        $customPermission = Permission::query()
            ->where('name', Permission::CAN_MANAGE_MENU)
            ->firstOrFail();
        $user->permissions()->attach($customPermission);

        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
            'user_metadata' => ['full_name' => 'Custom User'],
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.permissions', [Permission::CAN_MANAGE_MENU]);

        $user->load('permissions');
        $this->assertTrue($user->hasPermission(Permission::CAN_MANAGE_MENU));
        $this->assertFalse($user->hasPermission(Permission::CAN_PLACE_ORDER));
        $this->assertFalse($user->hasPermission(Permission::CAN_CREATE_RESERVATION));
        $this->assertFalse($user->hasPermission(Permission::CAN_VIEW_ALL_ORDERS));
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
