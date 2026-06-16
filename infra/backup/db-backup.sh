#!/usr/bin/env bash
# ─── QCart Database Backup ──────────────────────────────────────────────────
# Run daily:  0 3 * * * /opt/qcart/infra/backup/db-backup.sh
# Restore:    gunzip -c <file.sql.gz> | docker compose exec -T postgres psql -U qcart qcart
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M%S)
COMPOSE="docker compose --env-file /opt/qcart/.env.prod -f /opt/qcart/docker-compose.yml -f /opt/qcart/docker-compose.vps.yml"

mkdir -p "${BACKUP_DIR}"

# Compressed dump via compose service
echo "[$(date)] Starting Postgres dump…"
$COMPOSE exec -T postgres pg_dump -U qcart qcart --compress=9 > "${BACKUP_DIR}/qcart_${DATE}.sql.gz"
echo "[$(date)] Dump complete: $(du -h "${BACKUP_DIR}/qcart_${DATE}.sql.gz" | cut -f1)"

# Optional: age-encrypt before off-site sync
# AGE_KEY="${AGE_KEY:-/opt/backups/backup-key.txt}"
# if [ -f "${AGE_KEY}" ]; then
#   age -e -i "${AGE_KEY}" -o "${BACKUP_DIR}/qcart_${DATE}.sql.gz.age" "${BACKUP_DIR}/qcart_${DATE}.sql.gz"
#   rm "${BACKUP_DIR}/qcart_${DATE}.sql.gz"
# fi

# Rotate old backups
find "${BACKUP_DIR}" -name "qcart_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Retention: keeping last ${RETENTION_DAYS} days"

# Log last backup time for monitoring
echo "${DATE}" > /opt/backups/postgres/last-backup.txt
