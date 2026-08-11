<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Permission;
use App\Models\User;
use Database\Seeders\MenuCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.jwt_secret' => 'test-supabase-jwt-secret-for-feature-tests',
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.anon_key' => 'test-anon-key',
        ]);

        $this->seed([PermissionSeeder::class, MenuCategorySeeder::class]);
    }

    public function test_public_menu_lists_available_items_only(): void
    {
        $category = MenuCategory::query()->firstOrFail();

        MenuItem::query()->create([
            'menu_category_id' => $category->id,
            'name' => 'Soup',
            'description' => 'Hot',
            'price' => 5.50,
            'is_available' => true,
        ]);

        MenuItem::query()->create([
            'menu_category_id' => $category->id,
            'name' => 'Hidden Stew',
            'price' => 9.00,
            'is_available' => false,
        ]);

        $response = $this->getJson('/api/menu')->assertOk();
        $items = collect($response->json('data'))->flatMap(fn ($c) => $c['items']);

        $this->assertTrue($items->contains('name', 'Soup'));
        $this->assertFalse($items->contains('name', 'Hidden Stew'));
    }

    public function test_manager_can_create_menu_item(): void
    {
        $user = $this->userWithPermission(Permission::CAN_MANAGE_MENU);
        $category = MenuCategory::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/menu-items', [
                'menu_category_id' => $category->id,
                'name' => 'Pasta',
                'description' => 'Fresh',
                'price' => 12.99,
                'is_available' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Pasta');

        $this->assertDatabaseHas('menu_items', ['name' => 'Pasta']);
    }

    public function test_user_without_permission_cannot_create_menu_item(): void
    {
        $user = User::factory()->create();
        $category = MenuCategory::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $user->id,
            'email' => $user->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/menu-items', [
                'menu_category_id' => $category->id,
                'name' => 'Pasta',
                'price' => 12.99,
            ])
            ->assertForbidden();
    }
}
