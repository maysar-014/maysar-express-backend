# Maysar Database Migration Procedures

**Governing Document:** Maysar Engineering Constitution v1.0
- **Article 10.14:** Database migrations shall be controlled, documented and recoverable
- **Article 26:** Release and Recovery — Changes to persistent data shall account for
  the possibility that ordinary code rollback cannot reverse a completed migration

**Version:** 1.0  
**Classification:** Internal — Engineering  
**Last Reviewed:** 2026-10-31

---

## Overview

All database schema changes at Maysar are managed through Prisma migrations. This document
defines the procedures for creating, applying, and rolling back migrations in a controlled,
auditable manner that preserves financial data integrity.

---

## Migration Lifecycle

```
DESIGN → REVIEW → TEST (staging) → DEPLOY (production) → MONITOR → (ROLLBACK if needed)
```

---

## Creating a New Migration

### 1. Design the Schema Change

Edit `prisma/schema.prisma` with the desired changes. For financial models
(`Wallet`, `Escrow`, `Order`, `Payment`, `CommissionPayout`, etc.), extra care
must be taken to preserve data integrity.

### 2. Generate the Migration

```bash
npx prisma migrate dev --name <migration_name>
```

This creates a new migration folder under `prisma/migrations/` with:
- `migration.sql` — The forward DDL statements
- (Optional) Rollback SQL — Must be documented in this procedures file

### 3. Review Requirements

All migrations touching financial tables must be reviewed by:

- [ ] Lead Engineer
- [ ] Security Officer (if financial data is affected)
- [ ] Engineering Governance

### 4. Document Rollback Steps

For each migration, document the exact DDL needed to revert it. Add the rollback
statements to `scripts/db/rollback-migration.ts` in the `revertSchemaChanges()` function.

Example:

```typescript
case '20260101000001_create_wallets':
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "wallets"`);
    break;
```

---

## Applying Migrations to Production

### Preflight Requirement

Per Article 26 and Article 10.14, `prisma migrate deploy` MUST run as a
mandatory preflight step before the application starts. This is enforced in
`docker-compose.yml`:

```yaml
command: >
    sh -c "npx prisma migrate deploy && node dist/main.js"
```

### Deployment Steps

1. **Staging First:** Always apply migrations to staging against production-like data
2. **Verify:** Run the application against the migrated staging database
3. **Production:** Deploy to production with the migration preflight enabled
4. **Monitor:** Watch for errors during the first 15 minutes after deployment

### Rollback Readiness

Before applying any migration to production:

- [ ] Rollback DDL is documented in `scripts/db/rollback-migration.ts`
- [ ] Migration tested against production-like data volume in staging
- [ ] Rollback tested in staging
- [ ] Backup taken before migration
- [ ] Rollback plan communicated to on-call engineer

---

## Rolling Back a Migration

### When to Rollback

Roll back a migration if:

- [ ] The migration causes application errors
- [ ] Data corruption is detected
- [ ] Performance degradation exceeds acceptable thresholds
- [ ] Financial data integrity is compromised

### Rollback Procedure

1. **Stop the application** to prevent new writes
2. **Take a database backup** before rollback
3. **Run the rollback script:**

```bash
npx tsx scripts/db/rollback-migration.ts <migration_name>
```

4. **Verify** the schema is in the expected state
5. **Deploy the previous application version** (code rollback)
6. **Monitor** for errors

### Important Warning

> Per Article 26: "Changes to persistent data shall account for the possibility
> that ordinary code rollback cannot reverse a completed migration."
>
> Code rollback (reverting the application version) does NOT reverse schema
> changes. A database migration rollback must be performed separately.

---

## Migration Safety Rules

| Rule | Description |
|------|-------------|
| No destructive changes without backup | Never drop tables/columns without a full backup first |
| No renaming columns without dual-write | Rename requires add new column → migrate data → drop old column |
| Financial tables are append-only | Never delete from `Wallet`, `Escrow`, `Payment`, `Order` tables |
| Migrations must be idempotent | Re-running `prisma migrate deploy` must be safe |
| All migrations reviewed | No migration applied to production without peer review |

---

## Financial Schema Models

The following models contain financial data and require special migration care:

| Model | Table | Sensitivity |
|-------|-------|-------------|
| `Wallet` | `wallets` | Critical — seller balances |
| `Escrow` | `escrows` | Critical — escrowed funds |
| `Order` | `orders` | Critical — customer orders |
| `Payment` | `payments` | Critical — transaction records |
| `CommissionPayout` | `commission_payouts` | Critical — seller payouts |
| `FinancialAuditLog` | `financial_audit_log` | Critical — audit trail |

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npx prisma migrate dev --name <name>` | Create and apply a migration in development |
| `npx prisma migrate deploy` | Apply pending migrations (production preflight) |
| `npx prisma migrate status` | Check migration status |
| `npx tsx scripts/db/rollback-migration.ts <name>` | Roll back a specific migration |
| `npx prisma generate` | Regenerate Prisma Client after schema changes |

---

## Audit Trail

All migration activities must be logged in the `FinancialAuditLog` table with:

- Actor (who initiated the migration)
- Action (`migration_applied` or `migration_rolled_back`)
- Resource (migration name)
- Before/after state
- Timestamp

---

## Related Documents

- Maysar Engineering Constitution v1.0 — Articles 10.14, 18, 26
- `scripts/db/rollback-migration.ts` — Rollback implementation
- `docker-compose.yml` — Migration preflight configuration
