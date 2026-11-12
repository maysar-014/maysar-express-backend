-- ============================================================================
-- Maysar Least-Privilege Database Roles
-- ============================================================================
-- This script creates database roles with minimal required permissions,
-- following the principle of least privilege as defined in the
-- Maysar Infrastructure Constitution (Section 8.2 Access Control).
--
-- Roles created:
--   maysar_app    - Application service (DML only, no DDL)
--   maysar_backup - Backup service (read-only, pg_dump access)
--   maysar_monitor - Monitoring role (health checks only)
--
-- Usage: Run as a superuser (e.g., postgres) against the maysar database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create roles (if they don't exist)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maysar_app') THEN
    CREATE ROLE maysar_app LOGIN PASSWORD 'change-me';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maysar_backup') THEN
    CREATE ROLE maysar_backup LOGIN PASSWORD 'change-me';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maysar_monitor') THEN
    CREATE ROLE maysar_monitor LOGIN PASSWORD 'change-me';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. Grant database-level access
-- ----------------------------------------------------------------------------
GRANT CONNECT ON DATABASE maysar TO maysar_app;
GRANT CONNECT ON DATABASE maysar TO maysar_backup;
GRANT CONNECT ON DATABASE maysar TO maysar_monitor;

-- ----------------------------------------------------------------------------
-- 3. Schema-level access (public schema only)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO maysar_app;
GRANT USAGE ON SCHEMA public TO maysar_backup;
GRANT USAGE ON SCHEMA public TO maysar_monitor;

-- ----------------------------------------------------------------------------
-- 4. Table-level permissions
-- ----------------------------------------------------------------------------

-- maysar_app: DML on all existing tables in public schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maysar_app;

-- maysar_backup: Read-only on all tables (pg_dump requires SELECT)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO maysar_backup;

-- maysar_monitor: Read-only on monitoring-relevant tables/views only
GRANT SELECT ON pg_stat_activity TO maysar_monitor;
GRANT SELECT ON pg_database TO maysar_monitor;

-- ----------------------------------------------------------------------------
-- 5. Sequence permissions (for auto-increment/serial columns)
-- ----------------------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO maysar_app;

-- ----------------------------------------------------------------------------
-- 6. Future tables: default privileges (new tables created after this script)
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maysar_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO maysar_backup;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO maysar_app;

-- ----------------------------------------------------------------------------
-- 7. Explicitly DENY dangerous permissions
-- ----------------------------------------------------------------------------
-- No DDL (CREATE, ALTER, DROP) on schema or tables
REVOKE CREATE ON SCHEMA public FROM maysar_app;
REVOKE CREATE ON SCHEMA public FROM maysar_backup;
REVOKE CREATE ON SCHEMA public FROM maysar_monitor;

-- No superuser, no replication, no bypassrls
-- (roles are created without these by default, but being explicit)

-- ----------------------------------------------------------------------------
-- 8. Notes for deployment
-- ----------------------------------------------------------------------------
--   * Replace 'change-me' passwords with strong values from your secrets manager.
--   * Update .env.example / .env to use maysar_app for DATABASE_URL.
--   * Use maysar_backup for backup scripts (PGUSER/PGPASSWORD).
--   * Use maysar_monitor for Prometheus health checks.
--   * Run this script after every migration that creates new tables/schemas
--     to ensure default privileges are applied (ALTER DEFAULT PRIVILEGES
--     only affects tables created after the command runs).
-- ============================================================================
