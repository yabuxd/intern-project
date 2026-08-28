<?php

namespace App\Providers;

use App\Models\Permission;
use App\Models\User;
use App\Services\ApiCacheService;
use App\Services\SupabaseJwtService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('orders', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('uploads', function (Request $request) {
            return Limit::perMinute(15)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('payments', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        foreach (Permission::catalog() as $permission) {
            Gate::define($permission, function (User $user) use ($permission) {
                if ($permission === Permission::CAN_PLACE_ORDER) {
                    return true;
                }

                return $user->hasPermission($permission);
            });
        }
    }
}
