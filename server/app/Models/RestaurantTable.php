<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'capacity', 'status'])]
class RestaurantTable extends Model
{
    public const STATUS_FREE = 'free';

    public const STATUS_RESERVED = 'reserved';

    public const STATUS_OCCUPIED = 'occupied';

    /**
     * @return list<string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_FREE,
            self::STATUS_RESERVED,
            self::STATUS_OCCUPIED,
        ];
    }

    protected $table = 'tables';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
        ];
    }
}
