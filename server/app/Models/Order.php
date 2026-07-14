<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'table_id', 'status', 'total'])]
class Order extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PREPARING = 'preparing';

    public const STATUS_READY = 'ready';

    public const STATUS_SERVED = 'served';

    public const STATUS_CANCELLED = 'cancelled';

    /**
     * @return list<string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_PREPARING,
            self::STATUS_READY,
            self::STATUS_SERVED,
            self::STATUS_CANCELLED,
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    public static function allowedTransitions(): array
    {
        return [
            self::STATUS_PENDING => [self::STATUS_PREPARING, self::STATUS_CANCELLED],
            self::STATUS_PREPARING => [self::STATUS_READY, self::STATUS_CANCELLED],
            self::STATUS_READY => [self::STATUS_SERVED, self::STATUS_CANCELLED],
        ];
    }

    public function canTransitionTo(string $nextStatus): bool
    {
        $allowed = self::allowedTransitions()[$this->status] ?? [];

        return in_array($nextStatus, $allowed, true);
    }

    public function isCancellable(): bool
    {
        return $this->canTransitionTo(self::STATUS_CANCELLED);
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

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
        ];
    }
}
