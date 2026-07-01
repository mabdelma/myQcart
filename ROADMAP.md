# QCart Roadmap

> Last updated: 2026-06-17

## Current State

QCart is a production-deployed QR ordering platform for hospitality. Core features are built and live at `qlisted.com`.

| Capability | Status |
|---|---|
| React 19 SPA + Vite 8 + Tailwind v4 + react-router v7 | ✅ |
| Hono backend + Drizzle ORM + PostgreSQL 16 | ✅ |
| JWT auth with bcryptjs + role guards (super_admin, admin, waiter, kitchen, cashier) | ✅ |
| Multi-tenant (tenant-scoped `/api/r/:slug` routes) | ✅ |
| Stripe Elements (in-person) + Payment Links (remote) | ✅ |
| SSE real-time order updates with 30s polling fallback | ✅ |
| Menu CRUD (categories, items, modifiers as JSON) | ✅ |
| Table management with QR code generation | ✅ |
| Order lifecycle (pending → preparing → ready → delivered) | ✅ |
| Staff roles (waiter panel, kitchen display, cashier POS) | ✅ |
| Super admin panel (cross-tenant management) | ✅ |
| Image uploads (local + S3/R2) | ✅ |
| Resend email integration | ✅ |
| Rate limiting (3 tiers: auth, public, general) | ✅ |
| PWA with service worker | ✅ |
| i18n (10 languages) | ✅ |
| Dark mode | ✅ |
| CI/CD (GitHub Actions → Docker → VPS) | ✅ |
| Sentry error monitoring | ✅ |
| Pino structured logging | ✅ |
| Zod validation (frontend + server) | ✅ |
| 13 E2E test suites (Playwright) | ✅ |

---

## Phase 1 — Feature Completion (now)

Complete the remaining feature gaps that have skeletons but lack full implementation.

| Item | Effort | Notes |
|------|--------|-------|
| **Promotions & loyalty** | 3–5 days | Promo code validation endpoint exists (`/promo/validate`) but backend logic is minimal. Need: discount rules, buy-one-get-one, percentage off, loyalty points, points-to-currency conversion. |
| **Modifiers management UI** | 2–3 days | Modifiers stored as JSON on `menu_items`. Need: dedicated admin CRUD UI for modifier groups/options, reusability across items, upcharge support. |
| **Branding / white-label polish** | 2 days | Restaurant settings exist (logo, colors). Need: preview in customer-facing pages, email template branding, receipt branding. |
| **Mobile app (Expo/React Native)** | 1–2 weeks | Skeleton exists. Need: deep linking (scan QR → open app), offline sync (IndexedDB queue → replay on reconnect), push notifications. |

---

## Phase 2 — Infrastructure Hardening (weeks 1–3)

Detailed implementation timeline in `infra/production-readiness.md`.

| Week | Item | Details |
|------|------|---------|
| 1 | **Cloudflare DNS + proxying** | Point `qlisted.com` → Cloudflare for DDoS protection, SSL, edge caching. Page rules for `/assets/*` (1yr), `/uploads/*` (7d), `/api/*` (bypass). |
| 1 | **Uptime monitoring** | Better Stack (free tier, 30s intervals) + Netdata on VPS for CPU/memory/disk. |
| 2 | **Automated backups** | Cron: daily `pg_dump` → compress → encrypt (`age`) → rotate 30 days. Off-site replication via `rclone` to Backblaze B2. Test restore procedure. |
| 2 | **Log aggregation** | Loki + Promtail + Grafana (self-hosted) or Better Stack logs (10 GB/mo free). Dashboards for request rate, error rate, p50/p95 latency. |
| 3 | **PgBouncer** | Connection pooling (config already in `infra/pgbouncer/`). Deploy alongside Postgres. |
| 3 | **Redis Sentinel** | High-availability for Redis (used by rate limiter, SSE fallback, session cache). |

---

## Phase 3 — Scaling (months 2–6)

| Item | Timeline | Details |
|------|----------|---------|
| **Multi-instance API** | Month 2 | Second VPS as API worker. Docker Compose overlay (`docker-compose.worker.yml`). Redis pub/sub for cross-instance SSE (EventEmitter → Redis adapter). Caddy reverse proxy load-balances to both instances. No session affinity needed (JWT-based). |
| **Managed Postgres** | Months 3–6 | Migrate from Docker Postgres to Aiven / DigitalOcean Managed DB. Automatic backups, point-in-time recovery, read replicas, auto-scaling storage. Only `.env.prod` `DATABASE_URL` changes. |
| **CDN + image optimization** | Month 3 | Offload `/uploads/` to Cloudflare R2 or S3 with signed URLs. Image transformation (resize/webp) at edge via Cloudflare Workers. |

---

## Phase 4 — Advanced Features (months 3–9)

| Feature | Effort | Description |
|---------|--------|-------------|
| **Kitchen Display System (KDS)** | 2–3 weeks | Dedicated kitchen screen: order queue grouped by time, prep timer, mark-as-done, sound alerts. Auto-refresh via SSE. |
| **Reservations** | 2 weeks | Table booking: date/time picker, party size, deposit via Stripe, calendar view for admin, SMS/email reminders. |
| **Waitlist** | 1 week | Digital waitlist: customer joins via QR, estimated wait time, SMS notification when table ready, auto-expire. |
| **Analytics dashboard** | 2 weeks | Server-side aggregations: sales trends, popular items, peak hours, table turnover, staff performance. Export to CSV/PDF. |
| **Multi-language menu** | 1 week | Per-item translations stored in JSON column. Customer picks language at table landing page. |
| **Push notifications** | 1 week | Web push (VAPID) for order status — already depends on `web-push`. Browser permission flow + notification templates. |

---

## Phase 5 — Platform Maturity (6–12 months)

| Item | Description |
|------|-------------|
| **Kubernetes** | Only if >100 concurrent restaurants or cross-region. 3-node cluster, Horizontal Pod Autoscaler, service mesh (Linkerd) for observability. |
| **Stripe Connect** | Marketplace model: platform fee + payout to restaurants. Onboarding flow, automatic transfers, dispute handling. |
| **POS integration** | API/webhook integrations with popular POS systems (Toast, Square, Clover). |
| **Self-serve onboarding** | Restaurant owners sign up, configure menu, print QR codes — all without contacting admin. |
| **Developer platform** | Public API docs (OpenAPI/Swagger), webhook event types, rate limit headers, API keys for integrations. |

---

## How to Contribute

See `AGENTS.md` for development conventions and `DEPLOYMENT.md` for infrastructure details.
