<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\RestaurantTable;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\TableSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TablesApiTest extends TestCase
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

        $this->seed([PermissionSeeder::class, TableSeeder::class]);
    }

    public function test_public_can_list_tables(): void
    {
        $response = $this->getJson('/api/tables')->assertOk();

        $this->assertCount(8, $response->json('data'));
        $this->assertEquals('Table 1', $response->json('data.0.name'));
    }

    public function test_staff_can_update_table_status(): void
    {
        $user = $this->userWithPermission(Permission::CAN_MANAGE_TABLES);
        $table = RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/tables/{$table->id}", ['status' => 'occupied'])
            ->assertOk()
            ->assertJsonPath('data.status', 'occupied');

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'status' => 'occupied',
        ]);
    }

    public function test_user_without_permission_cannot_update_table(): void
    {
        $user = User::factory()->create();
        $table = RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/tables/{$table->id}", ['status' => 'occupied'])
            ->assertForbidden();
    }

    public function test_invalid_status_is_rejected(): void
    {
        $user = $this->userWithPermission(Permission::CAN_MANAGE_TABLES);
        $table = RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/tables/{$table->id}", ['status' => 'invalid'])
            ->assertUnprocessable();
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
