<?php

use App\Http\Controllers\Api\MeController;
use App\Http\Middleware\VerifySupabaseJwt;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'intern-project-api',
    ]);
});

Route::middleware(VerifySupabaseJwt::class)->group(function () {
    Route::get('/me', MeController::class);
});
