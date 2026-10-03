<?php

namespace Tests\Feature;

use App\Services\SupabaseJwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use ReflectionMethod;
use Tests\TestCase;
use UnexpectedValueException;

class SupabaseJwtServiceEs256Test extends TestCase
{
    use RefreshDatabase;

    private string $supabaseUrl = 'https://example.supabase.co';

    private string $anonKey = 'test-anon-key';

    public function test_it_falls_back_to_auth_api_when_jwks_is_empty(): void
    {
        $token = $this->makeEs256ShapedToken();

        Http::fake([
            $this->supabaseUrl.'/auth/v1/.well-known/jwks.json' => Http::response(['keys' => []], 200),
            $this->supabaseUrl.'/auth/v1/user' => Http::response([
                'id' => '22222222-2222-2222-2222-222222222222',
                'email' => 'fallback@example.com',
                'email_confirmed_at' => '2026-01-01T00:00:00Z',
                'user_metadata' => ['full_name' => 'Fallback User'],
            ], 200),
        ]);

        Cache::forget('supabase.jwks');
        $service = new SupabaseJwtService($this->supabaseUrl, $this->anonKey);
        $claims = $service->verify($token);

        $this->assertSame('22222222-2222-2222-2222-222222222222', $claims['sub']);
        $this->assertSame('fallback@example.com', $claims['email']);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/v1/.well-known/jwks.json'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/v1/user'));
    }

    public function test_it_prefers_jwks_fetch_before_auth_api(): void
    {
        $token = $this->makeEs256ShapedToken();
        $urls = [];

        Http::fake(function ($request) use (&$urls) {
            $urls[] = $request->url();

            if (str_contains($request->url(), 'jwks.json')) {
                return Http::response(['keys' => []], 200);
            }

            return Http::response([
                'id' => '33333333-3333-3333-3333-333333333333',
                'email' => 'order@example.com',
            ], 200);
        });

        Cache::forget('supabase.jwks');
        $service = new SupabaseJwtService($this->supabaseUrl, $this->anonKey);
        $service->verify($token);

        $this->assertNotEmpty($urls);
        $this->assertStringContainsString('jwks.json', $urls[0]);
    }

    public function test_it_caches_jwks_payload_across_loads(): void
    {
        Http::fake([
            $this->supabaseUrl.'/auth/v1/.well-known/jwks.json' => Http::response([
                'keys' => [[
                    'kty' => 'EC',
                    'crv' => 'P-256',
                    'x' => 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
                    'y' => 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
                    'kid' => 'test-kid',
                    'alg' => 'ES256',
                    'use' => 'sig',
                ]],
            ], 200),
        ]);

        Cache::forget('supabase.jwks');
        $service = new SupabaseJwtService($this->supabaseUrl, $this->anonKey);
        $loadJwks = new ReflectionMethod(SupabaseJwtService::class, 'loadJwks');

        $first = $loadJwks->invoke($service);
        $second = $loadJwks->invoke($service);

        $this->assertSame($first, $second);
        Http::assertSentCount(1);
    }

    public function test_it_does_not_call_auth_api_when_jwks_decode_fails_for_bad_token(): void
    {
        Http::fake([
            $this->supabaseUrl.'/auth/v1/.well-known/jwks.json' => Http::response([
                'keys' => [[
                    'kty' => 'EC',
                    'crv' => 'P-256',
                    'x' => 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
                    'y' => 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
                    'kid' => 'test-kid',
                    'alg' => 'ES256',
                    'use' => 'sig',
                ]],
            ], 200),
            $this->supabaseUrl.'/auth/v1/user' => Http::response([
                'id' => 'should-not-be-used',
                'email' => 'nope@example.com',
            ], 200),
        ]);

        Cache::forget('supabase.jwks');
        $service = new SupabaseJwtService($this->supabaseUrl, $this->anonKey);

        try {
            $service->verify($this->makeEs256ShapedToken());
            $this->fail('Expected token verification to fail.');
        } catch (UnexpectedValueException) {
            // Invalid signature / malformed ES256 token should fail locally.
        }

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/auth/v1/user'));
    }

    private function makeEs256ShapedToken(): string
    {
        $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'ES256', 'typ' => 'JWT', 'kid' => 'test-kid'], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode(json_encode([
            'sub' => '11111111-1111-1111-1111-111111111111',
            'email' => 'diner@example.com',
            'exp' => time() + 3600,
        ], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');

        return $header.'.'.$payload.'.invalidsignature';
    }
}
