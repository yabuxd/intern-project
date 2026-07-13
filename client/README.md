# Client (React + Vite + TypeScript)

Frontend SPA for the Restaurant Order & Table Management system.

## Setup

From the repo root:

```bash
npm install
```

Copy env example:

```bash
cp client/.env.example client/.env
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -w client` | Start Vite dev server (http://localhost:5173) |
| `npm run build -w client` | Typecheck and production build |
| `npm run lint -w client` | Run ESLint |
| `npm run preview -w client` | Preview production build |

Or from this directory: `npm run dev`, `npm run build`, `npm run lint`.

## Shared package

Imports types/constants from `@intern/shared` (workspace package).
