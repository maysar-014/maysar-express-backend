#!/bin/sh

# PostgreSQL backup script (portable, provider-neutral)
# Creates:
#   1. Logical dump via pg_dump -Fc (portable, selective restore)
#   2. Physical base backup via pgBackRest (PITR capable)
#   3. WAL archive push for point-in-time recovery

set -eu

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-maysar}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_FILE_PREFIX="${BACKUP_FILE_PREFIX:-maysar}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
PG_BACKREST_STANZA="${PG_BACKREST_STANZA:-maysar}"
PG_BACKREST_CONFIG="${PG_BACKREST_CONFIG:-/etc/pgbackrest.conf}"
S3_BUCKET="${S3_BUCKET:-}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD must be set in the environment."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

###############################################################################
# 1. LOGICAL DUMP (pg_dump -Fc custom format)
###############################################################################
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting PostgreSQL logical backup..."

LOGICAL_BASENAME="${BACKUP_FILE_PREFIX}_${POSTGRES_DB}_${TIMESTAMP}.sql"
LOGICAL_TMP="${BACKUP_DIR}/.${LOGICAL_BASENAME}.tmp"
LOGICAL_GZ="${LOGICAL_TMP}.gz"
LOGICAL_FINAL="${BACKUP_DIR}/${LOGICAL_BASENAME}.gz"

if [ -e "$LOGICAL_FINAL" ]; then
  echo "ERROR: Logical backup file already exists: $LOGICAL_FINAL"
  exit 1
fi

echo "Creating SQL dump (custom format) for database '$POSTGRES_DB' from host '$POSTGRES_HOST'."

pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --encoding=UTF8 \
  --no-owner \
  --no-privileges \
  --file="$LOGICAL_TMP"

gzip -9 "$LOGICAL_TMP"
mv "$LOGICAL_GZ" "$LOGICAL_FINAL"

if [ ! -s "$LOGICAL_FINAL" ]; then
  echo "ERROR: Logical backup file is empty: $LOGICAL_FINAL"
  exit 1
fi

gzip -t "$LOGICAL_FINAL"

# Client-side encryption for logical backup
if [ -n "$ENCRYPTION_KEY" ]; then
  echo "Encrypting logical backup file..."
  openssl enc -aes-256-cbc -salt -pbkdf2 -in "$LOGICAL_FINAL" -out "${LOGICAL_FINAL}.enc" -pass pass:"$ENCRYPTION_KEY"
  rm "$LOGICAL_FINAL"
  LOGICAL_FINAL="${LOGICAL_FINAL}.enc"
fi

echo "Logical backup completed: $LOGICAL_FINAL"

###############################################################################
# 2. PHYSICAL BACKUP (pgBackRest base backup + WAL archive)
###############################################################################
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting PostgreSQL physical backup via pgBackRest..."

if command -v pgbackrest >/dev/null 2>&1; then
  # Push any pending WAL archives first
  echo "Pushing WAL archives..."
  pgbackrest \
    --stanza="$PG_BACKREST_STANZA" \
    --config="$PG_BACKREST_CONFIG" \
    archive-push

  # Run full backup
  echo "Running pgBackRest full backup..."
  pgbackrest \
    --stanza="$PG_BACKREST_STANZA" \
    --config="$PG_BACKREST_CONFIG" \
    --type=full \
    backup

  echo "Physical backup completed via pgBackRest."
else
  echo "WARNING: pgbackrest not found, skipping physical backup."
fi

###############################################################################
# 4. S3 OFFSITE UPLOAD
###############################################################################
if [ -n "$S3_BUCKET" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Uploading backups to S3 bucket: $S3_BUCKET..."

  if command -v s3cmd >/dev/null 2>&1; then
    # Upload logical backup
    LOGICAL_S3_KEY="postgres/logical/$(basename "$LOGICAL_FINAL")"
    echo "Uploading logical backup to s3://$S3_BUCKET/$LOGICAL_S3_KEY..."
    s3cmd put "$LOGICAL_FINAL" "s3://$S3_BUCKET/$LOGICAL_S3_KEY" \
      --region="$AWS_DEFAULT_REGION" \
      --storage-class=STANDARD_IA

    # Sync pgBackRest repository (base backups + WAL archives)
    if command -v pgbackrest >/dev/null 2>&1; then
      echo "Syncing pgBackRest repository to s3://$S3_BUCKET/pgbackrest/..."
      s3cmd sync /var/lib/pgbackrest "s3://$S3_BUCKET/pgbackrest/" \
        --region="$AWS_DEFAULT_REGION" \
        --storage-class=STANDARD_IA \
        --delete
    fi

    echo "S3 upload completed."
  else
    echo "WARNING: AWS CLI not found, skipping S3 upload."
  fi
fi

###############################################################################
# 5. RETENTION POLICY
###############################################################################
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Applying retention policy..."

case "$BACKUP_RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "ERROR: BACKUP_RETENTION_DAYS must be an integer."
    exit 1
    ;;
  *)
    if [ "$BACKUP_RETENTION_DAYS" -gt 0 ]; then
      if [ -n "$ENCRYPTION_KEY" ]; then
        find "$BACKUP_DIR" -type f -name "*.sql.gz.enc" -mtime +"$BACKUP_RETENTION_DAYS" -delete
      else
        find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
      fi
    fi
    ;;
esac

TOTAL_FILES="$(if [ -n "$ENCRYPTION_KEY" ]; then find "$BACKUP_DIR" -type f -name "*.sql.gz.enc" | wc -l; else find "$BACKUP_DIR" -type f -name "*.sql.gz" | wc -l; fi | tr -d ' ')"
echo "Backup cycle finished. Total retained logical backups: $TOTAL_FILES"
