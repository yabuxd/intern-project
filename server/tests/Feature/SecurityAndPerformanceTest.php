<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityAndPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_include_security_headers(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk();
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_menu_endpoint_returns_etag_and_handles_if_none_match(): void
    {
        $response = $this->getJson('/api/menu');

        $response->assertOk();
        $etag = $response->headers->get('ETag');
        $this->assertNotEmpty($etag);

        $conditionalResponse = $this->getJson('/api/menu', [
            'If-None-Match' => $etag,
        ]);

        $conditionalResponse->assertStatus(304);
    }

    public function test_tables_endpoint_returns_etag_and_handles_if_none_match(): void
    {
        $response = $this->getJson('/api/tables');

        $response->assertOk();
        $etag = $response->headers->get('ETag');
        $this->assertNotEmpty($etag);

        $conditionalResponse = $this->getJson('/api/tables', [
            'If-None-Match' => $etag,
        ]);

        $conditionalResponse->assertStatus(304);
    }
}
