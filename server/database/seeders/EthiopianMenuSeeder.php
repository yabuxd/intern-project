<?php

namespace Database\Seeders;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EthiopianMenuSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(MenuCategorySeeder::class);

        $bySlug = MenuCategory::query()->get()->keyBy('slug');

        $dishes = [
            [
                'category' => 'starters',
                'name' => 'Sambusa',
                'description' => 'Crispy pastry pockets filled with spiced lentils or minced beef, served with awaze.',
                'price' => 120.00,
                'image_url' => '/images/menu/sambusa.jpg',
                'sort_order' => 1,
            ],
            [
                'category' => 'starters',
                'name' => 'Timatim Salad',
                'description' => 'Fresh tomato, onion, and jalapeño salad dressed with lemon and Ethiopian oil.',
                'price' => 90.00,
                'image_url' => '/images/menu/shiro.jpg',
                'sort_order' => 2,
            ],
            [
                'category' => 'mains',
                'name' => 'Doro Wat',
                'description' => 'Slow-cooked chicken stew in berbere sauce with a soft egg, served on injera.',
                'price' => 450.00,
                'image_url' => '/images/menu/doro-wat.jpg',
                'sort_order' => 1,
            ],
            [
                'category' => 'mains',
                'name' => 'Kitfo',
                'description' => 'Minced beef seasoned with mitmita and niter kibbeh, served with ayib and greens.',
                'price' => 480.00,
                'image_url' => '/images/menu/kitfo.jpg',
                'sort_order' => 2,
            ],
            [
                'category' => 'mains',
                'name' => 'Beef Tibs',
                'description' => 'Sautéed beef with onions, rosemary, and peppers — a classic Ethiopian favorite.',
                'price' => 420.00,
                'image_url' => '/images/menu/tibs.jpg',
                'sort_order' => 3,
            ],
            [
                'category' => 'mains',
                'name' => 'Shiro Wat',
                'description' => 'Silky chickpea stew simmered with berbere and garlic, perfect with injera.',
                'price' => 280.00,
                'image_url' => '/images/menu/shiro.jpg',
                'sort_order' => 4,
            ],
            [
                'category' => 'mains',
                'name' => 'Misir Wat',
                'description' => 'Red lentil stew cooked until creamy with warm spices and berbere.',
                'price' => 250.00,
                'image_url' => '/images/menu/misir-wat.jpg',
                'sort_order' => 5,
            ],
            [
                'category' => 'mains',
                'name' => 'Beyaynetu',
                'description' => 'Vegetarian sampler of seasonal wats and salads rolled onto injera.',
                'price' => 350.00,
                'image_url' => '/images/menu/doro-wat.jpg',
                'sort_order' => 6,
            ],
            [
                'category' => 'drinks',
                'name' => 'Ethiopian Coffee',
                'description' => 'Traditional buna — aromatic coffee roasted and brewed in the Ethiopian style.',
                'price' => 80.00,
                'image_url' => '/images/menu/coffee.jpg',
                'sort_order' => 1,
            ],
            [
                'category' => 'drinks',
                'name' => 'Spiced Tea (Shai)',
                'description' => 'Black tea steeped with cinnamon, cloves, and cardamom.',
                'price' => 50.00,
                'image_url' => '/images/menu/coffee.jpg',
                'sort_order' => 2,
            ],
            [
                'category' => 'desserts',
                'name' => 'Himbasha',
                'description' => 'Slightly sweet celebratory bread with cardamom and a hint of sugar.',
                'price' => 100.00,
                'image_url' => '/images/menu/himbasha.jpg',
                'sort_order' => 1,
            ],
        ];

        foreach ($dishes as $dish) {
            $category = $bySlug->get($dish['category']);
            if (! $category) {
                $category = MenuCategory::query()->updateOrCreate(
                    ['slug' => $dish['category']],
                    [
                        'name' => Str::title(str_replace('-', ' ', $dish['category'])),
                        'sort_order' => 99,
                    ],
                );
            }

            MenuItem::query()->updateOrCreate(
                [
                    'menu_category_id' => $category->id,
                    'name' => $dish['name'],
                ],
                [
                    'description' => $dish['description'],
                    'image_url' => $dish['image_url'],
                    'price' => $dish['price'],
                    'is_available' => true,
                    'sort_order' => $dish['sort_order'],
                ],
            );
        }
    }
}
