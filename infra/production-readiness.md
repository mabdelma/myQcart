# QCart Production Readiness

## Auto-Scaling

### Current Architecture
- Single VPS (2 vCPU, 4 GB RAM) running all services via Docker Compose
- Single API instance, single Postgres, single Redis
- No load balancer, no horizontal scaling

### Recommended Strategy

**Phase 1 — Multi-instance API (next 3 months)**
- Add a second VPS as an API worker
- Docker Compose overlay for workers: `docker-compose.worker.yml`
- Redis pub/sub already wired for SSE across instances
- Caddy reverse proxy on primary VPS load-balances to both API instances
- No session affinity needed (JWT-based auth, no server-side sessions)

**Phase 2 — Managed Postgres (next 6 months)**
- Migrate from Docker Postgres to a managed service (e.g., Aiven, DigitalOcean Managed DB)
- Benefits: automated backups, point-in-time recovery, read replicas, auto-scaling storage
- Update `DATABASE_URL` in `.env.prod` — everything else stays the same

**Phase 3 — Kubernetes (12+ months)**
- Only if cross-region or >100 concurrent restaurants
- Service mesh (e.g., Linkerd) for observability
- Horizontal Pod Autoscaler based on CPU/memory/custom metrics
- Cluster: 3 nodes (2 general-purpose + 1 spot)

---

## CDN Strategy

### Current State
- No CDN; nginx on the frontend container serves all assets directly
- Cache headers set for `/assets/` (immutable, 1 year)
- Uploaded images served via API at `/uploads/` (no CDN)

### Recommended CDN

**Implementation: Cloudflare (Free tier → Pro)**
- DNS: Point `qcart.gmtmall.com` to Cloudflare (change nameservers)
- Proxied (orange cloud) for DDoS protection + SSL termination + caching
- Page Rules:
  1. `qcart.gmtmall.com/assets/*` → Cache everything, Edge Cache TTL 1 year
  2. `qcart.gmtmall.com/uploads/*` → Cache everything, Edge Cache TTL 7 days
  3. `qcart.gmtmall.com/api/*` → No cache, Bypass (dynamic content)
  4. `qcart.gmtmall.com/` → Cache everything, Edge Cache TTL 5 minutes (SSR-like TTL for marketing pages)
- Workers (optional): Rate limiting for `/api/` at the edge before it hits the VPS
- Argo Smart Routing: reduces API latency by routing over Cloudflare's backbone

**Why Cloudflare over other CDNs:**
- Free tier sufficient for current scale
- Built-in DDoS protection (critical for a SaaS payment platform)
- Workers for edge rate limiting
- Zero-ssl / automatic certificate management (already managed by Caddy, but Cloudflare adds a layer)

### nginx CDN config (already exists in `infra/nginx/cdn.conf`)
- If not using Cloudflare, configure the CDN nginx as a caching reverse proxy on a separate machine or VPS
- Point DNS to CDN nginx IP, which proxies to origin VPS
- Not necessary if Cloudflare is used

---

## Backup Strategy

### Current State
- Postgres runs in Docker with a single volume (`pgdata`)
- No automated backups configured
- No point-in-time recovery capability
- Uploaded images stored in Docker volume (`qcart_uploads`)
- `.env.prod` holds all secrets — if volume is lost, configuration is gone

### Recommended Backup Implementation

**Database (Postgres) — `infra/backup/db-backup.sh`:**
```bash
#!/bin/bash
# Run daily via cron: 0 3 * * * /opt/qcart/infra/backup/db-backup.sh
set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M%S)
COMPOSE="docker compose --env-file /opt/qcart/.env.prod -f /opt/qcart/docker-compose.yml -f /opt/qcart/docker-compose.vps.yml"

# Dump via compose service
$COMPOSE exec -T postgres pg_dump -U qcart qcart --compress=9 > "${BACKUP_DIR}/qcart_${DATE}.sql.gz"

# Encrypt with age (age-keygen -o backup-key.txt)
# age -e -r age1... -o "${BACKUP_DIR}/qcart_${DATE}.sql.gz.age" "${BACKUP_DIR}/qcart_${DATE}.sql.gz"
# rm "${BACKUP_DIR}/qcart_${DATE}.sql.gz"

# Rotate old backups
find "${BACKUP_DIR}" -name "qcart_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
```

