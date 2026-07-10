# Server (Laravel)

Laravel API for the Restaurant Order & Table Management system.

## Prerequisites

- PHP 8.3+
- Composer 2+
- Extensions: openssl, curl, mbstring, pdo_pgsql, pgsql, fileinfo, zip

## Setup

```bash
cd server
composer install
cp .env.example .env
php artisan key:generate
```

Configure Supabase Postgres (`DB_*`) and JWT placeholders (`SUPABASE_*`) in `.env`.

## Run

```bash
php artisan serve
```

- App: http://localhost:8000
- Health (framework): http://localhost:8000/up
- Health (API JSON): http://localhost:8000/api/health

## Tooling

```bash
composer validate
./vendor/bin/pint --test
php artisan test
```

Migrations and domain features (menu, orders, tables, auth middleware) are intentionally not included in this scaffold.
