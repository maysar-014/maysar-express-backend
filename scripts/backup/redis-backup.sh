#!/bin/bash

# Redis Backup Script
# Automated hourly backup for production cache

set -e

# Configuration from environment variables with defaults
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
# REDIS_PASSWORD must be provided in the environment
BACKUP_DIR=${BACKUP_DIR:-/backups/redis}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
S3_BUCKET=${S3_BUCKET:-}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="redis_$TIMESTAMP.rdb.gz"

echo "🔴 [$(date '+%Y-%m-%d %H:%M:%S')] Starting Redis backup..."

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Capture BEFORE baseline LASTSAVE
LAST_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE 2>/dev/null)

# Trigger BGSAVE
echo "🔄 Triggering Redis BGSAVE..."
BGSAVE_OUTPUT=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE 2>&1)

if [[ "$BGSAVE_OUTPUT" == *"Background save already in progress"* ]]; then
    echo "ℹ️  Background save already in progress, waiting for it to finish..."
elif [[ "$BGSAVE_OUTPUT" != "Background save started" ]]; then
    echo "❌ Error triggering BGSAVE: $BGSAVE_OUTPUT"
    exit 1
fi

# Poll LASTSAVE until completion (timeout 60s)
TIMEOUT=60
START_TIME=$(date +%s)

echo "⏳ Waiting for snapshot completion..."
while true; do
    CURRENT_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE 2>/dev/null)
    if [ "$CURRENT_SAVE" -gt "$LAST_SAVE" ]; then
        echo "✅ Redis snapshot completed"
        break
    fi
    
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
        echo "❌ Timeout waiting for Redis BGSAVE"
        exit 1
    fi
    
    sleep 2
done

# Copy and compress the RDB file
# Assumes the Redis data is mounted or accessible at /data/dump.rdb
if [ -f "/data/dump.rdb" ]; then
    echo "📦 Compressing RDB file..."
    gzip -c "/data/dump.rdb" > "$BACKUP_DIR/$FILENAME"
else
    echo "❌ Error: /data/dump.rdb not found"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✅ Backup completed: $FILENAME ($FILE_SIZE)"

# Optional S3 Upload
if [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to S3 bucket: $S3_BUCKET..."
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://$S3_BUCKET/redis/$FILENAME"
        echo "✅ S3 upload successful"
    else
        echo "⚠️  AWS CLI not found, skipping S3 upload"
    fi
fi

# Retention Policy
echo "🧹 Pruning backups older than $BACKUP_RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.rdb.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete

REMAINING_COUNT=$(find "$BACKUP_DIR" -name "*.rdb.gz" | wc -l)
echo "✨ Success! Redis backup cycle finished. Total backups stored: $REMAINING_COUNT"
