# QCart — Platform Adoption & Phases

This `platform/` folder is the **portable microservices scaffold** copied from Escoutly
(see `ARCHITECTURE.md` here). It is **additive and isolated** — it does not touch QCart's
existing Vite frontend or current `docker-compose.*`. Adopt it incrementally (strangler).

> What was copied: `packages/shared` (JWT/contracts/logger/http), a `services/*` template
> (auth, listings, billing, engagement, notifications — Fastify, `/health`+`/ready`),
> `infra/k8s` + `infra/compose`, and the architecture doc. **No QCart code was modified.**

## What's reusable as-is (high value, low effort)
- **shared/jwt + contracts + logger** — drop-in for any service.
- **notifications** — order confirmations, receipts, "order ready" emails (already wired to a Mailu/SMTP transport, localized templates).
- **billing** — payment/checkout seam (QCart already takes payments → fits cleanly).
- **auth** — staff/admin auth + JWT issuance; the central-admin separate-session pattern suits a restaurant back-office.

## QCart-specific service map (rename the generic template)
| Generic service | QCart bounded context |
|---|---|
| listings | **menu/catalog** (items, modifiers, categories) |
| engagement | **orders** (cart → order → status, table/QR session) |
| billing | **payments** (existing PSP) |
| notifications | order/receipt emails + (later) kitchen/printer push |
| auth | staff/admin + table sessions |

## Phases
- **Phase 0 — prereqs:** pick infra (k8s cluster *or* run `infra/compose/docker-compose.platform.yml` beside the current stack first); Redis for sessions/rate-limit; object storage for menu images; Sentry + uptime.
- **Phase 1 — notifications:** extract order/receipt emails into the `notifications` service; call it from the order flow. Lowest blast radius.
- **Phase 2 — payments/billing:** move PSP + webhooks behind the `billing` service.
- **Phase 3 — menu/catalog (listings):** the read-heavy menu API; cache-friendly.
- **Phase 4 — orders (engagement):** order lifecycle + table/QR sessions; emits `order.placed`/`order.ready` events.
- **Phase 5 — auth:** centralize staff/admin + table-session tokens.
- **Throughout:** API gateway routes `api.qcart.gmtmall.com/v1/<svc>`; per-service DB schemas; event bus (NATS/Redis) for order events.

## How to run the scaffold here
See `platform/infra/k8s/README.md`. Quick local: add root workspaces for `platform/*`,
`npm install`, then `docker compose -f platform/infra/compose/docker-compose.platform.yml up --build`.
Keep QCart's existing app running; cut traffic over per service once verified.
