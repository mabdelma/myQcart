# Qlisted microservices

A **strangler-fig** decomposition of the Qlisted backend, mirroring the Escoutly
services pattern. The live application is still the `server/` monolith — these
services are **contract scaffolds**: each defines its routes and returns
`not_implemented: port from <monolith file>` until the logic is migrated. You
cut traffic over **one path prefix at a time** through the gateway; nothing here
is wired into production yet.

```
microservices/
  packages/shared/        @qlisted/shared — jwt · logger · http envelopes · DTOs/events
  services/
    gateway/              public seam; routes a prefix → a service, else the monolith
    auth/                 users, JWT, sessions, super_admin            ← server/src/routes/auth.ts
    catalog/              menu: categories, items, modifiers           ← server/src/routes/menu.ts
    orders/               carts, orders, kitchen/KDS, live feed (SSE)  ← server/src/routes/orders.ts
    billing/              Stripe payments + SaaS subscriptions         ← server/src/services/{payment,subscription}Service.ts
    engagement/           loyalty, promotions, reviews, campaigns      ← loyalty/promotions/marketing routes
    notifications/        transactional email (+ SMS/push to come)     ← server/src/services/emailService
```

## Run locally

```bash
cd microservices
cp .env.example .env          # set AUTH_SECRET = the monolith JWT_SECRET
npm install                   # workspaces link @qlisted/shared
npm run dev:auth              # or dev:catalog / dev:orders / dev:gateway …
# health check
curl localhost:8080/health
```

Or the whole stack with Docker:

```bash
docker compose -f docker-compose.services.yml --env-file .env up -d --build
curl localhost:8080/health    # (gateway, if you publish a port)
```

## Migration order (recommended)

1. **catalog** — pure reads, mirrors `/api/r/:slug/menu`; safest first cut.
2. **notifications** — already has a working email path; point the monolith at it.
3. **orders** — core flow; carry over the Redis SSE feed and `order.*` events.
4. **billing** — move the Stripe webhook last (single source of truth for events).
5. **engagement**, then **auth** — auth last, since every service depends on its tokens.

For each: implement the route in the service (porting from the monolith file
named in `src/server.ts`), point the gateway prefix at it, verify, then delete
the monolith route. `@qlisted/shared` `verifyToken` accepts the monolith's
tokens once `AUTH_SECRET === JWT_SECRET`.
