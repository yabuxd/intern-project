<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class MenuItemController extends Controller
{
    public function store(StoreMenuItemRequest $request): JsonResponse
    {
        $item = MenuItem::query()->create($request->validated());
        $item->load('category');

        return response()->json([
            'success' => true,
            'data' => $this->transform($item),
            'message' => 'Menu item created.',
        ], 201);
    }

    public function show(MenuItem $menuItem): JsonResponse
    {
        $this->authorize('view', $menuItem);
        $menuItem->load('category');

        return response()->json([
            'success' => true,
            'data' => $this->transform($menuItem),
        ]);
    }

    public function update(UpdateMenuItemRequest $request, MenuItem $menuItem): JsonResponse
    {
        $menuItem->update($request->validated());
        $menuItem->load('category');

        return response()->json([
            'success' => true,
            'data' => $this->transform($menuItem),
            'message' => 'Menu item updated.',
        ]);
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $this->authorize('delete', $menuItem);

        try {
            $menuItem->delete();
        } catch (QueryException) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this item because it appears on existing orders. Mark it unavailable instead.',
                'data' => null,
            ], 409);
        }

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Menu item deleted.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(MenuItem $item): array
    {
        return [
            'id' => $item->id,
            'menu_category_id' => $item->menu_category_id,
            'name' => $item->name,
            'description' => $item->description,
            'image_url' => $item->image_url,
            'price' => $item->price,
            'is_available' => $item->is_available,
            'sort_order' => $item->sort_order,
            'category' => $item->relationLoaded('category') && $item->category
                ? [
                    'id' => $item->category->id,
                    'name' => $item->category->name,
                    'slug' => $item->category->slug,
                ]
                : null,
        ];
    }
}
