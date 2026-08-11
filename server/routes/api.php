<?php

use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\UserPermissionController;
use App\Http\Middleware\VerifySupabaseJwt;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'intern-project-api',
    ]);
});

Route::get('/menu', [MenuController::class, 'index']);
Route::get('/tables', [TableController::class, 'index']);

Route::middleware(VerifySupabaseJwt::class)->group(function () {
    Route::patch('/tables/{restaurantTable}', [TableController::class, 'update']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/queue', [OrderController::class, 'queue']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::delete('/orders/{order}', [OrderController::class, 'cancel']);
    Route::get('/me', MeController::class);
    Route::get('/menu/manage', [MenuController::class, 'manage']);
    Route::apiResource('menu-items', MenuItemController::class)->except(['index']);
    // PHP only parses multipart uploads on POST (not PUT).
    Route::post('/menu-items/{menuItem}', [MenuItemController::class, 'update']);
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);
    Route::get('/admin/users', [UserPermissionController::class, 'index']);
    Route::get('/admin/permissions', [UserPermissionController::class, 'permissions']);
    Route::put('/admin/users/{user}/permissions', [UserPermissionController::class, 'update']);
});
