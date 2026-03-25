# Portable PostgreSQL Setup (Docker, Backup, Restore)

This setup is designed to be cloud-provider neutral and migration-safe across AWS, Azure, GCP, OCI, or bare-metal Linux servers.

## 1) Files Delivered

- `docker-compose.postgres-portable.yml`
- `.env.postgres.example`
- `scripts/backup/postgres-backup.sh`
- `scripts/backup/postgres-restore.sh`
- `scripts/backup/postgres-restore-verify.sh`

## 2) Persistent Folder Locations

Use host-mounted directories so data survives container restart, image rebuild, and server reboot.

- PostgreSQL data directory (host): `/data/postgres`
- PostgreSQL backup directory (host): `/backups/postgres`

These are configurable through:

- `POSTGRES_DATA_DIR`
- `POSTGRES_BACKUP_DIR`

## 3) Initial Setup

1. Create the host directories on the server:

```bash
sudo mkdir -p /data/postgres /backups/postgres
sudo chown -R 999:999 /data/postgres /backups/postgres
sudo chmod 700 /data/postgres
sudo chmod 750 /backups/postgres
```

2. Create an environment file from template:

```bash
cp .env.postgres.example .env.postgres
```

3. Set a strong `POSTGRES_PASSWORD` in `.env.postgres`.

4. Start PostgreSQL + automated backups:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml up -d
```

## 4) Automated Daily Backups

- Backups run automatically based on `POSTGRES_BACKUP_CRON` (default: `0 2 * * *`, daily at 02:00).
- Backup format: SQL dump compressed as `.sql.gz`.
- File naming includes UTC timestamp and does not overwrite previous backups.
- Retention is controlled by `POSTGRES_BACKUP_RETENTION_DAYS`.

Manual backup trigger:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec postgres-backup /bin/sh /usr/local/bin/postgres-backup.sh
```

## 5) Restore Instructions

Restore from latest backup to a target database:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e RESTORE_OVERWRITE=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore.sh "" restored_maysar
```

Restore from a specific backup file:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e RESTORE_OVERWRITE=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore.sh /backups/postgres/<backup-file>.sql.gz restored_maysar
```

## 6) Restore Test (Required Validation)

This creates a test DB, restores backup, and verifies table/data parity against the source DB:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore-verify.sh
```

If successful, output includes:
- `Restore verification passed: table structure and row counts match.`

Optional: keep the temporary restore-test DB for manual inspection:

```bash
docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml exec \
  -e KEEP_RESTORE_TEST_DB=1 \
  postgres-backup \
  /bin/sh /usr/local/bin/postgres-restore-verify.sh
```

## 7) Redeploy on a New Server (Cloud Migration)

1. Provision a Linux VM/server and install Docker + Docker Compose.
2. Create persistent paths `/data/postgres` and `/backups/postgres`.
3. Copy project files, including backup archive files (`/backups/postgres/*.sql.gz`) if migrating existing data.
4. Copy `.env.postgres` and start services:
   - `docker compose --env-file .env.postgres -f docker-compose.postgres-portable.yml up -d`
5. Restore latest backup to the target DB using `postgres-restore.sh`.
6. Run `postgres-restore-verify.sh` and confirm success.
7. Point application `DATABASE_URL` to the new PostgreSQL host.

No cloud-specific database tooling is required; backups are standard PostgreSQL SQL dumps.
