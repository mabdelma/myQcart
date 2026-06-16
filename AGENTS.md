# QCart Development Guide for AI Agents

## Before submitting code
- Run `tsc --noEmit` in both the root (frontend) and `server/` directories
- Run `npm test` in both the root and `server/` directories
- Run `npm run lint` in both directories if a lint script exists

## CI/CD
- GitHub Actions runs on every PR and push to main: frontend typecheck + test + build, server typecheck + test + build, E2E with Playwright, lint
- On successful CI run on `main`, a deploy workflow builds Docker images, pushes to GHCR, and deploys to VPS via SSH
- Use `npm run ci` locally to run the full CI pipeline (lint + typecheck + test + build for both frontend and server)

## Project structure
- Frontend: React 19 + Vite, PWA with workbox, Sentry (`@sentry/react`), Offline queue
- Backend: Hono + Drizzle ORM + PostgreSQL + Redis (ioredis via createRequire), Pino logging, Sentry error tracking
- E2E: Playwright in `e2e/` directory
- Mobile: Expo/React Native wrapper in `mobile/` directory
- Infra: PgBouncer, Redis Sentinel, CDN nginx configs in `infra/` directory

## Key patterns
- Auth middleware exports `authMiddleware`, not `authenticate`
- `requireRole(...roles: string[])` uses rest params (not array)
- Use `sql.join(...)` not `sql.array(...)` for IN clauses (Drizzle 0.45 limitation)
- All new routes follow `/:slug/resource` pattern behind `/api/r/` (tenant-scoped) or `/api/` (admin/super-admin)
- Redis URL is required (no fallback) — server exits on startup if missing
- Schema is in `server/src/db/schema.ts` — 28 tables with enum columns using literal union types
- Migrations in `server/drizzle/` — use `drizzle-kit migrate` (not push) for production
- Health check: `/api/health` (legacy), `/api/health/liveness`, `/api/health/readiness` (checks DB + Redis)
- Structured logging with Pino (sensitive data redacted), error tracking with Sentry
- Frontend Sentry init in `src/lib/monitoring.ts`, ErrorBoundary in `src/lib/ErrorBoundary.tsx`

## Testing
- `npm test` (frontend vitest, jsdom)
- `cd server && npm test` (server vitest, Node)
- `npm run test:e2e` (Playwright, requires running dev server)
- When fixing test mocks: `__setQueryData(data)` for single-query tests, `__setQueryQueue(queue)` for multi-query flows

## Admin portal tabs
Available sidebar tabs: analytics, orders, staff, users, menu, modifiers, tables, subscription, branding, settings
Add new tabs by updating `src/components/admin/AdminPortal.tsx` routes + `src/components/admin/Sidebar.tsx` tabs + translation keys
