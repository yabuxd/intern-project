<?php

use App\Http\Controllers\Api\ChapaPaymentController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\MenuChangeRequestController;
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

Route::get('/payments/chapa/callback', [ChapaPaymentController::class, 'callback']);
Route::post('/payments/chapa/webhook', [ChapaPaymentController::class, 'webhook']);

Route::middleware(VerifySupabaseJwt::class)->group(function () {
    Route::patch('/tables/{restaurantTable}', [TableController::class, 'update']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/queue', [OrderController::class, 'queue']);
    Route::get('/deliveries', [OrderController::class, 'deliveries']);
    Route::get('/deliveries/drivers', [OrderController::class, 'drivers']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{order}/payment/verify', [OrderController::class, 'verifyPayment']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/orders/{order}/driver', [OrderController::class, 'assignDriver']);
    Route::delete('/orders/{order}', [OrderController::class, 'cancel']);
    Route::get('/me', MeController::class);
    Route::get('/menu/manage', [MenuController::class, 'manage']);
    Route::apiResource('menu-items', MenuItemController::class)->except(['index']);
    Route::get('/menu-change-requests', [MenuChangeRequestController::class, 'index']);
    Route::post('/menu-change-requests', [MenuChangeRequestController::class, 'store']);
    Route::patch('/menu-change-requests/{menuChangeRequest}/approve', [MenuChangeRequestController::class, 'approve']);
    Route::patch('/menu-change-requests/{menuChangeRequest}/reject', [MenuChangeRequestController::class, 'reject']);
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);
    Route::get('/admin/users', [UserPermissionController::class, 'index']);
    Route::post('/admin/users', [UserPermissionController::class, 'store']);
    Route::get('/admin/permissions', [UserPermissionController::class, 'permissions']);
    Route::get('/admin/roles', [UserPermissionController::class, 'roles']);
    Route::put('/admin/users/{user}/roles', [UserPermissionController::class, 'updateUserRoles']);
    Route::put('/admin/roles/{role}/permissions', [UserPermissionController::class, 'updateRolePermissions']);
});
