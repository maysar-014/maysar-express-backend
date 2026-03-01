#!/bin/bash

# PostgreSQL Backup Script
# Automated daily backup for production database

set -eo pipefail

# Configuration from environment variables with defaults
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_DB=${POSTGRES_DB:-maysar}
POSTGRES_USER=${POSTGRES_USER:-postgres}
# PGPASSWORD must be provided in the environment
BACKUP_DIR=${BACKUP_DIR:-/backups/postgres}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
S3_BUCKET=${S3_BUCKET:-}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="maysar_$TIMESTAMP.sql.gz"

echo "🐘 [$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "🔄 Dumping database $POSTGRES_DB from $POSTGRES_HOST..."
pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/$FILENAME"

# Verify integrity and non-emptiness
echo "🔍 Validating backup integrity..."
if [ ! -s "$BACKUP_DIR/$FILENAME" ]; then
    echo "❌ Backup failed: Generated file is empty"
    exit 1
fi

if ! gzip -t "$BACKUP_DIR/$FILENAME"; then
    echo "❌ Backup failed: Compressed file is corrupted"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✅ Backup completed: $FILENAME ($FILE_SIZE)"

# Optional S3 Upload
if [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to S3 bucket: $S3_BUCKET..."
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://$S3_BUCKET/postgres/$FILENAME"
        echo "✅ S3 upload successful"
    else
        echo "⚠️  AWS CLI not found, skipping S3 upload"
    fi
fi

# Retention Policy
echo "🧹 Pruning backups older than $BACKUP_RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete

REMAINING_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "✨ Success! PostgreSQL backup cycle finished. Total backups stored: $REMAINING_COUNT"
