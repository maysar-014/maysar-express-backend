# Database Migration Strategy & Best Practices

## Overview

This document outlines the robust database migration strategy implemented in the Maysar e-commerce platform, ensuring zero-downtime deployments and safe schema evolution.

## 🎯 Migration Rules

### ✅ **Never Edit Applied Migrations**
- Applied migrations are immutable and represent database history
- If a migration has issues, create a new migration to fix it
- Never modify existing migration files after they've been applied

### ✅ **Environment-Specific Workflows**

#### Local Development: `prisma migrate dev`
```bash
# Generate and apply migration locally
./scripts/migration-dev.sh [migration_name]

# Example:
./scripts/migration-dev.sh add_user_preferences
```

#### Production Deployment: `prisma migrate deploy`
```bash
# Deploy to staging
./scripts/migration-deploy.sh staging

# Deploy to production
./scripts/migration-deploy.sh production
```

### ✅ **Feature Flag + Expand/Contract Pattern**

## 🚀 Expand/Contract Pattern Implementation

### Phase 1: EXPAND
```typescript
// Add new schema elements with defaults
await migrationHelpers.expand(async () => {
  await migrationHelpers.addColumn('users', 'preferences', 'JSONB DEFAULT \'{}\'::jsonb')
  await migrationHelpers.addIndex('users', 'idx_users_preferences', ['preferences'])
})
```

### Phase 2: DEPLOY & ENABLE
```typescript
// Deploy application code
// Enable feature flag
await featureFlags.enableFlag('user_preferences')

// Application code can now use new fields
if (featureFlags.isEnabled('user_preferences')) {
  // Use new preferences field
  user.preferences = { theme: 'dark', notifications: true }
}
```

### Phase 3: CONTRACT (Optional)
```typescript
// Only after feature flag is disabled and data migrated
await migrationHelpers.contract(async () => {
  await migrationHelpers.dropIndex('idx_users_preferences')
  await migrationHelpers.dropColumn('users', 'preferences')
})
```

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma          # Current schema
│   └── migrations/            # Migration files (NEVER EDIT)
├── scripts/
│   ├── migration-dev.sh       # Local development workflow
│   └── migration-deploy.sh    # Production deployment workflow
└── src/migrations/
    └── featureFlags.ts        # Feature flag system & expand/contract helpers
```

## 🔧 Migration Workflow

### 1. Local Development

```bash
# 1. Create migration with safety checks
./scripts/migration-dev.sh add_payment_methods

# 2. Test your changes thoroughly
npm test

# 3. Update application code if needed
# 4. Commit migration files and code changes
git add .
git commit -m "feat: add payment methods with migration"
```

### 2. Staging Deployment

```bash
# 1. Deploy migrations
./scripts/migration-deploy.sh staging

# 2. Deploy application code
# (Your CI/CD pipeline)

# 3. Enable feature flags if using expand/contract
# (Via admin interface or deployment script)

# 4. Monitor and validate
```

### 3. Production Deployment

```bash
# 1. Final validation
./scripts/migration-deploy.sh production

# 2. Deploy application code
# 3. Enable feature flags
# 4. Monitor metrics and alerts
```

## 🛡️ Safety Features

### Migration Validation
- **Destructive Operation Detection**: Warns about DROP, DELETE, TRUNCATE operations
- **Schema Consistency Checks**: Validates migration integrity
- **Data Consistency Validation**: Ensures data integrity post-migration

### Environment Protection
- **Branch Validation**: Production deployments require main/master branch
- **Backup Requirements**: Automatic backups for production deployments
- **Rollback Preparation**: Scripts include rollback procedures

### Feature Flag Controls
- **Gradual Rollout**: Enable features for subsets of users
- **Instant Rollback**: Disable features without code deployment
- **Audit Trail**: Complete history of feature flag changes

## 📝 Migration Examples

### Example 1: Adding User Preferences (Expand/Contract)

```typescript
import { ExpandContractMigration, MigrationHelpers } from '../migrations/featureFlags'

