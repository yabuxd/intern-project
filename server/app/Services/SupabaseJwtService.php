<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;
use stdClass;
use Throwable;
use UnexpectedValueException;

class SupabaseJwtService
{
    public function __construct(
        private readonly string $supabaseUrl,
        private readonly string $anonKey,
        private readonly string $jwtSecret = '',
        private readonly ?string $caBundle = null,
    ) {
        if ($this->supabaseUrl === '' || $this->anonKey === '') {
            throw new RuntimeException('SUPABASE_URL and SUPABASE_ANON_KEY must be configured.');
        }
    }

    /**
     * Verify an access token and return auth claims.
     *
     * HS256 (legacy / tests) uses SUPABASE_JWT_SECRET locally.
     * ES256 (current Supabase default) uses JWKS, then Auth /user fallback.
     *
     * @return array<string, mixed>
     */
    public function verify(string $token): array
    {
        $alg = $this->tokenAlg($token);

        if ($alg === 'HS256') {
            if ($this->jwtSecret === '') {
                throw new UnexpectedValueException('HS256 token received but SUPABASE_JWT_SECRET is not configured.');
            }

            return $this->verifyHs256($token);
        }

        // Prefer Auth /user (always includes email). Fall back to JWKS local verify.
        try {
            return $this->verifyViaAuthApi($token);
        } catch (ConnectionException $authConnectionError) {
            try {
                return $this->verifyViaJwks($token);
            } catch (Throwable) {
                throw new RuntimeException(
                    'Unable to reach Supabase to verify the token. Check PHP SSL CA certificates (SSL_CERT_FILE / curl.cainfo).',
                    0,
                    $authConnectionError,
                );
            }
        } catch (Throwable $authError) {
            try {
                return $this->verifyViaJwks($token);
            } catch (Throwable) {
                throw $authError instanceof UnexpectedValueException
                    ? $authError
                    : new UnexpectedValueException('Invalid or expired token.', 0, $authError);
            }
        }
    }

    private function tokenAlg(string $token): string
    {
        $parts = explode('.', $token);
        if (count($parts) < 2) {
            throw new UnexpectedValueException('Invalid JWT format.');
        }

        $header = json_decode($this->base64UrlDecode($parts[0]), true);
        $alg = is_array($header) ? ($header['alg'] ?? null) : null;

        if (! is_string($alg) || $alg === '') {
            throw new UnexpectedValueException('JWT header is missing alg.');
        }

        return $alg;
    }

    /**
     * @return array<string, mixed>
     */
    private function verifyViaJwks(string $token): array
    {
        $response = $this->supabaseHttp()
            ->get(rtrim($this->supabaseUrl, '/').'/auth/v1/.well-known/jwks.json');

        if (! $response->successful()) {
            throw new UnexpectedValueException('Unable to load Supabase JWKS.');
        }

        $jwks = $response->json();
        if (! is_array($jwks) || ! isset($jwks['keys']) || ! is_array($jwks['keys']) || $jwks['keys'] === []) {
            throw new UnexpectedValueException('Supabase JWKS is empty.');
        }

        JWT::$leeway = 60;
        $decoded = JWT::decode($token, JWK::parseKeySet($jwks));

        return $this->claimsFromObject($decoded);
    }

    /**
     * @return array<string, mixed>
     */
    private function verifyViaAuthApi(string $token): array
    {
        $response = $this->supabaseHttp()
            ->withHeaders([
                'Authorization' => 'Bearer '.$token,
            ])
            ->get(rtrim($this->supabaseUrl, '/').'/auth/v1/user');

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

    /**
     * @return array<string, mixed>
     */
    private function claimsFromObject(stdClass $decoded): array
    {
        /** @var array<string, mixed> $claims */
        $claims = json_decode(json_encode($decoded, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        if (! isset($claims['sub']) || ! is_string($claims['sub']) || $claims['sub'] === '') {
            throw new InvalidArgumentException('JWT is missing subject claim.');
        }

        $email = $claims['email'] ?? null;
        if (! is_string($email) || $email === '') {
            throw new InvalidArgumentException('JWT is missing an email claim.');
        }

        return $claims;
    }

    private function supabaseHttp(): \Illuminate\Http\Client\PendingRequest
    {
        $request = Http::withHeaders([
            'apikey' => $this->anonKey,
            'Accept' => 'application/json',
        ]);

        $ca = $this->resolveCaBundle();
        if ($ca !== null) {
            $request = $request->withOptions(['verify' => $ca]);
        }

        return $request;
    }

    private function resolveCaBundle(): ?string
    {
        foreach ([$this->caBundle, ini_get('curl.cainfo') ?: null, ini_get('openssl.cafile') ?: null] as $path) {
            if (is_string($path) && $path !== '' && is_readable($path)) {
                return $path;
            }
        }

        return null;
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
