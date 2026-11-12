#!/bin/sh

# PostgreSQL Point-in-Time Recovery (PITR) restore script using pgBackRest
# Restores a base backup and replays WAL archives to a specific target time.
#
# Usage:
#   postgres-restore-pitr.sh [target_time] [target_db]
#
# Arguments:
#   target_time  Target recovery time in ISO 8601 format (e.g., 2024-01-15 10:30:00+00)
#                If omitted, recovers to the latest available WAL entry.
#   target_db    Target database name (default: maysar)
#
# Environment variables:
#   PG_BACKREST_STANZA   Stanza name (default: maysar)
#   PG_BACKREST_CONFIG   pgBackRest config path (default: /etc/pgbackrest.conf)
#   PGPASSWORD           PostgreSQL password (required)
#   POSTGRES_HOST        PostgreSQL host (default: postgres)
#   POSTGRES_PORT        PostgreSQL port (default: 5432)
#   POSTGRES_USER        PostgreSQL user (default: postgres)
#   RESTORE_OVERWRITE    Set to 1 to drop and recreate the target database (default: 0)

set -eu

PG_BACKREST_STANZA="${PG_BACKREST_STANZA:-maysar}"
PG_BACKREST_CONFIG="${PG_BACKREST_CONFIG:-/etc/pgbackrest.conf}"
PGPASSWORD="${PGPASSWORD:?PGPASSWORD must be set}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-maysar}"
RESTORE_OVERWRITE="${RESTORE_OVERWRITE:-0}"

TARGET_TIME="${1:-}"
TARGET_DB="${2:-$POSTGRES_DB}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting PostgreSQL PITR restore..."
echo "Target database: $TARGET_DB"
if [ -n "$TARGET_TIME" ]; then
  echo "Recovery target time: $TARGET_TIME"
else
  echo "Recovery target: latest available WAL"
fi

###############################################################################
# Verify pgBackRest is available
###############################################################################
if ! command -v pgbackrest >/dev/null 2>&1; then
  echo "ERROR: pgbackrest not found. Cannot perform PITR restore."
  exit 1
fi

###############################################################################
# Check if target database exists
###############################################################################
db_exists() {
  DB_NAME="$1"
  EXISTS="$(
    psql \
      --host="$POSTGRES_HOST" \
      --port="$POSTGRES_PORT" \
      --username="$POSTGRES_USER" \
      --dbname="postgres" \
      --tuples-only \
      --no-align \
      --command="SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" \
      | tr -d '[:space:]'
  )"
  [ "$EXISTS" = "1" ]
}

if db_exists "$TARGET_DB"; then
  if [ "$RESTORE_OVERWRITE" != "1" ]; then
    echo "ERROR: Target database '$TARGET_DB' already exists."
    echo "Set RESTORE_OVERWRITE=1 to drop and recreate it before restore."
    exit 1
  fi

  echo "Dropping existing database '$TARGET_DB'..."
  psql \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    --dbname="postgres" \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();" \
    >/dev/null

  dropdb \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    "$TARGET_DB"
fi

if ! db_exists "$TARGET_DB"; then
  echo "Creating target database '$TARGET_DB'..."
  createdb \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    "$TARGET_DB"
fi

###############################################################################
# Stop PostgreSQL on target (if local) and restore via pgBackRest
###############################################################################
echo "Restoring base backup via pgBackRest..."

# Build pgBackRest restore command
RESTORE_CMD="pgbackrest \
  --stanza=\"$PG_BACKREST_STANZA\" \
  --config=\"$PG_BACKREST_CONFIG\" \
  --delta \
  restore"

if [ -n "$TARGET_TIME" ]; then
  RESTORE_CMD="$RESTORE_CMD --recovery-option=recovery_target_time='$TARGET_TIME'"
  RESTORE_CMD="$RESTORE_CMD --recovery-option=recovery_target_action=promote"
fi

echo "Executing: $RESTORE_CMD"
eval "$RESTORE_CMD"

if [ $? -ne 0 ]; then
  echo "ERROR: pgBackRest restore failed."
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] PITR restore completed successfully for database '$TARGET_DB'."
echo "Verify the restored data before switching application traffic."