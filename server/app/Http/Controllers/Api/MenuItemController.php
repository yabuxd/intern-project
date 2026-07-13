<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;

class MenuItemController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(MenuItem::class, 'menu_item');
    }

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
        $menuItem->delete();

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
