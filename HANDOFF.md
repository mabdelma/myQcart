# Overnight Handoff — Loyalty Points-to-Currency Redemption

Branch: `agent/overnight-gaps`. Changes are left in the working tree (uncommitted).

## What was added/changed

Three new files implement redeeming loyalty points as a real currency discount applied to a concrete order (closing the loop the legacy `/loyalty/redeem` endpoint leaves open — that one deducts points but the discount is never written anywhere):

- `server/src/services/loyaltyService.ts` — `pointsToCurrency()` pure helper (1 point = $0.05) and `redeemPointsForOrder(tenantId, orderId, points)`. Guards: positive integer points, sufficient balance, order exists for tenant, order not already paid, discount capped at order total (never negative). Deducts points, records a `redeem` loyalty transaction, and writes `discountAmount` / `discountReason` / `total` onto the order.
- `server/src/routes/loyalty.ts` — new endpoint `POST /:slug/loyalty/redeem-for-order` (roles: admin, manager, waiter, cashier) wired to the service. Existing endpoints (`GET /loyalty`, `/loyalty/earn`, `/loyalty/redeem`) are untouched.
- `server/src/services/loyaltyService.test.ts` — vitest unit tests for the helper and the redeem flow (happy path, non-positive points, no balance, insufficient points, missing order, already-paid order, discount cap).

## Route wiring — already in place (no change needed)

The loyalty router was already registered, so the new endpoint is live automatically:
- `server/src/routes/index.ts:27` exports `loyaltyRoutes`.
- `server/src/index.ts:62` imports it.
- `server/src/index.ts:106` applies the points rate limiter to `/api/r/*/loyalty/redeem-for-order`.
- `server/src/index.ts:195` mounts it: `app.route('/api/r', loyaltyRoutes)`.

Full path: `POST /api/r/:slug/loyalty/redeem-for-order` with JSON `{ orderId, points }`.

## Consistency checks performed

- All 3 files read back fully — clean endings, no truncation.
- Schema fields used by the service exist on the `orders` table (`discountAmount`, `discountReason`, `total`, `paymentStatus`) — `server/src/db/schema.ts:211-217` — and on the loyalty tables — `schema.ts:388-404`.
- Test mock (`server/src/test/setup.ts`) provides `__setQueryQueue` / `__setQueryData` and registers `loyaltySummary` + `loyaltyTransactions`, matching what the test uses.

## How to validate (Windows)

npm registry was blocked in the sandbox and vitest could not be run there, so validate locally:

```
cd server
npm install
npm test
```

Or from the repo root:

```
npm run test:all
```

## Owner WIP — preserved, do not touch

The owner's in-progress 252-file change set is snapshotted and safe:
- commit `24c5f01`
- branch `wip-snapshot`

This overnight work is isolated on `agent/overnight-gaps`. No `git reset/checkout/clean/stash` or branch switch was performed.

## Remaining items that require human credentials/infra (not codeable here)

- Supabase / Postgres connection (`DATABASE_URL` and migrations applied) for the loyalty tables to exist at runtime.
- Stripe API keys (secret/publishable/webhook signing) for payments.
- VAPID push keys for web push notifications.
- EAS mobile credentials (Expo) for building/submitting the mobile app.
