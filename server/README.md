# Server (Laravel)

Laravel API for the Restaurant Order & Table Management system.

## Prerequisites

- PHP 8.3+
- Composer 2+
- Extensions: openssl, curl, mbstring, pdo_pgsql, pgsql, fileinfo, zip
- A Supabase project (Postgres + Auth JWT secret)

## Setup

```bash
cd server
composer install
cp .env.example .env
php artisan key:generate
```

Configure in `.env`:

- `DB_*` → Supabase Postgres
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`
- `CLIENT_URL` → `http://localhost:5173` (CORS)

Then:

```bash
php artisan migrate
php artisan db:seed
```

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `server/.env`.
`AdminUserSeeder` creates that user in Supabase Auth (if missing) and grants all permissions.

## Run

```bash
php artisan serve
```

- App: http://localhost:8000
- Health (API JSON): http://localhost:8000/api/health
- Current user (auth required): `GET /api/health` is public; `GET /api/me` needs `Authorization: Bearer <supabase_access_token>`

## Auth

Supabase Auth issues JWTs. Laravel middleware `VerifySupabaseJwt` verifies HS256 tokens and upserts the user. Permissions are seeded by `PermissionSeeder` and checked with Gates named after each permission.

## Tooling

```bash
composer validate
./vendor/bin/pint --test
php artisan test
```
