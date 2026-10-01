<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LocalLoginRequest;
use App\Http\Requests\LocalRegisterRequest;
use App\Services\LocalAuthService;
use Illuminate\Http\JsonResponse;

class LocalAuthController extends Controller
{
    public function __construct(
        private readonly LocalAuthService $auth,
    ) {}

    public function login(LocalLoginRequest $request): JsonResponse
    {
        $this->ensureEnabled();

        $data = $this->auth->login(
            (string) $request->validated('email'),
            (string) $request->validated('password'),
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function register(LocalRegisterRequest $request): JsonResponse
    {
        $this->ensureEnabled();

        $validated = $request->validated();
        $data = $this->auth->register(
            (string) $validated['email'],
            (string) $validated['password'],
            isset($validated['full_name']) ? (string) $validated['full_name'] : null,
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ], 201);
    }

    private function ensureEnabled(): void
    {
        abort_unless(
            (string) config('services.auth.driver') === 'local',
            404,
            'Local auth is disabled.',
        );
    }
}
