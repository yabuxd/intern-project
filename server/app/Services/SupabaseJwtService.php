<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;
use UnexpectedValueException;

class SupabaseJwtService
{
    public function __construct(
        private readonly string $supabaseUrl,
        private readonly string $anonKey,
        private readonly string $jwtSecret = '',
    ) {
        if ($this->supabaseUrl === '' || $this->anonKey === '') {
            throw new RuntimeException('SUPABASE_URL and SUPABASE_ANON_KEY must be configured.');
        }
    }

    /**
     * Verify an access token and return auth claims.
     *
     * Prefers Supabase Auth /user introspection (works with ES256 JWKS projects).
     * Falls back to local HS256 verification when SUPABASE_JWT_SECRET is set (legacy / tests).
     *
     * @return array<string, mixed>
     */
    public function verify(string $token): array
    {
        if ($this->jwtSecret !== '') {
            try {
                return $this->verifyHs256($token);
            } catch (UnexpectedValueException) {
                // Fall through to Auth API for ES256 tokens on mixed setups.
            }
        }

        return $this->verifyViaAuthApi($token);
    }

    /**
     * @return array<string, mixed>
     */
    private function verifyViaAuthApi(string $token): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$token,
            'apikey' => $this->anonKey,
        ])->get(rtrim($this->supabaseUrl, '/').'/auth/v1/user');

        if (! $response->successful()) {
            throw new UnexpectedValueException('Invalid or expired token.');
        }

        $user = $response->json();

        if (! is_array($user) || ! isset($user['id']) || ! is_string($user['id'])) {
            throw new UnexpectedValueException('Unexpected Supabase Auth response.');
        }

        $email = $user['email'] ?? null;
        if (! is_string($email) || $email === '') {
            throw new InvalidArgumentException('Authenticated user is missing an email.');
        }

        return [
            'sub' => $user['id'],
            'email' => $email,
            'email_confirmed_at' => $user['email_confirmed_at'] ?? null,
            'email_verified' => ($user['email_confirmed_at'] ?? null) !== null,
            'user_metadata' => is_array($user['user_metadata'] ?? null) ? $user['user_metadata'] : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function verifyHs256(string $token): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw new UnexpectedValueException('Invalid JWT format.');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $headerJson = $this->base64UrlDecode($encodedHeader);
        $header = json_decode($headerJson, true);

        if (! is_array($header) || ($header['alg'] ?? null) !== 'HS256') {
            throw new UnexpectedValueException('Unsupported JWT algorithm.');
        }

        $expected = $this->base64UrlEncode(
            hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $this->jwtSecret, true)
        );

        if (! hash_equals($expected, $encodedSignature)) {
            throw new UnexpectedValueException('Invalid JWT signature.');
        }

        $payloadJson = $this->base64UrlDecode($encodedPayload);
        $claims = json_decode($payloadJson, true);

        if (! is_array($claims)) {
            throw new UnexpectedValueException('Invalid JWT payload.');
        }

        $now = time();

        if (isset($claims['nbf']) && is_numeric($claims['nbf']) && $now < (int) $claims['nbf']) {
            throw new UnexpectedValueException('JWT is not yet valid.');
        }

        if (isset($claims['exp']) && is_numeric($claims['exp']) && $now >= (int) $claims['exp']) {
            throw new UnexpectedValueException('JWT has expired.');
        }

        if (! isset($claims['sub']) || ! is_string($claims['sub']) || $claims['sub'] === '') {
            throw new InvalidArgumentException('JWT is missing subject claim.');
        }

        return $claims;
    }

    private function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        if ($decoded === false) {
            throw new UnexpectedValueException('Invalid JWT base64 encoding.');
        }

        return $decoded;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
