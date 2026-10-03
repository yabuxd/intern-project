<?php

namespace App\Models;

use App\Services\StaffNotificationService;
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
    'payment_method',
    'payment_status',
    'payment_reference',
    'paid_at',
    'cashier_approved_at',
    'cashier_approved_by',
    'cash_collected_at',
    'cash_collected_by',
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

    public const PAYMENT_METHOD_CASH = 'cash';

    public const PAYMENT_METHOD_CHAPA = 'chapa';

    public const PAYMENT_PENDING = 'pending';

    public const PAYMENT_PAID = 'paid';

    public const PAYMENT_FAILED = 'failed';

    public const PAYMENT_REFUNDED = 'refunded';

    public const PAYMENT_NOT_REQUIRED = 'not_required';

    /**
     * @return list<string>
     */
    public static function paymentMethods(): array
    {
        return [
            self::PAYMENT_METHOD_CASH,
            self::PAYMENT_METHOD_CHAPA,
        ];
    }

    /**
     * @return list<string>
     */
    public static function paymentStatuses(): array
    {
        return [
            self::PAYMENT_PENDING,
            self::PAYMENT_PAID,
            self::PAYMENT_FAILED,
            self::PAYMENT_REFUNDED,
            self::PAYMENT_NOT_REQUIRED,
        ];
    }

    public function isPaymentSettled(): bool
    {
        return in_array($this->payment_status, [
            self::PAYMENT_PAID,
            self::PAYMENT_NOT_REQUIRED,
        ], true);
    }

    public function isReadyForKitchen(): bool
    {
        if ($this->payment_status === self::PAYMENT_NOT_REQUIRED) {
            return true;
        }

        return $this->payment_status === self::PAYMENT_PAID
            && $this->cashier_approved_at !== null;
    }

    public function markPaid(?string $reference = null): void
    {
        $wasPaid = $this->payment_status === self::PAYMENT_PAID;

        $this->forceFill([
            'payment_status' => self::PAYMENT_PAID,
            'payment_reference' => $reference ?? $this->payment_reference,
            'paid_at' => $this->paid_at ?? now(),
        ])->save();

        if (! $wasPaid) {
            app(StaffNotificationService::class)->notifyManagersOfChapaPaid($this->fresh() ?? $this);
        }
    }

    public function approveByCashier(User $cashier): void
    {
        $this->forceFill([
            'cashier_approved_at' => now(),
            'cashier_approved_by' => $cashier->id,
        ])->save();
    }

    public function collectCash(User $cashier): void
    {
        $this->forceFill([
            'cash_collected_at' => now(),
            'cash_collected_by' => $cashier->id,
        ])->save();
    }

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
            return $user->can(Permission::CAN_ACCEPT_DELIVERY_ORDERS)
                || $user->can(Permission::CAN_MANAGE_DELIVERIES);
        }

        if ($nextStatus === self::STATUS_RECEIVED) {
            return $user->id === $this->user_id
                || $user->can(Permission::CAN_MANAGE_DELIVERIES);
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
            'payment_method',
            'payment_status',
            'payment_reference',
            'paid_at',
            'cashier_approved_at',
            'cashier_approved_by',
            'cash_collected_at',
            'cash_collected_by',
            'created_at',
            'updated_at',
        ]);
    }

    /**
     * Kitchen/delivery visibility: cash immediately, Chapa only after cashier approval.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<Order>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Order>
     */
    public function scopePaymentSettled($query)
    {
        return $query->where(function ($builder) {
            $builder
                ->where('payment_status', self::PAYMENT_NOT_REQUIRED)
                ->orWhere(function ($chapa) {
                    $chapa
                        ->where('payment_status', self::PAYMENT_PAID)
                        ->whereNotNull('cashier_approved_at');
                });
        });
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
            'paid_at' => 'datetime',
            'cashier_approved_at' => 'datetime',
            'cash_collected_at' => 'datetime',
        ];
    }
}
