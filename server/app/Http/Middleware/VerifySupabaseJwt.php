<?php

namespace App\Http\Middleware;

use App\Models\Role;
use App\Models\User;
use App\Services\ApiCacheService;
use App\Services\SupabaseJwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VerifySupabaseJwt
{
    public function __construct(
        private readonly SupabaseJwtService $jwtService,
        private readonly ApiCacheService $cache,
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
            $claims = Cache::remember(
                'auth.jwt.'.hash('sha256', $token),
                90,
                fn () => $this->jwtService->verify($token),
            );
        } catch (Throwable $e) {
            $message = $e instanceof \RuntimeException
                ? $e->getMessage()
                : 'Invalid or expired token.';

            return response()->json([
                'success' => false,
                'message' => $message,
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
        $emailVerifiedAt = $emailVerified ? now() : null;
        $userId = (string) ($claims['sub'] ?? '');

        if ($userId === '') {
            return response()->json([
                'success' => false,
                'message' => 'Token is missing a sub claim.',
            ], 401);
        }

        $isLocalAuth = (string) config('services.auth.driver', 'supabase') === 'local';

        if ($isLocalAuth) {
            $cachedAttrs = $this->cache->rememberUserEntity($userId, function () use ($userId) {
                $user = User::query()->find($userId);

                return $user?->getAttributes();
            });

            if (! is_array($cachedAttrs) || $cachedAttrs === []) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found for this token.',
                ], 401);
            }

            $needsUpdate = ($cachedAttrs['email'] ?? null) !== $email
                || ($cachedAttrs['name'] ?? null) !== $name
                || ($emailVerified && empty($cachedAttrs['email_verified_at']))
                || (! $emailVerified && ! empty($cachedAttrs['email_verified_at']));

            if ($needsUpdate) {
                $user = User::query()->find($userId);
                if (! $user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User not found for this token.',
                    ], 401);
                }
                $user->fill([
                    'email' => $email,
                    'name' => $name,
                    'email_verified_at' => $emailVerifiedAt,
                ]);
                $user->save();
                $this->cache->forgetUserEntity($userId);
                $this->cache->rememberUserEntity($userId, fn () => $user->getAttributes());
            } else {
                $user = new User;
                $user->setRawAttributes($cachedAttrs, true);
                $user->exists = true;
            }

            Auth::setUser($user);
            $request->setUserResolver(static fn () => $user);

            return $next($request);
        }

        $cachedAttrs = $this->cache->rememberUserEntity($userId, function () use ($userId, $email, $name, $emailVerifiedAt) {
            $user = User::query()->firstOrCreate(
                ['id' => $userId],
                [
                    'email' => $email,
                    'name' => $name,
                    'email_verified_at' => $emailVerifiedAt,
                ],
            );

            if ($user->wasRecentlyCreated) {
                $customerId = Role::query()
                    ->where('name', Role::CUSTOMER)
                    ->value('id');

                if ($customerId) {
                    $user->roles()->syncWithoutDetaching([$customerId]);
                }
            }

            return $user->getAttributes();
        });

        $needsUpdate = ! is_array($cachedAttrs)
            || ($cachedAttrs['email'] ?? null) !== $email
            || ($cachedAttrs['name'] ?? null) !== $name
            || ($emailVerified && empty($cachedAttrs['email_verified_at']))
            || (! $emailVerified && ! empty($cachedAttrs['email_verified_at']));

        if ($needsUpdate) {
            $user = User::query()->firstOrCreate(
                ['id' => $userId],
                [
                    'email' => $email,
                    'name' => $name,
                    'email_verified_at' => $emailVerifiedAt,
                ],
            );
            $user->fill([
                'email' => $email,
                'name' => $name,
                'email_verified_at' => $emailVerifiedAt,
            ]);
            $user->save();
            $this->cache->forgetUserEntity($userId);
            $this->cache->rememberUserEntity($userId, fn () => $user->getAttributes());
        } else {
            $user = new User;
            $user->setRawAttributes($cachedAttrs, true);
            $user->exists = true;
        }

        Auth::setUser($user);
        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}
