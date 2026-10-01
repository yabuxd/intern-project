<?php

namespace App\Services;

use App\Models\MenuChangeRequest;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class MenuChangeRequestService
{
    public function apply(MenuChangeRequest $request, User $reviewer): MenuChangeRequest
    {
        if (! $request->isPending()) {
            throw ValidationException::withMessages([
                'status' => ['Only pending requests can be approved.'],
            ]);
        }

        if ($request->action === MenuChangeRequest::ACTION_CREATE) {
            $payload = $request->payload ?? [];
            MenuItem::query()->create([
                'menu_category_id' => $payload['menu_category_id'],
                'name' => $payload['name'],
                'description' => $payload['description'] ?? null,
                'image_url' => $payload['image_url'] ?? null,
                'price' => $payload['price'],
                'is_available' => $payload['is_available'] ?? true,
                'sort_order' => $payload['sort_order'] ?? 0,
            ]);
        }

        if ($request->action === MenuChangeRequest::ACTION_DELETE) {
            if ($request->menu_item_id) {
                MenuItem::query()->whereKey($request->menu_item_id)->delete();
            }
        }

        $request->update([
            'status' => MenuChangeRequest::STATUS_APPROVED,
            'reviewer_id' => $reviewer->id,
            'reviewed_at' => now(),
        ]);

        return $request->fresh(['requester', 'reviewer', 'menuItem']) ?? $request;
    }

    public function reject(MenuChangeRequest $request, User $reviewer, ?string $note = null): MenuChangeRequest
    {
        if (! $request->isPending()) {
            throw ValidationException::withMessages([
                'status' => ['Only pending requests can be rejected.'],
            ]);
        }

        $request->update([
            'status' => MenuChangeRequest::STATUS_REJECTED,
            'reviewer_id' => $reviewer->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ]);

        return $request->fresh(['requester', 'reviewer', 'menuItem']) ?? $request;
    }
}
