#!/usr/bin/env bash
# Daily Postgres backup for Qlisted — gzipped pg_dump with retention + integrity check.
# Install: copy to /usr/local/bin/qlisted-backup.sh (chmod +x) and add a root cron:
#   30 3 * * * /usr/local/bin/qlisted-backup.sh >> /var/log/qlisted-backup.log 2>&1
# Creds are read from the prod env file (not hardcoded).
set -euo pipefail

ENV_FILE=${QLISTED_ENV:-/var/www/qcart/.env.prod}
DEST=${QLISTED_BACKUP_DIR:-/var/backups/qlisted}
RETAIN_DAYS=${RETAIN_DAYS:-14}
CONTAINER=${PG_CONTAINER:-qcart-prod-postgres-1}

val() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }
PGUSER=$(val POSTGRES_USER); PGUSER=${PGUSER:-qcart}
PGDB=$(val POSTGRES_DB);     PGDB=${PGDB:-qcart}
PGPASS=$(val POSTGRES_PASSWORD)

mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DEST/qlisted-$STAMP.sql.gz"

docker exec -e PGPASSWORD="$PGPASS" "$CONTAINER" \
  pg_dump -U "$PGUSER" -d "$PGDB" --no-owner --no-privileges | gzip -9 > "$FILE"

# Integrity: gzip must be valid and the dump non-trivial in size.
if ! gzip -t "$FILE" || [ "$(stat -c%s "$FILE")" -lt 1024 ]; then
  echo "[qlisted-backup] FAILED integrity check: $FILE" >&2
  rm -f "$FILE"; exit 1
fi

find "$DEST" -name 'qlisted-*.sql.gz' -mtime +"$RETAIN_DAYS" -delete
echo "[qlisted-backup] ok $(date -Is) $FILE ($(stat -c%s "$FILE") bytes)"
