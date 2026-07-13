<?php

namespace Database\Seeders;

use App\Models\MenuCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MenuCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Starters', 'sort_order' => 1],
            ['name' => 'Mains', 'sort_order' => 2],
            ['name' => 'Drinks', 'sort_order' => 3],
            ['name' => 'Desserts', 'sort_order' => 4],
        ];

        foreach ($categories as $category) {
            MenuCategory::query()->updateOrCreate(
                ['slug' => Str::slug($category['name'])],
                [
                    'name' => $category['name'],
                    'sort_order' => $category['sort_order'],
                ],
            );
        }
    }
}
