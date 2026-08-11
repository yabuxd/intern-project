<?php

namespace Tests;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function userWithPermission(string $permissionName): User
    {
        $user = User::factory()->create();
        $permission = Permission::query()->where('name', $permissionName)->firstOrFail();

        $role = Role::query()->create([
            'name' => 'test_'.$permissionName.'_'.$user->id,
            'description' => 'Test role for '.$permissionName,
        ]);
        $role->permissions()->attach($permission);
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
