<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class LocalDevUserSeeder extends Seeder
{
    public function run(): void
    {
        if ((string) config('services.auth.driver') !== 'local') {
            return;
        }

        $this->call([PermissionSeeder::class, RoleSeeder::class]);

        $accounts = [
            [
                'email' => 'admin@bunahouse.test',
                'name' => 'Local Admin',
                'password' => 'password',
                'role' => Role::ADMIN,
            ],
            [
                'email' => 'diner@bunahouse.test',
                'name' => 'Local Diner',
                'password' => 'password',
                'role' => Role::CUSTOMER,
            ],
        ];

        foreach ($accounts as $account) {
            $user = User::query()->firstOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => $account['password'],
                    'email_verified_at' => now(),
                ],
            );

            $user->fill([
                'name' => $account['name'],
                'password' => $account['password'],
                'email_verified_at' => now(),
            ])->save();

            $roleId = Role::query()->where('name', $account['role'])->value('id');
            if ($roleId) {
                $user->roles()->syncWithoutDetaching([$roleId]);
            }

            $this->command?->info("Local user ready: {$account['email']} / password");
        }
    }
}
