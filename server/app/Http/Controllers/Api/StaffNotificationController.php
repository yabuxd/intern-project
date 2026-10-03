<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $user?->loadMissing('roles');

        abort_unless(
            $user !== null && (
                $user->roles->contains(fn ($role) => in_array($role->name, [Role::ADMIN, Role::MANAGER], true))
                || $user->can(Permission::CAN_MANAGE_PERMISSIONS)
            ),
            403,
        );

        $notifications = StaffNotification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (StaffNotification $notification) => [
                'id' => $notification->id,
                'order_id' => $notification->order_id,
                'type' => $notification->type,
                'title' => $notification->title,
                'body' => $notification->body,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $notifications,
        ]);
    }

    public function markRead(Request $request, StaffNotification $notification): JsonResponse
    {
        abort_unless($request->user()?->id === $notification->user_id, 403);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $notification->id,
                'order_id' => $notification->order_id,
                'type' => $notification->type,
                'title' => $notification->title,
                'body' => $notification->body,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ],
        ]);
    }
}
