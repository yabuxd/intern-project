<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) config('services.admin.email');
        $password = (string) config('services.admin.password');
        $name = (string) config('services.admin.name');
        $knownId = (string) config('services.admin.user_id');

        if ($email === '' || ($password === '' && $knownId === '')) {
            $this->command?->warn('ADMIN_EMAIL and ADMIN_PASSWORD (or ADMIN_USER_ID) required — skipping admin seed.');

            return;
        }

        $this->call(PermissionSeeder::class);

        $supabaseUser = $knownId !== ''
            ? ['id' => $knownId, 'email' => $email]
            : $this->ensureSupabaseUser($email, $password, $name);

        $user = User::query()->updateOrCreate(
            ['id' => $supabaseUser['id']],
            [
                'email' => $email,
                'name' => $name,
                'email_verified_at' => now(),
            ],
        );

        $permissionIds = Permission::query()->pluck('id');
        $user->permissions()->syncWithoutDetaching($permissionIds);

        $this->command?->info("Admin user ready: {$email} (all permissions granted).");
    }

    /**
     * @return array{id: string, email: string}
     */
    private function ensureSupabaseUser(string $email, string $password, string $name): array
    {
        $url = rtrim((string) config('services.supabase.url'), '/');
        $serviceKey = (string) config('services.supabase.service_role_key');
        $anonKey = (string) config('services.supabase.anon_key');

        if ($url === '') {
            throw new RuntimeException('SUPABASE_URL is required to seed the admin user.');
        }

        if ($serviceKey !== '') {
            $viaAdmin = $this->createViaAdminApi($url, $serviceKey, $email, $password, $name);
            if ($viaAdmin !== null) {
                return $viaAdmin;
            }

            $this->command?->warn('Supabase Admin API unavailable; falling back to public signup.');
        }

        return $this->createViaSignup($url, $anonKey, $email, $password, $name);
    }

    /**
     * @return array{id: string, email: string}|null
     */
    private function createViaAdminApi(
        string $url,
        string $serviceKey,
        string $email,
        string $password,
        string $name,
    ): ?array {
        $existing = Http::withHeaders([
            'Authorization' => 'Bearer '.$serviceKey,
            'apikey' => $serviceKey,
            'User-Agent' => 'intern-project-seeder/1.0',
        ])->get($url.'/auth/v1/admin/users', [
            'page' => 1,
            'per_page' => 200,
        ]);

        if ($existing->successful()) {
            $users = $existing->json('users') ?? [];
            foreach ($users as $user) {
                if (is_array($user) && strcasecmp((string) ($user['email'] ?? ''), $email) === 0) {
                    return [
                        'id' => (string) $user['id'],
                        'email' => (string) $user['email'],
                    ];
                }
            }
        } else {
            return null;
        }

        $created = Http::withHeaders([
            'Authorization' => 'Bearer '.$serviceKey,
            'apikey' => $serviceKey,
            'User-Agent' => 'intern-project-seeder/1.0',
        ])->post($url.'/auth/v1/admin/users', [
            'email' => $email,
            'password' => $password,
            'email_confirm' => true,
            'user_metadata' => [
                'full_name' => $name,
            ],
        ]);

        if (! $created->successful()) {
            return null;
        }

        $payload = $created->json();
        if (! is_array($payload) || ! isset($payload['id'])) {
            return null;
        }

        return [
            'id' => (string) $payload['id'],
            'email' => (string) ($payload['email'] ?? $email),
        ];
    }

    /**
     * @return array{id: string, email: string}
     */
    private function createViaSignup(
        string $url,
        string $anonKey,
        string $email,
        string $password,
        string $name,
    ): array {
        if ($anonKey === '') {
            throw new RuntimeException('SUPABASE_ANON_KEY is required for signup fallback.');
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$anonKey,
            'apikey' => $anonKey,
            'User-Agent' => 'intern-project-seeder/1.0',
        ])->post($url.'/auth/v1/signup', [
            'email' => $email,
            'password' => $password,
            'data' => [
                'full_name' => $name,
            ],
        ]);

        if (! $response->successful()) {
            // User may already exist — try password grant to resolve id.
            $login = Http::withHeaders([
                'Authorization' => 'Bearer '.$anonKey,
                'apikey' => $anonKey,
                'User-Agent' => 'intern-project-seeder/1.0',
            ])->post($url.'/auth/v1/token?grant_type=password', [
                'email' => $email,
                'password' => $password,
            ]);

            if ($login->successful() && is_string($login->json('user.id'))) {
                return [
                    'id' => (string) $login->json('user.id'),
                    'email' => $email,
                ];
            }

            throw new RuntimeException(
                'Failed to create/find Supabase admin user: '.$response->body()
            );
        }

        $payload = $response->json();
        $id = $payload['id'] ?? $payload['user']['id'] ?? null;

        if (! is_string($id) || $id === '') {
            throw new RuntimeException('Unexpected Supabase signup response.');
        }

        return [
            'id' => $id,
            'email' => $email,
        ];
    }
}
