# Setup

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **PHP** 8.2+ with extensions: `openssl`, `curl`, `mbstring`, `pdo_pgsql`, `pgsql`, `fileinfo`, `zip`
- **Composer** 2+
- A **Supabase** project (URL, anon key, JWT secret, database password)

## 1. Clone and install JS workspaces

```bash
git clone <repo-url>
cd intern-project
npm install
```

## 2. Environment files

```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Fill in Supabase URL/keys and database credentials. Never commit real secrets.

## 3. Shared + client

```bash
npm run build -w shared   # optional typecheck/build
npm run dev -w client     # http://localhost:5173
```

From root you can also run `npm run dev`, `npm run lint`, `npm run build`.

## 4. Laravel server

```bash
cd server
composer install
php artisan key:generate
php artisan serve         # http://localhost:8000
```

Configure `DB_*` in `server/.env` to point at Supabase Postgres before running migrations (migrations come later with domain features).

### Supabase Postgres notes

- Host is typically `db.<project-ref>.supabase.co`
- Port `5432` (or pooler port if using connection pooling)
- Use SSL as required by Supabase (`DB_SSLMODE=require` when configured)

### JWT verification notes

Set `SUPABASE_URL` and `SUPABASE_JWT_SECRET` in `server/.env` for future auth middleware. Do not implement verification in this scaffold.

## 5. Verify

| Check | Command / URL |
|-------|----------------|
| Client | Open http://localhost:5173 — placeholder “Restaurant Order System” page |
| API | `GET http://localhost:8000/up` (Laravel health) or `/api/health` if present |
| Lint | `npm run lint` |
| Client build | `npm run build` |

## Troubleshooting

- **PHP openssl missing (Windows):** enable `extension=openssl` in `php.ini` and restart the shell.
- **Composer not found:** install from https://getcomposer.org/ and ensure it is on `PATH`.
- **Workspace package not resolved:** run `npm install` from the repo root so `@intern/shared` is linked.
