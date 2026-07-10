# Client (React + Vite + TypeScript)

Frontend SPA for the Restaurant Order & Table Management system.

## Setup

From the repo root:

```bash
npm install
```

Copy env example and fill Supabase values:

```bash
cp client/.env.example client/.env
```

Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (default `http://localhost:8000/api`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -w client` | Start Vite dev server (http://localhost:5173) |
| `npm run build -w client` | Typecheck and production build |
| `npm run lint -w client` | Run ESLint |
| `npm run preview -w client` | Preview production build |

## Auth flow

1. Sign up / sign in via Supabase Auth (`/signup`, `/login`)
2. Client stores the session and calls Laravel `GET /api/me` with the access token
3. Home page shows the user profile and assigned permissions
