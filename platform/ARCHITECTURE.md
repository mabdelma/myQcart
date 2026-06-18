# Escoutly — Microservices Architecture

This document describes the target microservices architecture and the **strangler-fig
migration** from the current modular monolith (`apps/landing`) + AI agent (`apps/agent`).

> Status: **scaffolding**. The production monolith remains the source of truth and stays
> live. Each service is extracted, verified, and cut over one at a time. Nothing here is
> wired into production until its service passes verification behind the gateway.

## Why strangler, not big-bang
`escoutly.com`, `login.`, `central.`, `ai.` and Mailu all run today behind one Caddy
gateway on a single VPS. We introduce the new services beside the monolith, route a slice
of traffic to each new service via the gateway, and delete the monolith's copy of that
slice only once the service is proven. Zero planned downtime, always reversible.

## Service decomposition (bounded contexts)

| Service | Owns | Extracted from (monolith) |
|---|---|---|
| **gateway** | Edge routing, TLS, path/host → service. JWT pre-check. | Caddy / k8s Ingress |
| **auth** | Users, credentials, OAuth, JWT issuance, central-admin session | `auth.ts`, `auth.config.ts`, `central-session.ts`, `/api/auth/*`, `/api/central/*` |
| **listings** | Properties, search, import, tours/media refs | `lib/properties.ts`, `/api/properties/*`, `/api/admin/properties/*`, `/api/admin/import` |
| **billing** | Plans, Stripe, Bizum, coupons, webhooks, transactions | `lib/plans.ts`, `lib/coupons.ts`, `lib/bizum.ts`, `lib/stripe.ts`, `/api/checkout/*` |
| **engagement** | Saved properties/searches, viewing requests, leads/CRM | `lib/engagement.ts`, `lib/alerts.ts`, dashboard/pipeline actions |
| **notifications** | Transactional email (Mailu), saved-search alert cron, localized templates | `lib/email.ts`, `lib/email-i18n.ts`, `lib/tokens.ts` (send), alert cron |
| **agent** | Realtime AI, token-usage recording | `apps/agent` (already standalone) + `/api/agent/*` |
| **web** | Presentation: apex / login / central (Next.js) calling services via the gateway | `apps/landing` (becomes a thin BFF) |

## Cross-cutting
- **Contracts/shared:** `packages/shared` — JWT verify/sign, DTO types, logger, HTTP helpers. Every service depends on it.
- **AuthN:** `auth` issues JWTs (HS256 over `AUTH_SECRET`); other services verify via `packages/shared/jwt`. The gateway does a cheap presence check; services do full verification.
- **Data:** start with the **shared Postgres**, one **schema per service** (`auth`, `listings`, …). Split into per-service databases once boundaries are stable. Prisma schema is partitioned per service under `services/<svc>/prisma`.
- **Sync comms:** internal HTTP over cluster DNS (`http://listings.escoutly.svc.cluster.local`).
- **Async comms (later):** an event bus (NATS/Redis Streams) for domain events — `viewing.requested → notifications`, `payment.succeeded → billing/auth`, `coupon.redeemed → billing`.
- **Observability:** each service ships logs to stdout (collected by the cluster) + Sentry; `/health` + `/ready` probes.

## Repo layout
```
apps/            # existing Next.js apps (web monolith + agent) — strangled over time
packages/
  shared/        # contracts, jwt, logger, http  (published internally)
services/
  auth/  listings/  billing/  engagement/  notifications/  gateway/
infra/
  k8s/           # Kubernetes manifests (Deployments, Services, Ingress, DB, secrets)
```

## Migration order (each = independent PR + cutover)
1. **Phase 0 (prereq):** provision a k8s cluster; move uploads → object storage; Redis for rate-limit; secrets in the cluster.
2. **notifications** ✅ reference impl here — lowest blast radius (already isolated email + cron).
3. **billing** — event-driven, isolatable; mirror webhooks, then flip Stripe/Bizum webhook URLs to the service.
4. **listings** — the agent + web already call it over HTTP (`/api/properties`), so the seam exists.
5. **engagement** — saved/searches/viewings/leads.
6. **auth** — issue/verify JWTs centrally; the central-session + agent-token work is the foundation.
7. **web** — becomes a thin BFF/presentation layer calling the services through the gateway.

## Gateway routing (host/path → service)
```
escoutly.com, login.*, central.*   → web (Next.js)
ai.escoutly.com                    → agent
api.escoutly.com/v1/auth/*         → auth
api.escoutly.com/v1/listings/*     → listings
api.escoutly.com/v1/billing/*      → billing
api.escoutly.com/v1/engagement/*   → engagement
api.escoutly.com/v1/notifications/*→ notifications  (internal-only in prod)
```

See `infra/k8s/README.md` to run the platform on a cluster.
