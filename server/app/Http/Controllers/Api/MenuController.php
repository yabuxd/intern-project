<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\Permission;
use App\Services\ApiCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function __construct(
        private readonly ApiCacheService $cache,
    ) {}

    /**
     * Public menu browse: categories with available items only.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $this->cache->rememberMenuPublic(
            fn () => $this->menuPayload(availableOnly: true),
        );

        $etag = '"'.md5(json_encode($data) ?: '').'"';

        if ($request->header('If-None-Match') === $etag) {
            return response()->json(null, 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=60, stale-while-revalidate=120',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ])
            ->setEtag($etag)
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    }

    /**
     * Staff menu view including unavailable items (requires can_manage_menu).
     */
    public function manage(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user?->can(Permission::CAN_MANAGE_MENU)
            || $user?->can(Permission::CAN_PROPOSE_MENU_CHANGES),
            403,
        );

        $data = $this->cache->rememberMenuManage(
            fn () => $this->menuPayload(availableOnly: false),
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function menuPayload(bool $availableOnly): array
    {
        return MenuCategory::query()
            ->select(['id', 'name', 'slug', 'sort_order'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->with(['items' => function ($query) use ($availableOnly) {
                $query->select([
                    'id',
                    'menu_category_id',
                    'name',
                    'description',
                    'image_url',
                    'price',
                    'is_available',
                    'sort_order',
                ]);
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
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }
}
