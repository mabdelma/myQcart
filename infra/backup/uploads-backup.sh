#!/usr/bin/env bash
# ─── QCart Uploads Backup ───────────────────────────────────────────────────
# Run daily after db-backup:  0 4 * * * /opt/qcart/infra/backup/uploads-backup.sh
# Restore:    tar xzf <file.tar.gz> -C /
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="/opt/backups/uploads"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d)

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting uploads backup…"
tar czf "${BACKUP_DIR}/uploads_${DATE}.tar.gz" -C /opt/qcart/uploads/
echo "[$(date)] Uploads backup complete: $(du -h "${BACKUP_DIR}/uploads_${DATE}.tar.gz" | cut -f1)"

# Rotate
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Retention: keeping last ${RETENTION_DAYS} days"
