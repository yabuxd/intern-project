<?php

namespace Tests\Unit;

use App\Services\SupabaseJwtService;
use PHPUnit\Framework\TestCase;
use UnexpectedValueException;

class SupabaseJwtServiceTest extends TestCase
{
    private string $secret = 'test-supabase-jwt-secret-for-unit-tests';

    public function test_it_verifies_a_valid_hs256_token(): void
    {
        $service = new SupabaseJwtService($this->secret);
        $token = $this->makeToken([
            'sub' => '11111111-1111-1111-1111-111111111111',
            'email' => 'diner@example.com',
            'exp' => time() + 3600,
        ]);

        $claims = $service->verify($token);

        $this->assertSame('11111111-1111-1111-1111-111111111111', $claims['sub']);
        $this->assertSame('diner@example.com', $claims['email']);
    }

    public function test_it_rejects_tampered_signatures(): void
    {
        $service = new SupabaseJwtService($this->secret);
        $token = $this->makeToken([
            'sub' => '11111111-1111-1111-1111-111111111111',
            'email' => 'diner@example.com',
            'exp' => time() + 3600,
        ]);

        $this->expectException(UnexpectedValueException::class);
        $service->verify($token.'tampered');
    }

    public function test_it_rejects_expired_tokens(): void
    {
        $service = new SupabaseJwtService($this->secret);
        $token = $this->makeToken([
            'sub' => '11111111-1111-1111-1111-111111111111',
            'email' => 'diner@example.com',
            'exp' => time() - 10,
        ]);

        $this->expectException(UnexpectedValueException::class);
        $service->verify($token);
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function makeToken(array $claims): string
    {
        $header = $this->b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->b64(json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = $this->b64(hash_hmac('sha256', $header.'.'.$payload, $this->secret, true));

        return $header.'.'.$payload.'.'.$signature;
    }

    private function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
