<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMenuItemRequest;
use App\Http\Requests\UpdateMenuItemRequest;
use App\Models\MenuItem;
use App\Support\MenuImage;
use Illuminate\Http\JsonResponse;

class MenuItemController extends Controller
{
    public function store(StoreMenuItemRequest $request): JsonResponse
    {
        $data = $request->safe()->except(['image']);

        if ($request->hasFile('image')) {
            $data['image_url'] = MenuImage::store($request->file('image'));
        }

        $item = MenuItem::query()->create($data);
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
        $data = $request->safe()->except(['image']);

        if ($request->hasFile('image')) {
            MenuImage::deleteIfOwned($menuItem->image_url);
            $data['image_url'] = MenuImage::store($request->file('image'));
        }

        $menuItem->update($data);
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
        MenuImage::deleteIfOwned($menuItem->image_url);
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
            'image_url' => MenuImage::resolve($item->image_url),
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
