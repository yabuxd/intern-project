<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\TableSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationsApiTest extends TestCase
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

    public function test_customer_can_create_reservation(): void
    {
        $user = $this->userWithPermission(Permission::CAN_CREATE_RESERVATION);
        $table = RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $startsAt = now()->addDay()->startOfHour()->toIso8601String();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'table_id' => $table->id,
                'party_size' => 2,
                'starts_at' => $startsAt,
            ])
            ->assertCreated()
            ->assertJsonPath('data.table_id', $table->id)
            ->assertJsonPath('data.status', Reservation::STATUS_CONFIRMED);

        $this->assertDatabaseHas('reservations', [
            'user_id' => $user->id,
            'table_id' => $table->id,
            'party_size' => 2,
            'status' => Reservation::STATUS_CONFIRMED,
        ]);
    }

    public function test_overlapping_reservation_is_rejected(): void
    {
        $user = $this->userWithPermission(Permission::CAN_CREATE_RESERVATION);
        $table = RestaurantTable::query()->firstOrFail();
        $startsAt = now()->addDays(2)->startOfHour();

        Reservation::query()->create([
            'user_id' => $user->id,
            'table_id' => $table->id,
            'party_size' => 2,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHours(2),
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'table_id' => $table->id,
                'party_size' => 2,
                'starts_at' => $startsAt->copy()->addHour()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['starts_at']);
    }

    public function test_party_size_over_capacity_is_rejected(): void
    {
        $user = $this->userWithPermission(Permission::CAN_CREATE_RESERVATION);
        $table = RestaurantTable::query()->where('capacity', 2)->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'table_id' => $table->id,
                'party_size' => 5,
                'starts_at' => now()->addDay()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['party_size']);
    }

    public function test_occupied_table_cannot_be_reserved(): void
    {
        $user = $this->userWithPermission(Permission::CAN_CREATE_RESERVATION);
        $table = RestaurantTable::query()->firstOrFail();
        $table->update(['status' => RestaurantTable::STATUS_OCCUPIED]);

        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'table_id' => $table->id,
                'party_size' => 2,
                'starts_at' => now()->addDay()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['table_id']);
    }

    public function test_user_can_list_own_reservations(): void
    {
        $user = $this->userWithPermission(Permission::CAN_CREATE_RESERVATION);
        $other = User::factory()->create();
        $table = RestaurantTable::query()->firstOrFail();
        $startsAt = now()->addDay()->startOfHour();

        Reservation::query()->create([
            'user_id' => $user->id,
            'table_id' => $table->id,
            'party_size' => 2,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHours(2),
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        Reservation::query()->create([
            'user_id' => $other->id,
            'table_id' => $table->id,
            'party_size' => 2,
            'starts_at' => $startsAt->copy()->addDays(3),
            'ends_at' => $startsAt->copy()->addDays(3)->addHours(2),
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/reservations')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($user->id, $response->json('data.0.user_id'));
    }

    public function test_staff_can_list_all_reservations(): void
    {
        $staff = $this->userWithPermission(Permission::CAN_MANAGE_TABLES);
        $customer = User::factory()->create();
        $table = RestaurantTable::query()->firstOrFail();
        $startsAt = now()->addDay()->startOfHour();

        Reservation::query()->create([
            'user_id' => $customer->id,
            'table_id' => $table->id,
            'party_size' => 2,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHours(2),
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $token = $this->makeToken([
            'sub' => $staff->id,
            'email' => $staff->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/reservations')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_user_can_cancel_own_reservation(): void
    {
        $user = $this->userWithPermission(Permission::CAN_CREATE_RESERVATION);
        $table = RestaurantTable::query()->firstOrFail();
        $startsAt = now()->addDay()->startOfHour();

        $reservation = Reservation::query()->create([
            'user_id' => $user->id,
            'table_id' => $table->id,
            'party_size' => 2,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHours(2),
            'status' => Reservation::STATUS_CONFIRMED,
        ]);

        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.status', Reservation::STATUS_CANCELLED);
    }

    public function test_user_without_permission_cannot_create_reservation(): void
    {
        $user = User::factory()->create();
        $table = RestaurantTable::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'table_id' => $table->id,
                'party_size' => 2,
                'starts_at' => now()->addDay()->toIso8601String(),
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
