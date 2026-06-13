# QCart — VPS Deployment (shared with qarrito + escoutly)

QCart runs on the **same VPS** as qarrito and escoutly. To avoid port clashes and
get automatic HTTPS, all apps follow one rule:

> **qarrito's stack owns the only Caddy reverse proxy** (it binds ports 80/443 and
> handles Let's Encrypt). Every other app — qcart, escoutly — publishes **no**
> ports and joins a shared external Docker network called **`edge`**. Caddy
> proxies each app by its container name.

QCart is **single-origin**: its own internal nginx serves the SPA and proxies
`/api` (including SSE) and `/uploads` to the qcart API. So Caddy only needs to
forward `qcart.gmtmall.com` → `qcart-frontend:80`.

```
Internet ──HTTPS──▶ Caddy (qarrito stack, :443)
                      │  qcart.gmtmall.com
                      ▼   (edge network, by name)
                 qcart-frontend:80  (nginx: SPA + /api + /uploads proxy)
                      │ (qcart internal network)
                      ▼
                   api:3001 ──▶ postgres:5432
```

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base stack (postgres, migrate, api, frontend). |
| `docker-compose.vps.yml` | Prod overlay: joins `edge`, drops published ports, injects secrets, persists uploads. |
| `frontend.Dockerfile` | Builds the SPA (bakes `VITE_STRIPE_KEY`) + nginx with `/api` (SSE-safe) and `/uploads` proxies. |
| `.env.prod.example` | Template for production secrets → copy to `.env.prod` (gitignored). |
| `scripts/deploy-vps.sh` | Pull → build → migrate+seed → up. |
| `infrastructure/caddy/qcart.Caddyfile` | Reference block to paste into qarrito's Caddyfile (already added there). |

## One-time setup on the VPS

1. **DNS** — add an A record: `qcart.gmtmall.com` → VPS public IP.

2. **Shared network** (skip if qarrito/escoutly already created it):
   ```bash
   docker network create edge
   ```

3. **Clone + configure secrets:**
   ```bash
   git clone <qcart-repo> qcart && cd qcart
   cp .env.prod.example .env.prod
   # edit .env.prod: strong POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 32),
   # STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET (sk_live/whsec), VITE_STRIPE_KEY (pk_live)
   ```

4. **Caddy block** — already added to qarrito's `infrastructure/caddy/Caddyfile`
   (the `qcart.gmtmall.com {…}` block). If qarrito's Caddyfile on the VPS predates
   that change, paste `infrastructure/caddy/qcart.Caddyfile` into it.

## Deploy / redeploy

```bash
./scripts/deploy-vps.sh
```

Then, on first deploy (or after editing the Caddyfile), reload the shared Caddy
from the **qarrito** project so the new host starts routing and gets a cert:

```bash
cd /path/to/qarrito
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Equivalent manual deploy:
```bash
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

## Stripe webhook

Point your Stripe webhook endpoint at:
```
https://qcart.gmtmall.com/api/webhooks/stripe
```
and set the resulting signing secret as `STRIPE_WEBHOOK_SECRET` in `.env.prod`.

## Notes / gotchas

- **No published ports.** The overlay uses `ports: !reset []` so the base file's
  `80/3001/5434` don't leak — only Caddy faces the internet. Postgres is private.
- **`VITE_STRIPE_KEY` is build-time.** Changing it requires `--build` (the deploy
  script always rebuilds). The publishable key is safe to expose; never put the
  secret key in `VITE_*`.
- **Uploads persist** in the `qcart_uploads` Docker volume mounted at the API's
  `/app/uploads`.
- **Migrations + seed** run automatically via the `migrate` service on every
  `up`. Seeding is idempotent-by-intent; review `server/src/db/seed.ts` before
  re-running against data you care about.
- **Container name `qcart-frontend`** must stay unique across all apps on `edge`
  — Caddy resolves it by that name.
```
