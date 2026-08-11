# Architecture

## Overview

The Restaurant Order & Table Management system is a monorepo with three main packages:

```
React client  ──HTTP/JSON──►  Laravel API  ──SQL──►  Supabase PostgreSQL
     │                              │
     └── Supabase Auth (JWT) ───────┘
     └── Supabase Realtime (optional subscriptions)
```

## Components

### Client (`client/`)

- React + TypeScript SPA built with Vite and styled with Tailwind CSS
- Talks to the Laravel API for domain operations (orders, tables, menu — to be implemented later)
- Uses Supabase client libraries for authentication and optional realtime channels
- Imports shared contract types from `@intern/shared`

### Server (`server/`)

- Laravel (PHP) REST API using Laravel’s standard application structure
- Validates Supabase-issued JWTs (configuration via `SUPABASE_JWT_SECRET` / `SUPABASE_URL`)
- Connects to Supabase Postgres with the `pgsql` driver (`DB_*` env vars)
- No domain controllers/models in the scaffold — structure only

### Shared (`shared/`)

- TypeScript package (`@intern/shared`) for API envelope types and shared constants
- Consumed by the client workspace; kept free of business logic

### Supabase

| Concern | Role |
|---------|------|
| PostgreSQL | Primary database |
| Auth | Issues JWTs consumed by client and verified by Laravel |
| Realtime | Optional live updates (e.g. order/table status) |

## Request flow (target)

1. User signs in via Supabase Auth in the client
2. Client sends API requests to Laravel with `Authorization: Bearer <access_token>`
3. Laravel middleware verifies the JWT and loads the authenticated user context
4. Laravel reads/writes domain data in Supabase Postgres
5. Client may subscribe to Supabase Realtime for live UI updates

## Auth & permissions

- `VerifySupabaseJwt` middleware verifies tokens (cached JWKS for ES256; HS256 secret for tests)
- Users are upserted into `users` using the Supabase `sub` UUID as primary key
- Roles own permissions (`roles` / `role_permissions` / `user_roles`); Gates still check permission names
- `GET /api/me` returns the current user, role names, and effective permission names
- React client uses `@supabase/supabase-js` for sign-up/sign-in and calls `/api/me` after login
- Admins manage role assignments and role permissions at `/admin/roles`

## Out of scope until later phases

Realtime subscriptions beyond the kitchen queue.
