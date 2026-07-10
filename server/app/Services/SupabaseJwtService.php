<?php

namespace App\Services;

use InvalidArgumentException;
use RuntimeException;
use UnexpectedValueException;

class SupabaseJwtService
{
    public function __construct(
        private readonly string $jwtSecret,
    ) {
        if ($this->jwtSecret === '') {
            throw new RuntimeException('SUPABASE_JWT_SECRET is not configured.');
        }
    }

    /**
     * Verify a Supabase-issued HS256 access token and return its claims.
     *
     * @return array<string, mixed>
     */
    public function verify(string $token): array
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
