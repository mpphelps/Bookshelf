#!/usr/bin/env bash
#
# Nightly Postgres backup for Bookshelf.
# Dumps the prod DB, encrypts via rclone crypt overlay, uploads to Backblaze B2,
# prunes old local + remote dumps, pings healthchecks.io with status.
#
# Edit the config constants below for your environment, then copy this file
# to ~/scripts/backup.sh on the Pi and `chmod +x` it. See DEPLOYMENT.md.
#

set -euo pipefail

# --- Config — edit for your environment ---
HC_PING_URL="https://hc-ping.com/REPLACE-WITH-YOUR-UUID"
BACKUP_DIR="/home/mpphelps/backups"
RETENTION_LOCAL_DAYS=7
RETENTION_REMOTE_DAYS=30
RCLONE_REMOTE="bookshelf-b2-crypt:"
DB_CONTAINER="bookshelf-prod-db-1"
DB_NAME="bookshelf"
DB_USER="bookshelf"

# --- Setup ---
TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
BACKUP_FILE="$BACKUP_DIR/bookshelf-${TIMESTAMP}.dump"

# On any error below, ping /fail so healthchecks.io alerts.
trap 'curl -fsS -m 10 --retry 3 "$HC_PING_URL/fail" >/dev/null || true' ERR

# Start ping (best-effort; don't fail the script if it errors)
curl -fsS -m 10 --retry 3 "$HC_PING_URL/start" >/dev/null || true

mkdir -p "$BACKUP_DIR"

# --- Dump ---
echo "[$(date)] Starting pg_dump from container ${DB_CONTAINER}"
docker exec "${DB_CONTAINER}" pg_dump -Fc -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"

# Sanity: refuse to upload an empty dump (would silently overwrite good backups)
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "[$(date)] ERROR: dump file is empty" >&2
  exit 1
fi
DUMP_SIZE=$(stat -c%s "${BACKUP_FILE}")
echo "[$(date)] Dump complete, size: ${DUMP_SIZE} bytes"

# --- Upload ---
echo "[$(date)] Uploading to ${RCLONE_REMOTE}"
rclone copy "${BACKUP_FILE}" "${RCLONE_REMOTE}" --progress

# --- Prune local ---
echo "[$(date)] Pruning local dumps older than ${RETENTION_LOCAL_DAYS} days"
find "${BACKUP_DIR}" -name "bookshelf-*.dump" -mtime +${RETENTION_LOCAL_DAYS} -delete

# --- Prune remote ---
echo "[$(date)] Pruning remote dumps older than ${RETENTION_REMOTE_DAYS} days"
rclone delete --min-age "${RETENTION_REMOTE_DAYS}d" "${RCLONE_REMOTE}"

# --- Success ping ---
echo "[$(date)] Backup complete"
curl -fsS -m 10 --retry 3 "${HC_PING_URL}" >/dev/null
