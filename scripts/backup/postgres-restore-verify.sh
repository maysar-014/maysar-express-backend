#!/bin/sh

# PostgreSQL restore verification script.
# Creates a test database, restores a backup, and verifies table/data parity.
#
# Usage:
#   postgres-restore-verify.sh [backup_file]
#
# Notes:
# - If backup_file is omitted, the latest backup in BACKUP_DIR is used.
# - Set KEEP_RESTORE_TEST_DB=1 to preserve the restored test DB.

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-maysar}"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
KEEP_RESTORE_TEST_DB="${KEEP_RESTORE_TEST_DB:-0}"

BACKUP_FILE="${1:-}"
VERIFY_DB="restore_test_$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD must be set in the environment."
  exit 1
fi

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE="$(ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -n 1 || true)"
fi

if [ -z "$BACKUP_FILE" ]; then
  echo "ERROR: No backup file found in $BACKUP_DIR."
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

SOURCE_COUNTS="$(mktemp)"
RESTORE_COUNTS="$(mktemp)"
DIFF_FILE="$(mktemp)"

cleanup() {
  rm -f "$SOURCE_COUNTS" "$RESTORE_COUNTS" "$DIFF_FILE"
}

trap cleanup EXIT

collect_table_counts() {
  DB_NAME="$1"
  OUT_FILE="$2"

  psql \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    --dbname="$DB_NAME" \
    --tuples-only \
    --no-align \
    --command="SELECT format('%I.%I', schemaname, tablename) FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;" \
    | while IFS= read -r TABLE_NAME; do
        [ -n "$TABLE_NAME" ] || continue
        TABLE_ROWS="$(
          psql \
            --host="$POSTGRES_HOST" \
            --port="$POSTGRES_PORT" \
            --username="$POSTGRES_USER" \
            --dbname="$DB_NAME" \
            --tuples-only \
            --no-align \
            --command="SELECT COUNT(*) FROM $TABLE_NAME;" \
            | tr -d '[:space:]'
        )"
        printf '%s|%s\n' "$TABLE_NAME" "$TABLE_ROWS"
      done > "$OUT_FILE"
}

echo "Running restore verification using backup: $BACKUP_FILE"
RESTORE_OVERWRITE=1 "$SCRIPT_DIR/postgres-restore.sh" "$BACKUP_FILE" "$VERIFY_DB"

echo "Collecting source database table/data counts from '$POSTGRES_DB'..."
collect_table_counts "$POSTGRES_DB" "$SOURCE_COUNTS"

echo "Collecting restored database table/data counts from '$VERIFY_DB'..."
collect_table_counts "$VERIFY_DB" "$RESTORE_COUNTS"

SOURCE_TABLE_COUNT="$(wc -l < "$SOURCE_COUNTS" | tr -d ' ')"
RESTORE_TABLE_COUNT="$(wc -l < "$RESTORE_COUNTS" | tr -d ' ')"

if [ "$SOURCE_TABLE_COUNT" -ne "$RESTORE_TABLE_COUNT" ]; then
  echo "ERROR: Table count mismatch (source=$SOURCE_TABLE_COUNT restored=$RESTORE_TABLE_COUNT)."
  exit 1
fi

if ! diff -u "$SOURCE_COUNTS" "$RESTORE_COUNTS" > "$DIFF_FILE"; then
  echo "ERROR: Restored data mismatch detected between source and restored database."
  head -n 40 "$DIFF_FILE"
  exit 1
fi

echo "Restore verification passed: table structure and row counts match."

if [ "$KEEP_RESTORE_TEST_DB" != "1" ]; then
  echo "Cleaning up restore test database '$VERIFY_DB'..."
  dropdb \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    "$VERIFY_DB"
else
  echo "Keeping restore test database '$VERIFY_DB' (KEEP_RESTORE_TEST_DB=1)."
fi
