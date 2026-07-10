<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description'])]
class Permission extends Model
{
    public const CAN_MANAGE_MENU = 'can_manage_menu';

    public const CAN_VIEW_ALL_ORDERS = 'can_view_all_orders';

    public const CAN_UPDATE_ORDER_STATUS = 'can_update_order_status';

    public const CAN_MANAGE_TABLES = 'can_manage_tables';

    public const CAN_PLACE_ORDER = 'can_place_order';

    /**
     * @return list<string>
     */
    public static function catalog(): array
    {
        return [
            self::CAN_MANAGE_MENU,
            self::CAN_VIEW_ALL_ORDERS,
            self::CAN_UPDATE_ORDER_STATUS,
            self::CAN_MANAGE_TABLES,
            self::CAN_PLACE_ORDER,
        ];
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_permissions')
            ->withTimestamps();
    }
}
