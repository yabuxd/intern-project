<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CLIENT_URL', 'http://localhost:5173')),
    ))),

    // Vite may fall back to 5174/5175 when 5173 is busy.
    'allowed_origins_patterns' => [
        '#^http://(localhost|127\.0\.0\.1):\d+$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,

];
