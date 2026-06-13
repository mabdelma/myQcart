#!/usr/bin/env bash
# ─── QCart VPS deploy / redeploy ─────────────────────────────────────────────
# QCart shares the VPS with qarrito (which owns Caddy) and escoutly. This script
# rebuilds the qcart images (the frontend re-bakes VITE_STRIPE_KEY from .env.prod),
# runs DB migrations + seed via the `migrate` service, and (re)starts the stack on
# the shared `edge` network. Caddy auto-discovers qcart-frontend by name.
#
# Run from the qcart project root on the VPS:
#   ./scripts/deploy-vps.sh
#
# One-time prereqs: Docker + compose installed, repo cloned, `.env.prod` filled,
# `docker network create edge` done, and the qcart.gmtmall.com block added to
# qarrito's Caddyfile (see DEPLOYMENT.md).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.prod"
COMPOSE="docker compose --env-file ${ENV_FILE} -f docker-compose.yml -f docker-compose.vps.yml"

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found. Copy .env.prod.example → .env.prod and fill it." >&2
  exit 1
fi

# The shared reverse-proxy network must exist before qcart-frontend can join it.
if ! docker network inspect edge >/dev/null 2>&1; then
  echo "▶ Creating shared 'edge' network…"
  docker network create edge
fi

echo "▶ 1/3  Pulling latest code (main)…"
git pull origin main

echo "▶ 2/3  Building images (VITE_STRIPE_KEY baked from ${ENV_FILE})…"
$COMPOSE build

echo "▶ 3/3  Starting/refreshing services (migrate runs drizzle push + seed)…"
$COMPOSE up -d

echo "✔ Deploy complete."
$COMPOSE ps

cat <<'NOTE'

If this is the FIRST deploy (or you changed the Caddyfile), reload the shared
Caddy from the qarrito project so qcart.gmtmall.com starts routing + gets a cert:

  cd /path/to/qarrito
  docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
NOTE
