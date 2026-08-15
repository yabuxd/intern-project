<?php

namespace App\Services;

use RuntimeException;
use Illuminate\Support\Facades\Http;

class SupabaseAdminUserService
{
    /**
     * @return array{id: string, email: string}
     */
    public function createUser(string $email, string $password, string $name): array
    {
        $url = rtrim((string) config('services.supabase.url'), '/');
        $serviceKey = (string) config('services.supabase.service_role_key');

        if ($url === '' || $serviceKey === '') {
            throw new RuntimeException('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create users.');
        }

        $created = Http::timeout(8)
            ->withHeaders([
                'Authorization' => 'Bearer '.$serviceKey,
                'apikey' => $serviceKey,
                'User-Agent' => 'intern-project-api/1.0',
            ])
            ->post($url.'/auth/v1/admin/users', [
                'email' => $email,
                'password' => $password,
                'email_confirm' => true,
                'user_metadata' => [
                    'full_name' => $name,
                ],
            ]);

        if (! $created->successful()) {
            throw new RuntimeException(
                $created->json('msg')
                    ?? $created->json('message')
                    ?? 'Failed to create the auth user.'
            );
        }

        $payload = $created->json();
        $id = is_array($payload) ? ($payload['id'] ?? null) : null;
        if (! is_string($id) || $id === '') {
            throw new RuntimeException('Unexpected Supabase admin user response.');
        }

        return [
            'id' => $id,
            'email' => is_string($payload['email'] ?? null) ? $payload['email'] : $email,
        ];
    }

    public function deleteUser(string $userId): void
    {
        $url = rtrim((string) config('services.supabase.url'), '/');
        $serviceKey = (string) config('services.supabase.service_role_key');

        if ($url === '' || $serviceKey === '') {
            throw new RuntimeException('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to delete users.');
        }

        $deleted = Http::timeout(8)
            ->withHeaders([
                'Authorization' => 'Bearer '.$serviceKey,
                'apikey' => $serviceKey,
                'User-Agent' => 'intern-project-api/1.0',
            ])
            ->delete($url.'/auth/v1/admin/users/'.$userId);

        if ($deleted->status() === 404) {
            return;
        }

        if (! $deleted->successful()) {
            throw new RuntimeException(
                $deleted->json('msg')
                    ?? $deleted->json('message')
                    ?? 'Failed to delete the auth user.'
            );
        }
    }
}
