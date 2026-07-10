<?php

namespace App\Providers;

use App\Models\Permission;
use App\Models\User;
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
        $this->app->singleton(SupabaseJwtService::class, function () {
            return new SupabaseJwtService((string) config('services.supabase.jwt_secret'));
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
