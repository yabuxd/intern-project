<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class LocalAuthService
{
    public const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

    /**
     * @return array{access_token: string, token_type: string, expires_in: int, user: array{id: string, email: string, name: string|null}}
     */
    public function login(string $email, string $password): array
    {
        $user = User::query()->where('email', $email)->first();

        if (! $user || ! is_string($user->password) || $user->password === '' || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        return $this->tokenPayload($user);
    }

    /**
     * @return array{access_token: string, token_type: string, expires_in: int, user: array{id: string, email: string, name: string|null}}
     */
    public function register(string $email, string $password, ?string $fullName): array
    {
        $name = is_string($fullName) && trim($fullName) !== ''
            ? trim($fullName)
            : (string) strstr($email, '@', true);

        $user = User::query()->create([
            'email' => $email,
            'name' => $name !== '' ? $name : $email,
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        $customerId = Role::query()->where('name', Role::CUSTOMER)->value('id');
        if ($customerId) {
            $user->roles()->syncWithoutDetaching([$customerId]);
        }

        return $this->tokenPayload($user);
    }

    /**
     * @return array{access_token: string, token_type: string, expires_in: int, user: array{id: string, email: string, name: string|null}}
     */
    public function tokenPayload(User $user): array
    {
        return [
            'access_token' => $this->issueToken($user),
            'token_type' => 'bearer',
            'expires_in' => self::TOKEN_TTL_SECONDS,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
            ],
        ];
    }

    public function issueToken(User $user): string
    {
        $secret = (string) config('services.supabase.jwt_secret');
        if ($secret === '') {
            throw new RuntimeException('SUPABASE_JWT_SECRET is required for local auth.');
        }

        $now = time();
        $claims = [
            'sub' => $user->id,
            'email' => $user->email,
            'email_verified' => true,
            'role' => 'authenticated',
            'iat' => $now,
            'exp' => $now + self::TOKEN_TTL_SECONDS,
            'user_metadata' => [
                'full_name' => $user->name,
            ],
        ];

        $header = $this->b64((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->b64((string) json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = $this->b64(hash_hmac('sha256', $header.'.'.$payload, $secret, true));

        return $header.'.'.$payload.'.'.$signature;
    }

    private function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
