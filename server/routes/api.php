<?php

use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Middleware\VerifySupabaseJwt;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'intern-project-api',
    ]);
});

Route::get('/menu', [MenuController::class, 'index']);

Route::middleware(VerifySupabaseJwt::class)->group(function () {
    Route::get('/me', MeController::class);
    Route::get('/menu/manage', [MenuController::class, 'manage']);
    Route::apiResource('menu-items', MenuItemController::class)->except(['index']);
});
