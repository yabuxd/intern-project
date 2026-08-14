<?php

namespace App\Providers;

use App\Models\Permission;
use App\Models\User;
use App\Services\ApiCacheService;
use App\Services\SupabaseJwtService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ApiCacheService::class);

        $this->app->singleton(SupabaseJwtService::class, function () {
            $ca = config('services.supabase.ssl_cert_file');

            return new SupabaseJwtService(
                (string) config('services.supabase.url'),
                (string) config('services.supabase.anon_key'),
                (string) config('services.supabase.jwt_secret', ''),
                is_string($ca) && $ca !== '' ? $ca : null,
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach (Permission::catalog() as $permission) {
            Gate::define($permission, function (User $user) use ($permission) {
                return $user->hasPermission($permission);
            });
        }
    }
}
