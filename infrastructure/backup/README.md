# Qlisted database backups

Nightly gzipped `pg_dump` of the production Postgres, with integrity check and
retention. Ported from the Escoutly backup pattern; reads DB creds from
`.env.prod` instead of hardcoding them.

## Install (on the VPS, as root)

```bash
install -m 0755 /var/www/qcart/infrastructure/backup/qlisted-backup.sh /usr/local/bin/qlisted-backup.sh
# nightly at 03:30
( crontab -l 2>/dev/null; echo "30 3 * * * /usr/local/bin/qlisted-backup.sh >> /var/log/qlisted-backup.log 2>&1" ) | crontab -
# run once to verify
/usr/local/bin/qlisted-backup.sh
ls -lh /var/backups/qlisted
```

## Tunables (env)

| Var | Default | Meaning |
|---|---|---|
| `QLISTED_ENV` | `/var/www/qcart/.env.prod` | Where DB creds are read from |
| `QLISTED_BACKUP_DIR` | `/var/backups/qlisted` | Output directory |
| `RETAIN_DAYS` | `14` | Delete dumps older than this |
| `PG_CONTAINER` | `qcart-prod-postgres-1` | Postgres container name |

## Restore

```bash
gunzip -c /var/backups/qlisted/qlisted-YYYYMMDD-HHMMSS.sql.gz \
  | docker exec -i -e PGPASSWORD="$PW" qcart-prod-postgres-1 psql -U qcart -d qcart
```

## Offsite (optional, recommended)

Add a line to the script (or a second cron) to copy the newest dump to object
storage, e.g. `aws s3 cp "$FILE" s3://<bucket>/qlisted/` — keeps a copy if the
VPS is lost.
