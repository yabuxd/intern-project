<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\RestaurantTable;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

class ReservationAvailabilityService
{
    /**
     * @throws ValidationException
     */
    public function assertAvailable(
        RestaurantTable $table,
        int $partySize,
        CarbonInterface $startsAt,
        CarbonInterface $endsAt,
        ?int $ignoreReservationId = null,
    ): void {
        if ($table->status === RestaurantTable::STATUS_OCCUPIED) {
            throw ValidationException::withMessages([
                'table_id' => ['This table is currently occupied and cannot be reserved.'],
            ]);
        }

        if ($table->capacity !== null && $partySize > $table->capacity) {
            throw ValidationException::withMessages([
                'party_size' => ["Party size exceeds table capacity ({$table->capacity} seats)."],
            ]);
        }

        $overlapQuery = Reservation::query()
            ->select('id')
            ->where('table_id', $table->id)
            ->whereIn('status', Reservation::activeStatuses())
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt);

        if ($ignoreReservationId !== null) {
            $overlapQuery->where('id', '!=', $ignoreReservationId);
        }

        if ($overlapQuery->exists()) {
            throw ValidationException::withMessages([
                'starts_at' => ['This table already has a reservation during the selected time.'],
            ]);
        }
    }
}
