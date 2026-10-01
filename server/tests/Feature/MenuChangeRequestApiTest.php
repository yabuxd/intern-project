<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuChangeRequest;
use App\Models\MenuItem;
use App\Models\Permission;
use App\Models\Role;
use Database\Seeders\MenuCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuChangeRequestApiTest extends TestCase
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

        $this->seed([PermissionSeeder::class, RoleSeeder::class, MenuCategorySeeder::class]);
    }

    public function test_kitchen_can_propose_a_menu_item_but_it_is_not_added_until_approved(): void
    {
        $kitchen = $this->userWithRole(Role::KITCHEN);
        $manager = $this->userWithRole(Role::MANAGER);
        $category = MenuCategory::query()->firstOrFail();

        $kitchenToken = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);
        $managerToken = $this->makeToken([
            'sub' => $manager->id,
            'email' => $manager->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->postJson('/api/menu-items', [
                'menu_category_id' => $category->id,
                'name' => 'Kitfo',
                'price' => 18,
            ])
            ->assertForbidden();

        $created = $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->postJson('/api/menu-change-requests', [
                'action' => MenuChangeRequest::ACTION_CREATE,
                'menu_category_id' => $category->id,
                'name' => 'Kitfo',
                'price' => 18,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', MenuChangeRequest::STATUS_PENDING);

        $this->assertDatabaseMissing('menu_items', ['name' => 'Kitfo']);

        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->patchJson('/api/menu-change-requests/'.$created->json('data.id').'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', MenuChangeRequest::STATUS_APPROVED);

        $this->assertDatabaseHas('menu_items', ['name' => 'Kitfo']);
    }

    public function test_kitchen_delete_needs_admin_approval(): void
    {
        $kitchen = $this->userWithRole(Role::KITCHEN);
        $admin = $this->userWithRole(Role::ADMIN);
        $category = MenuCategory::query()->firstOrFail();
        $item = MenuItem::query()->create([
            'menu_category_id' => $category->id,
            'name' => 'Sambusa',
            'price' => 6,
            'is_available' => true,
        ]);

        $kitchenToken = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);
        $adminToken = $this->makeToken([
            'sub' => $admin->id,
            'email' => $admin->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->deleteJson('/api/menu-items/'.$item->id)
            ->assertForbidden();

        $request = $this->withHeader('Authorization', 'Bearer '.$kitchenToken)
            ->postJson('/api/menu-change-requests', [
                'action' => MenuChangeRequest::ACTION_DELETE,
                'menu_item_id' => $item->id,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('menu_items', ['id' => $item->id]);

        $this->withHeader('Authorization', 'Bearer '.$adminToken)
            ->patchJson('/api/menu-change-requests/'.$request->json('data.id').'/approve')
            ->assertOk();

        $this->assertDatabaseMissing('menu_items', ['id' => $item->id]);
    }

    public function test_kitchen_cannot_approve_a_menu_change(): void
    {
        $kitchen = $this->userWithRole(Role::KITCHEN);
        $category = MenuCategory::query()->firstOrFail();
        $token = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);

        $created = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/menu-change-requests', [
                'action' => MenuChangeRequest::ACTION_CREATE,
                'menu_category_id' => $category->id,
                'name' => 'Tibs',
                'price' => 20,
            ])
            ->assertCreated();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/menu-change-requests/'.$created->json('data.id').'/approve')
            ->assertForbidden();
    }

    public function test_kitchen_can_open_manage_menu(): void
    {
        $kitchen = $this->userWithRole(Role::KITCHEN);
        $token = $this->makeToken([
            'sub' => $kitchen->id,
            'email' => $kitchen->email,
            'exp' => time() + 3600,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/menu/manage')
            ->assertOk();
    }
}