export class AddUserPreferencesMigration extends ExpandContractMigration {
  constructor() {
    super(
      new MigrationHelpers(prisma),
      'user_preferences',
      'Add user preferences with feature flag control',
      '1.0.0',
      ['Add preferences JSONB column to users table']
    )
  }

  protected async expand(): Promise<void> {
    await this.helpers.addColumn('auth_users', 'preferences', 'JSONB DEFAULT \'{}\'::jsonb')
    await this.helpers.addIndex('auth_users', 'idx_users_preferences', ['preferences'])
  }

  protected async contract(): Promise<void> {
    await this.helpers.dropIndex('idx_users_preferences')
    await this.helpers.dropColumn('auth_users', 'preferences')
  }
}

// Usage
const migration = new AddUserPreferencesMigration()
await migration.execute()

// Later, when ready to clean up:
await migration.rollback()
```

### Example 2: Safe Column Operations

```typescript
import { migrationHelpers } from '../migrations/featureFlags'

// Add new column with default
await migrationHelpers.expand(async () => {
  await migrationHelpers.addColumn('orders', 'shipping_method', 'TEXT DEFAULT \'standard\'')
})

// Rename column safely
await migrationHelpers.expand(async () => {
  await migrationHelpers.renameColumn('orders', 'shipping_method', 'delivery_method', 'TEXT')
})

// Drop column only if it exists
await migrationHelpers.contract(async () => {
  await migrationHelpers.dropColumn('orders', 'old_column')
})
```

## 🔍 Monitoring & Observability

### Health Checks
```typescript
// Migration status endpoint
GET /health/migrations
{
  "status": "healthy",
  "migrations": {
    "applied": 15,
    "pending": 0,
    "lastApplied": "20251229000450_init"
  }
}
```

### Feature Flag Status
```typescript
// Feature flag status
GET /admin/feature-flags
{
  "user_preferences": {
    "state": "enabled",
    "enabledAt": "2025-12-29T06:00:00Z",
    "version": "1.0.0"
  }
}
```

### Migration Metrics
- Migration execution time
- Failure rates
- Rollback frequency
- Schema drift detection

## 🚨 Emergency Procedures

### Migration Failure Recovery
```bash
# 1. Check migration status
npx prisma migrate status

# 2. If migration failed, assess impact
npx prisma db push --preview-feature

# 3. Rollback if necessary (for expand/contract migrations)
await migration.rollback()

# 4. Restore from backup if needed
# (Production only)
```

### Feature Flag Emergency Disable
```typescript
// Immediately disable problematic feature
await featureFlags.rollbackFlag('problematic_feature')

// Application automatically falls back to old behavior
```

## 📚 Best Practices

### Migration Design
- **Keep Migrations Small**: One logical change per migration
- **Test Thoroughly**: Validate in staging before production
- **Document Changes**: Include migration descriptions and impacts
- **Plan Rollbacks**: Always design migrations with rollback in mind

### Code Changes
- **Feature Flags**: Use feature flags for behavioral changes
- **Backward Compatibility**: Ensure old code works with new schema
- **Gradual Rollout**: Enable features incrementally
- **Monitoring**: Add metrics for new features

### Operational Excellence
- **Zero-Downtime**: Use expand/contract for seamless deployments
- **Automated Testing**: Include migration tests in CI/CD
- **Documentation**: Keep migration documentation up-to-date
- **Team Communication**: Notify team of schema changes

## 🔗 Related Documentation

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Expand/Contract Pattern](https://www.prisma.io/blog/zero-downtime-migrations)
- [Feature Flags Best Practices](https://martinfowler.com/articles/feature-toggles.html)

---

**Remember**: Database migrations are a critical part of system reliability. Always follow these practices to ensure safe, zero-downtime deployments! 🎯
