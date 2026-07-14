<?php

namespace Database\Seeders;

use App\Models\RestaurantTable;
use Illuminate\Database\Seeder;

class TableSeeder extends Seeder
{
    public function run(): void
    {
        for ($i = 1; $i <= 8; $i++) {
            RestaurantTable::query()->updateOrCreate(
                ['name' => "Table {$i}"],
                [
                    'capacity' => $i <= 4 ? 2 : 4,
                    'status' => RestaurantTable::STATUS_FREE,
                ],
            );
        }
    }
}
