<?php

namespace Tests;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ApiCacheService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        ApiCacheService::flushMemory();
    }

    protected function userWithPermission(string $permissionName): User
    {
        return $this->userWithPermissions([$permissionName]);
    }

    /**
     * @param  list<string>  $permissionNames
     */
    protected function userWithPermissions(array $permissionNames): User
    {
        $user = User::factory()->create();
        $permissions = Permission::query()->whereIn('name', $permissionNames)->get();

        $role = Role::query()->create([
            'name' => 'test_'.implode('_', $permissionNames).'_'.$user->id,
            'description' => 'Test role',
        ]);
        $role->permissions()->attach($permissions->pluck('id'));
        $user->roles()->attach($role);

        return $user->fresh(['roles.permissions']);
    }

    protected function userWithRole(string $roleName): User
    {
        $user = User::factory()->create();
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user->roles()->attach($role);

        return $user->fresh(['roles.permissions']);
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    protected function makeToken(array $claims): string
    {
        $secret = (string) config('services.supabase.jwt_secret');
        $header = $this->b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->b64(json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = $this->b64(hash_hmac('sha256', $header.'.'.$payload, $secret, true));

        return $header.'.'.$payload.'.'.$signature;
    }

    protected function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
