<?php

namespace App\Http\Requests;

use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Services\ReservationAvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('can_create_reservation') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'table_id' => ['required', 'integer', 'exists:tables,id'],
            'party_size' => ['required', 'integer', 'min:1', 'max:50'],
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $table = RestaurantTable::query()->find($this->integer('table_id'));
            if (! $table) {
                return;
            }

            $startsAt = Carbon::parse($this->input('starts_at'));
            $endsAt = $this->filled('ends_at')
                ? Carbon::parse($this->input('ends_at'))
                : $startsAt->copy()->addHours(Reservation::DEFAULT_DURATION_HOURS);

            try {
                app(ReservationAvailabilityService::class)->assertAvailable(
                    $table,
                    $this->integer('party_size'),
                    $startsAt,
                    $endsAt,
                );
            } catch (\Illuminate\Validation\ValidationException $e) {
                foreach ($e->errors() as $field => $messages) {
                    foreach ($messages as $message) {
                        $validator->errors()->add($field, $message);
                    }
                }
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function reservationAttributes(): array
    {
        $startsAt = Carbon::parse($this->input('starts_at'));
        $endsAt = $this->filled('ends_at')
            ? Carbon::parse($this->input('ends_at'))
            : $startsAt->copy()->addHours(Reservation::DEFAULT_DURATION_HOURS);

        return [
            'table_id' => $this->integer('table_id'),
            'party_size' => $this->integer('party_size'),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'notes' => $this->input('notes'),
            'status' => Reservation::STATUS_CONFIRMED,
        ];
    }
}
