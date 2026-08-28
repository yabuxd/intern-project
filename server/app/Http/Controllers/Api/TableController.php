<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTableRequest;
use App\Http\Requests\UpdateTableRequest;
use App\Models\Permission;
use App\Models\RestaurantTable;
use App\Services\ApiCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function __construct(
        private readonly ApiCacheService $cache,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tables = $this->cache->rememberTables(function () {
            return RestaurantTable::query()
                ->select(['id', 'name', 'capacity', 'status'])
                ->orderBy('name')
                ->get()
                ->map(fn (RestaurantTable $table) => $this->transform($table))
                ->all();
        });

        $etag = '"'.md5(json_encode($tables) ?: '').'"';

        if ($request->header('If-None-Match') === $etag) {
            return response()->json(null, 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=15, stale-while-revalidate=30',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $tables,
        ])
            ->setEtag($etag)
            ->header('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
    }

    public function store(StoreTableRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? RestaurantTable::STATUS_FREE;

        $table = RestaurantTable::query()->create($data);
        $this->cache->forgetTables();

        return response()->json([
            'success' => true,
            'data' => $this->transform($table),
            'message' => 'Table created.',
        ], 201);
    }

    public function update(UpdateTableRequest $request, RestaurantTable $restaurantTable): JsonResponse
    {
        $restaurantTable->update($request->validated());
        $this->cache->forgetTables();

        return response()->json([
            'success' => true,
            'data' => $this->transform($restaurantTable->fresh()),
            'message' => 'Table updated.',
        ]);
    }

    public function destroy(Request $request, RestaurantTable $restaurantTable): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user !== null && (
                $user->can(Permission::CAN_MANAGE_TABLES)
                || $user->can(Permission::CAN_MANAGE_PERMISSIONS)
            ),
            403,
        );

        $restaurantTable->delete();
        $this->cache->forgetTables();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Table deleted.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(RestaurantTable $table): array
    {
        return [
            'id' => $table->id,
            'name' => $table->name,
            'capacity' => $table->capacity,
            'status' => $table->status,
        ];
    }
}
