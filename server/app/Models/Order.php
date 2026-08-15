<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'table_id',
    'fulfillment_type',
    'delivery_address',
    'delivery_phone',
    'delivery_notes',
    'driver_id',
    'status',
    'total',
])]
class Order extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_PREPARING = 'preparing';

    public const STATUS_READY = 'ready';

    public const STATUS_SERVED = 'served';

    public const STATUS_OUT_FOR_DELIVERY = 'out_for_delivery';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_CANCELLED = 'cancelled';

    public const FULFILLMENT_DINE_IN = 'dine_in';

    public const FULFILLMENT_DELIVERY = 'delivery';

    /**
     * @return list<string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_ACCEPTED,
            self::STATUS_PREPARING,
            self::STATUS_READY,
            self::STATUS_SERVED,
            self::STATUS_OUT_FOR_DELIVERY,
            self::STATUS_DELIVERED,
            self::STATUS_RECEIVED,
            self::STATUS_CANCELLED,
        ];
    }

    /**
     * @return list<string>
     */
    public static function fulfillmentTypes(): array
    {
        return [
            self::FULFILLMENT_DINE_IN,
            self::FULFILLMENT_DELIVERY,
        ];
    }

    public function isDelivery(): bool
    {
        return $this->fulfillment_type === self::FULFILLMENT_DELIVERY;
    }

    /**
     * @return list<string>
     */
    public function allowedNextStatuses(): array
    {
        if ($this->isDelivery()) {
            return match ($this->status) {
                self::STATUS_PENDING => [self::STATUS_ACCEPTED, self::STATUS_CANCELLED],
                self::STATUS_ACCEPTED => [self::STATUS_PREPARING, self::STATUS_CANCELLED],
                self::STATUS_PREPARING => [self::STATUS_READY, self::STATUS_CANCELLED],
                self::STATUS_READY => [self::STATUS_OUT_FOR_DELIVERY, self::STATUS_CANCELLED],
                self::STATUS_OUT_FOR_DELIVERY => [self::STATUS_DELIVERED, self::STATUS_CANCELLED],
                self::STATUS_DELIVERED => [self::STATUS_RECEIVED],
                default => [],
            };
        }

        return match ($this->status) {
            self::STATUS_PENDING => [self::STATUS_PREPARING, self::STATUS_CANCELLED],
            self::STATUS_PREPARING => [self::STATUS_READY, self::STATUS_CANCELLED],
            self::STATUS_READY => [self::STATUS_SERVED, self::STATUS_CANCELLED],
            default => [],
        };
    }

    public function canTransitionTo(string $nextStatus): bool
    {
        return in_array($nextStatus, $this->allowedNextStatuses(), true);
    }

    public function isCancellable(): bool
    {
        return $this->canTransitionTo(self::STATUS_CANCELLED);
    }

    public function canUserTransition(User $user, string $nextStatus): bool
    {
        if (! $this->canTransitionTo($nextStatus)) {
            return false;
        }

        if ($nextStatus === self::STATUS_ACCEPTED) {
            return $user->can(Permission::CAN_ACCEPT_DELIVERY_ORDERS);
        }

        if ($nextStatus === self::STATUS_RECEIVED) {
            return $user->id === $this->user_id;
        }

        if (in_array($nextStatus, [self::STATUS_PREPARING, self::STATUS_READY, self::STATUS_SERVED], true)) {
            return $user->can(Permission::CAN_UPDATE_ORDER_STATUS);
        }

        if (in_array($nextStatus, [self::STATUS_OUT_FOR_DELIVERY, self::STATUS_DELIVERED], true)) {
            return $user->can(Permission::CAN_MANAGE_DELIVERIES)
                || $this->driver_id === $user->id;
        }

        return false;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
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
     * @param  \Illuminate\Database\Eloquent\Builder<Order>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Order>
     */
    public function scopeSelectApi($query)
    {
        return $query->select([
            'id',
            'user_id',
            'table_id',
            'fulfillment_type',
            'delivery_address',
            'delivery_phone',
            'delivery_notes',
            'driver_id',
            'status',
            'total',
            'created_at',
            'updated_at',
        ]);
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<Order>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Order>
     */
    public function scopeWithApiRelations($query, bool $includeUser = false)
    {
        $relations = [
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'driver:id,name,email',
        ];

        if ($includeUser) {
            $relations[] = 'user:id,name,email';
        }

        return $query->with($relations);
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
