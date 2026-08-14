<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReservationRequest;
use App\Models\Permission;
use App\Models\Reservation;
use App\Support\KeysetPaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Reservation::class);

        $user = $request->user();
        $query = Reservation::query()
            ->select([
                'id',
                'user_id',
                'table_id',
                'party_size',
                'starts_at',
                'ends_at',
                'status',
                'notes',
                'created_at',
            ])
            ->with(['table:id,name,capacity', 'user:id,name,email']);

        if (! $user->can(Permission::CAN_MANAGE_TABLES)) {
            $query->where('user_id', $user->id);
        }

        [$reservations, $meta] = KeysetPaginator::paginate($query, $request, 'id', 'desc');

        return response()->json([
            'success' => true,
            'data' => $reservations->map(fn (Reservation $reservation) => $this->transform($reservation))->values(),
            'meta' => $meta,
        ]);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        $reservation = Reservation::query()->create([
            ...$request->reservationAttributes(),
            'user_id' => $request->user()->id,
        ]);

        $reservation->load(['table:id,name,capacity', 'user:id,name,email']);

        return response()->json([
            'success' => true,
            'data' => $this->transform($reservation),
            'message' => 'Reservation created.',
        ], 201);
    }

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('delete', $reservation);

        $reservation->update(['status' => Reservation::STATUS_CANCELLED]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($reservation->fresh(['table:id,name,capacity', 'user:id,name,email'])),
            'message' => 'Reservation cancelled.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Reservation $reservation): array
    {
        return [
            'id' => $reservation->id,
            'user_id' => $reservation->user_id,
            'table_id' => $reservation->table_id,
            'party_size' => $reservation->party_size,
            'starts_at' => $reservation->starts_at?->toIso8601String(),
            'ends_at' => $reservation->ends_at?->toIso8601String(),
            'status' => $reservation->status,
            'notes' => $reservation->notes,
            'created_at' => $reservation->created_at?->toIso8601String(),
            'table' => $reservation->relationLoaded('table') && $reservation->table
                ? [
                    'id' => $reservation->table->id,
                    'name' => $reservation->table->name,
                    'capacity' => $reservation->table->capacity,
                ]
                : null,
            'user' => $reservation->relationLoaded('user') && $reservation->user
                ? [
                    'id' => $reservation->user->id,
                    'name' => $reservation->user->name,
                    'email' => $reservation->user->email,
                ]
                : null,
        ];
    }
}
