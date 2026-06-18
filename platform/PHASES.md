# QCart — Platform Adoption & Phases

This `platform/` folder is the **portable microservices scaffold** copied from Escoutly
(see `ARCHITECTURE.md` here). It is **additive and isolated** — it does not touch QCart's
existing Vite frontend or current `docker-compose.*`. Adopt incrementally (strangler).

> Copied: `packages/shared` (JWT/contracts/logger/http), a `services/*` template
> (auth, listings, billing, engagement, notifications — Fastify, `/health`+`/ready`),
> `infra/k8s` + `infra/compose`, architecture doc. **No QCart code was modified.**

## Reusable as-is
- **shared/jwt + contracts + logger** — drop-in.
- **notifications** — order confirmations, receipts, "order ready" emails (Mailu/SMTP, localized).
- **billing** — payment/checkout seam (QCart already takes payments).
- **auth** — staff/admin auth + the central-admin separate-session pattern for the back-office.

## QCart service map (rename the generic template)
| Generic service | QCart bounded context |
|---|---|
| listings | **menu/catalog** (items, modifiers, categories) |
| engagement | **orders** (cart → order → status, table/QR session) |
| billing | **payments** (existing PSP) |
| notifications | order/receipt emails + (later) kitchen/printer push |
| auth | staff/admin + table sessions |

## Phases
- **Phase 0 — prereqs:** infra target (k8s *or* run `infra/compose/docker-compose.platform.yml` beside the current stack first); Redis; object storage for menu images; Sentry + uptime.
- **Phase 1 — notifications:** order/receipt emails → the `notifications` service.
- **Phase 2 — payments/billing:** PSP + webhooks behind `billing`.
- **Phase 3 — menu/catalog (listings):** read-heavy menu API.
- **Phase 4 — orders (engagement):** order lifecycle + table/QR sessions; emits `order.placed`/`order.ready`.
- **Phase 5 — auth + gateway:** centralize tokens; route `api.qcart.gmtmall.com/v1/<svc>`.

## Run the scaffold
See `platform/infra/k8s/README.md`. Local: add root workspaces for `platform/*`,
`npm install`, then `docker compose -f platform/infra/compose/docker-compose.platform.yml up --build`.
Keep QCart's existing app running; cut traffic over per service once verified.
