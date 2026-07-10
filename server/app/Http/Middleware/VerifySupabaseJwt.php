<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\SupabaseJwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VerifySupabaseJwt
{
    public function __construct(
        private readonly SupabaseJwtService $jwtService,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');

        if (! str_starts_with($header, 'Bearer ')) {
            return response()->json([
                'success' => false,
                'message' => 'Missing or invalid Authorization header.',
            ], 401);
        }

        $token = trim(substr($header, 7));

        if ($token === '') {
            return response()->json([
                'success' => false,
                'message' => 'Missing bearer token.',
            ], 401);
        }

        try {
            $claims = $this->jwtService->verify($token);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token.',
            ], 401);
        }

        $email = $claims['email'] ?? null;
        if (! is_string($email) || $email === '') {
            return response()->json([
                'success' => false,
                'message' => 'Token is missing an email claim.',
            ], 401);
        }

        $userMeta = is_array($claims['user_metadata'] ?? null) ? $claims['user_metadata'] : [];
        $name = $userMeta['full_name'] ?? $userMeta['name'] ?? null;
        if (! is_string($name) || $name === '') {
            $local = strstr($email, '@', true);
            $name = is_string($local) && $local !== '' ? $local : $email;
        }

        $emailVerified = isset($claims['email_confirmed_at'])
            || filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $user = User::query()->updateOrCreate(
            ['id' => $claims['sub']],
            [
                'email' => $email,
                'name' => $name,
                'email_verified_at' => $emailVerified ? now() : null,
            ],
        );

        Auth::setUser($user);
        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}
