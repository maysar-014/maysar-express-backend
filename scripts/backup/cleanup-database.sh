#!/bin/sh
# Maysar Database Cleanup Script
# Automated cleanup of expired backups and temporary data per retention policy
#
# Usage:
#   cleanup-database.sh [--dry-run]
#
# Environment variables:
#   ENCRYPTION_KEY       Encryption key for reading encrypted backups (if needed)
#   BACKUP_S3_BUCKET     S3 bucket for offsite backups
#   AWS_ACCESS_KEY_ID    AWS access key ID
#   AWS_SECRET_ACCESS_KEY AWS secret access key
#   AWS_DEFAULT_REGION   AWS region

set -eu

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
fi

echo "=== Maysar Database Cleanup ==="
echo "Mode: $([ "$DRY_RUN" = "1" ] && echo "DRY RUN" || echo "LIVE")"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# PostgreSQL cleanup
echo "--- PostgreSQL Cleanup ---"

# Delete expired Redis backups (older than retention period)
REDIS_RETENTION_DAYS=${REDIS_BACKUP_RETENTION_DAYS:-7}
if [ -d /backups/redis ]; then
  echo "Cleaning Redis backups older than ${REDIS_RETENTION_DAYS} days..."
  if [ "$DRY_RUN" = "1" ]; then
    find /backups/redis -type f -mtime +${REDIS_RETENTION_DAYS} -print | while read -r f; do echo "Would delete: $f"; done
  else
    find /backups/redis -type f -mtime +${REDIS_RETENTION_DAYS} -delete
    echo "Redis cleanup complete."
  fi
else
  echo "No Redis backup directory found, skipping."
fi

# PostgreSQL logical backup cleanup
POSTGRES_RETENTION_DAYS=${POSTGRES_BACKUP_RETENTION_DAYS:-7}
if [ -d /backups/postgres ]; then
  echo "Cleaning PostgreSQL logical backups older than ${POSTGRES_RETENTION_DAYS} days..."
  if [ "$DRY_RUN" = "1" ]; then
    find /backups/postgres -type f -mtime +${POSTGRES_RETENTION_DAYS} -print | while read -r f; do echo "Would delete: $f"; done
  else
    find /backups/postgres -type f -mtime +${POSTGRES_RETENTION_DAYS} -delete
    echo "PostgreSQL logical backup cleanup complete."
  fi
else
  echo "No PostgreSQL backup directory found, skipping."
fi

echo ""
echo "=== Cleanup Complete ==="