**Uploads — `infra/backup/uploads-backup.sh`:**
```bash
#!/bin/bash
# Run daily via cron after db backup
set -euo pipefail

BACKUP_DIR="/opt/backups/uploads"
DATE=$(date +%Y-%m-%d)
COMPOSE="docker compose --env-file /opt/qcart/.env.prod -f /opt/qcart/docker-compose.yml -f /opt/qcart/docker-compose.vps.yml"

tar czf "${BACKUP_DIR}/uploads_${DATE}.tar.gz" -C /opt/qcart uploads/
```

**Off-site replication (optional but recommended):**
- `rclone` to Backblaze B2, S3, or any S3-compatible storage
- Cost: ~$0.006/GB/month for Backblaze B2
- Encrypt with `age` before upload (keys stored on VPS + in 1Password)

**Cron setup (on VPS):**
```bash
# Install backup scripts
chmod +x /opt/qcart/infra/backup/*.sh

# Add to root crontab
0 3 * * * /opt/qcart/infra/backup/db-backup.sh
0 4 * * * /opt/qcart/infra/backup/uploads-backup.sh
```

**Restore procedure:**
```bash
# Database restore
gunzip -c qcart_2024-01-01_030000.sql.gz | docker compose exec -T postgres psql -U qcart qcart

# Uploads restore
tar xzf uploads_2024-01-01.tar.gz -C /
```

---

## Monitoring

### Current State
- Sentry: frontend error tracking (via `@sentry/react`) and server error tracking
- Health endpoints: `/api/health`, `/api/health/liveness`, `/api/health/readiness`
- Docker health checks on `postgres`, `redis`, and `api` services
- Pino structured logging (no log aggregation)

### Recommended Additions

**1. Uptime Monitoring (free)**
- **Better Stack** (betterstack.com) — free tier: 10 monitors, 30s intervals
- Monitors: `https://qcart.gmtmall.com` (HTTP), `https://qcart.gmtmall.com/api/health/readiness` (HTTP + keyword "ok")
- Alert channels: Email, Slack webhook, SMS (paid)
- Response: on-call rotation via PagerDuty or Opsgenie (if > 1 person)

**2. Server Metrics (self-hosted, free)**
- Netdata (one-liner install on VPS):
  ```bash
  bash <(curl -Ss https://my-netdata.io/kickstart.sh) --stable-channel
  ```
  - CPU, memory, disk, network, process-level per container
  - Built-in alerts for disk space, OOM, high CPU
  - Web dashboard at `http://VPS_IP:19999`

**3. Log Aggregation**
- **Loki + Promtail + Grafana** (self-hosted via Docker Compose):
  ```yaml
  # docker-compose.monitoring.yml
  services:
    promtail:
      image: grafana/promtail:latest
      volumes:
        - /var/log:/var/log
        - /var/lib/docker/containers:/var/lib/docker/containers
      configs: /etc/promtail/config.yml
    loki:
      image: grafana/loki:latest
      ports: ["3100"]
    grafana:
      image: grafana/grafana:latest
      ports: ["3000:3000"]
  ```
- Dashboards: API request rate, error rate (4xx/5xx), p50/p95 latency, order throughput
- **Alternative (managed, free tier):** Better Stack logs (10 GB/month free)

**4. Postgres Monitoring**
- `pg_stat_statements` extension for slow query tracking
- Enable in Postgres config:
  ```
  shared_preload_libraries = 'pg_stat_statements'
  pg_stat_statements.track = all
  ```
- Query: top 10 slowest queries:
  ```sql
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  ```

**5. Alerting Thresholds**

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Disk usage | >80% | >90% | Prune old Docker images, add volume |
| Memory | >80% | >90% | Restart container, add swap |
| API response time (p95) | >500ms | >2s | Scale up API, check DB queries |
| Order creation failures | >1% of orders | >5% | Check Stripe, check DB, rollback deploy |
| SSL certificate expiry | <30 days | <7 days | Caddy auto-renews, verify Caddyfile |
| Postgres connections | >80% of max | >90% | Add PgBouncer connections |
| Push notification failures | >10% | >50% | Check VAPID keys, check browser support |

---

## Implementation Order

1. **Week 1:** Deploy Cloudflare DNS + proxying (10 min setup, immediate DDoS protection)
2. **Week 1:** Set up Better Stack uptime monitor + Netdata (30 min)
3. **Week 2:** Create backup scripts + cron + test restore (2 hours)
4. **Week 2:** Set up log aggregation (Loki + Promtail or Better Stack) (1 hour)
5. **Week 3:** Configure age encryption + rclone off-site backups (1 hour)
6. **Week 3:** Add PgBouncer to connection pool (already has config in `infra/pgbouncer/`) (30 min)
7. **Month 2:** Add second API instance for HA
8. **Month 3-6:** Migrate Postgres to managed service
