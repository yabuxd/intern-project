<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTableRequest;
use App\Models\RestaurantTable;
use App\Services\ApiCacheService;
use Illuminate\Http\JsonResponse;

class TableController extends Controller
{
    public function __construct(
        private readonly ApiCacheService $cache,
    ) {}

    public function index(): JsonResponse
    {
        $tables = $this->cache->rememberTables(function () {
            return RestaurantTable::query()
                ->orderBy('name')
                ->get()
                ->map(fn (RestaurantTable $table) => $this->transform($table))
                ->all();
        });

        return response()->json([
            'success' => true,
            'data' => $tables,
        ]);
    }

    public function update(UpdateTableRequest $request, RestaurantTable $restaurantTable): JsonResponse
    {
        $restaurantTable->update($request->validated());
        $this->cache->forgetTables();

        return response()->json([
            'success' => true,
            'data' => $this->transform($restaurantTable->fresh()),
            'message' => 'Table status updated.',
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
