<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use Illuminate\Http\JsonResponse;

class MenuController extends Controller
{
    /**
     * Public menu browse: categories with available items only.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->menuPayload(availableOnly: true),
        ]);
    }

    /**
     * Staff menu view including unavailable items (requires can_manage_menu).
     */
    public function manage(): JsonResponse
    {
        $this->authorize('can_manage_menu');

        return response()->json([
            'success' => true,
            'data' => $this->menuPayload(availableOnly: false),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function menuPayload(bool $availableOnly): array
    {
        return MenuCategory::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->with(['items' => function ($query) use ($availableOnly) {
                if ($availableOnly) {
                    $query->where('is_available', true);
                }
            }])
            ->get()
            ->map(fn (MenuCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'sort_order' => $category->sort_order,
                'items' => $category->items->map(fn ($item) => [
                    'id' => $item->id,
                    'menu_category_id' => $item->menu_category_id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'image_url' => $item->image_url,
                    'price' => $item->price,
                    'is_available' => $item->is_available,
                    'sort_order' => $item->sort_order,
                ])->values(),
            ])
            ->values()
            ->all();
    }
}
