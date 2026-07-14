<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTableRequest;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;

class TableController extends Controller
{
    public function index(): JsonResponse
    {
        $tables = RestaurantTable::query()
            ->orderBy('name')
            ->get()
            ->map(fn (RestaurantTable $table) => $this->transform($table));

        return response()->json([
            'success' => true,
            'data' => $tables,
        ]);
    }

    public function update(UpdateTableRequest $request, RestaurantTable $restaurantTable): JsonResponse
    {
        $restaurantTable->update($request->validated());

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
