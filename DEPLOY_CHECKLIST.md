# QCart — Deploy Checklist

Run these steps when you're ready to deploy to production.

## Before you push

### 1. Delete live secrets from local disk

The following files contain live Stripe keys and must NOT be committed:

```bash
# Delete live .env files (gitignored, but verify)
Remove-Item -LiteralPath ".env" -Force
Remove-Item -LiteralPath "server/.env" -Force

# Keep only the example templates
# .env.prod (gitignored) - keep for reference / scp to VPS
```

Verify with: `git status` — should show only your intended changes.

### 2. Set GitHub secrets

Go to `https://github.com/anomalyco/qcart/settings/secrets/actions` and ensure
these are set:

| Secret | Value | Required | Notes |
|--------|-------|----------|-------|
| `VPS_HOST` | `31.97.158.10` | ✅ | |
| `VPS_USER` | `root` | ✅ | |
| `VPS_SSH_KEY` | *private key* | ✅ | SSH deploy key for VPS |
| `VITE_STRIPE_KEY` | `pk_live_…` | ✅ | Baked into frontend bundle |
| `SENTRY_DSN` | `https://…@o….ingest.sentry.io/…` | ✅ | Frontend + server error tracking |
| `SENTRY_ORG` | `anomalyco` | ✅ | Sentry org slug |
| `SENTRY_PROJECT` | `qcart` | ✅ | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | `sntrys_…` | ✅ | Has `project:releases` + `org:read` scopes |

### 3. Verify CI passes

```bash
npm run ci
# Runs: lint → typecheck → test → build for both frontend and server
```

### 4. Commit and push

```bash
git add -A
git commit -m "Production readiness: deploy pipeline, monitoring, CDN, backup"
git push origin main
```

## First deploy

After `git push`, the `CI` workflow runs automatically. On success on `main`,
the `deploy` workflow:

1. Builds frontend Docker image (bakes `VITE_STRIPE_KEY`, Sentry source maps)
2. Builds server Docker image
3. Pushes both images to GHCR (`ghcr.io/anomalyco/qcart-*`)
4. SSHes into the VPS, runs:
   ```bash
   cd /opt/qcart
   git pull
   sed -i "s|image: ghcr.io/anomalyco/qcart-frontend:.*|image: ghcr.io/anomalyco/qcart-frontend:${{ github.sha }}|" docker-compose.vps.yml
   sed -i "s|image: ghcr.io/anomalyco/qcart-api:.*|image: ghcr.io/anomalyco/qcart-api:${{ github.sha }}|" docker-compose.vps.yml
   docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.vps.yml pull
   docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.vps.yml up -d --force-recreate migrate
   docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.vps.yml up -d --force-recreate api qcart-frontend
   ```

## After deploy

### Generate VAPID keys

On any machine with Node:
```bash
npx web-push generate-vapid-keys
# Save BOTH keys to .env.prod on the VPS:
#   VAPID_PUBLIC_KEY=…
#   VAPID_PRIVATE_KEY=…
```

Then restart the API on VPS:
```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.vps.yml up -d --force-recreate api
```

### Verify production

1. **HTTPS**: Open `https://qlisted.com` — should load with valid cert
2. **API health**: `curl https://qlisted.com/api/health/readiness` → `{"status":"ok"}`
3. **Sentry**: Trigger a test error → check Sentry dashboard for error + source maps
4. **Stripe**: Place a test order with a real card — verify webhook received
5. **Push notification**: Enable notifications in browser → confirm VAPID keys work

### Set up monitoring (next business day)

```bash
# On VPS:
docker compose -f /opt/qcart/docker-compose.monitoring.yml up -d
# Then configure Grafana at http://VPS_IP:3002 (tunneled over SSH)
```

### Set up backups

```bash
# On VPS:
crontab -e
# Add:
# 0 3 * * * /opt/qcart/infra/backup/db-backup.sh
# 0 4 * * * /opt/qcart/infra/backup/uploads-backup.sh
```

## Rollback

If the deploy breaks:

```bash
# SSH into VPS
cd /opt/qcart
git checkout <previous-deploy-commit>
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```
