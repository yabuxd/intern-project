<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            // AdminUserSeeder runs only when ADMIN_EMAIL is set in .env (optional)
            AdminUserSeeder::class,
        ]);
    }
}
