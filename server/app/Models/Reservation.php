<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'table_id', 'party_size', 'starts_at', 'ends_at', 'status', 'notes'])]
class Reservation extends Model
{
    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    public const DEFAULT_DURATION_HOURS = 2;

    /**
     * @return list<string>
     */
    public static function activeStatuses(): array
    {
        return [
            self::STATUS_CONFIRMED,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<RestaurantTable, $this>
     */
    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::activeStatuses(), true);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }
}
