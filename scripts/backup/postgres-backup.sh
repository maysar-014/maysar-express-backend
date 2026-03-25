#!/bin/sh

# PostgreSQL backup script (portable, provider-neutral)
# Creates timestamped SQL dumps compressed with gzip.

set -eu

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-maysar}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_FILE_PREFIX="${BACKUP_FILE_PREFIX:-maysar}"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD must be set in the environment."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASENAME="${BACKUP_FILE_PREFIX}_${POSTGRES_DB}_${TIMESTAMP}.sql"
SQL_TMP="${BACKUP_DIR}/.${BASENAME}.tmp"
GZ_TMP="${SQL_TMP}.gz"
FINAL_FILE="${BACKUP_DIR}/${BASENAME}.gz"

if [ -e "$FINAL_FILE" ]; then
  echo "ERROR: Backup file already exists: $FINAL_FILE"
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting PostgreSQL backup..."
echo "Creating SQL dump for database '$POSTGRES_DB' from host '$POSTGRES_HOST'."

pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=plain \
  --encoding=UTF8 \
  --no-owner \
  --no-privileges \
  --file="$SQL_TMP"

gzip -9 "$SQL_TMP"
mv "$GZ_TMP" "$FINAL_FILE"

if [ ! -s "$FINAL_FILE" ]; then
  echo "ERROR: Backup file is empty: $FINAL_FILE"
  exit 1
fi

gzip -t "$FINAL_FILE"

FILE_SIZE="$(du -h "$FINAL_FILE" | cut -f1)"
echo "Backup completed: $FINAL_FILE ($FILE_SIZE)"

case "$BACKUP_RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "ERROR: BACKUP_RETENTION_DAYS must be an integer."
    exit 1
    ;;
  *)
    if [ "$BACKUP_RETENTION_DAYS" -gt 0 ]; then
      find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
    fi
    ;;
esac

TOTAL_FILES="$(find "$BACKUP_DIR" -type f -name "*.sql.gz" | wc -l | tr -d ' ')"
echo "Backup cycle finished. Total retained SQL backups: $TOTAL_FILES"
