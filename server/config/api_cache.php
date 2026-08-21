<?php

return [

    /*
    |--------------------------------------------------------------------------
    | API response cache TTLs (seconds)
    |--------------------------------------------------------------------------
    |
    | Read-heavy endpoints are cached to reduce database load. Writes clear
    | the relevant keys automatically.
    |
    */

    'ttl' => [
        'menu' => (int) env('API_CACHE_TTL_MENU', 300),
        'tables' => (int) env('API_CACHE_TTL_TABLES', 60),
        'user_auth' => (int) env('API_CACHE_TTL_USER_AUTH', 300),
        'user_entity' => (int) env('API_CACHE_TTL_USER_ENTITY', 90),
        'admin_catalog' => (int) env('API_CACHE_TTL_ADMIN_CATALOG', 600),
        'dashboard' => (int) env('API_CACHE_TTL_DASHBOARD', 30),
    ],

];
