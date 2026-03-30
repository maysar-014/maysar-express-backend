# Database Migration Scripts - Maysar E-commerce Platform

> Legacy note: this directory contains migration helpers from the older split-service setup. The current monolith uses the root `prisma` commands and shared schema migrations first; treat the per-service mapping below as historical context.

This directory contains automated scripts for managing database migrations across the older service split.

## 🚀 Quick Start

### Prerequisites
- PostgreSQL running (via Docker Compose or local installation)
- Node.js and npm installed
- Database credentials configured in `.env` file

### 1. Start PostgreSQL
```bash
# Using Docker Compose (recommended)
docker-compose up -d postgres

# Or using local PostgreSQL
# Make sure PostgreSQL is running on localhost:5432
```

### 2. Run All Migrations
```bash
# Linux/Mac
./scripts/run-migrations.sh

# Windows PowerShell
.\scripts\run-migrations.ps1
```

### 3. Verify Success
```bash
# Check if all services are healthy
docker-compose ps
# Should show postgres container running
```

## 📋 Available Scripts

### `run-migrations.sh` (Linux/Mac/Bash)
**Purpose**: Deploy all database migrations to production
**Usage**:
```bash
./scripts/run-migrations.sh
```

**What it does**:
1. Checks PostgreSQL connectivity
2. Runs migrations for all 13 services in sequence
3. Generates Prisma clients for type safety
4. Validates migration success

### `generate-migrations.sh` (Linux/Mac/Bash)
**Purpose**: Generate new migrations when schemas change
**Usage**:
```bash
./scripts/generate-migrations.sh
```

**What it does**:
1. Generates Prisma clients for all services
2. Attempts to create new migrations (requires DB connection)
3. Provides fallback for offline migration creation

### `create-all-migrations.ps1` (Windows PowerShell)
**Purpose**: Create migration file structure for services without migrations
**Usage**:
```bash
powershell -ExecutionPolicy Bypass -File scripts/create-all-migrations.ps1
```

**What it does**:
1. Creates migration directories for all services
2. Generates placeholder migration files
3. Prepares structure for actual schema migrations

## 🗄️ Service Database Mapping

| Service | Database | Schema File |
|---------|----------|-------------|
| Auth Service | `maysar_auth` | `services/auth-service/prisma/schema.prisma` |
| Order Service | `maysar_order` | `services/order-service/prisma/schema.prisma` |
| Payment Service | `maysar_payment` | `services/payment-service/prisma/schema.prisma` |
| Admin Service | `maysar_admin` | `services/admin-service/prisma/schema.prisma` |
| Inventory Service | `maysar_inventory` | `services/inventory-service/prisma/schema.prisma` |
| Seller Service | `maysar_seller` | `services/seller-service/prisma/schema.prisma` |
| Catalog Service | `maysar_catalog` | `services/catalog-service/prisma/schema.prisma` |
| Logistics Service | `maysar_logistics` | `services/logistics-service/prisma/schema.prisma` |
| Commission Service | `maysar_commission` | `services/commission-service/prisma/schema.prisma` |
| Trust Service | `maysar_trust` | `services/trust-service/prisma/schema.prisma` |
| Notification Service | `maysar_notification` | `services/notification-service/prisma/schema.prisma` |
| Community Service | `maysar_community` | `services/community-service/prisma/schema.prisma` |
| Analytics Service | `maysar_analytics` | `services/analytics-service/prisma/schema.prisma` |

## 🔧 Manual Migration Commands

If you need to run migrations for individual services:

```bash
# Change to service directory
cd services/auth-service

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Create new migration (requires DB connection)
npx prisma migrate dev --name your_migration_name
```

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Database Configuration
DATABASE_URL="postgresql://maysar_user:maysar_password@localhost:5432/maysar_dev"

# Service-specific databases (configured in docker-compose.yml)
AUTH_DATABASE_URL="postgresql://maysar_user:maysar_password@localhost:5432/maysar_auth"
ORDER_DATABASE_URL="postgresql://maysar_user:maysar_password@localhost:5432/maysar_order"
# ... etc for all services
```

### Docker Compose Setup
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: maysar_user
      POSTGRES_PASSWORD: maysar_password
      POSTGRES_DB: maysar_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Permission Denied
```bash
# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# Or run directly with bash
bash scripts/run-migrations.sh
```

#### 2. Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Test connection
psql -h localhost -p 5432 -U maysar_user -d maysar_dev
```

#### 3. Migration Lock Issues
```bash
# Reset migration lock (if stuck)
cd services/your-service
npx prisma migrate reset --force
```

#### 4. PowerShell Execution Policy (Windows)
```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass
powershell -ExecutionPolicy Bypass -File scripts/create-all-migrations.ps1
```

### Migration Status Check

```bash
# Check migration status for a service
cd services/auth-service
npx prisma migrate status

# List applied migrations
npx prisma migrate resolve --applied
```

## 📊 Migration Workflow

### Development Workflow
1. **Modify Schema**: Update `services/your-service/prisma/schema.prisma`
2. **Generate Migration**: `npx prisma migrate dev --name descriptive_name`
3. **Test Locally**: Run migrations and test application
4. **Commit Changes**: Include schema and migration files

### Production Deployment
1. **Database Backup**: Always backup before migrations
2. **Run Migrations**: Use `scripts/run-migrations.sh`
3. **Verify Success**: Check application health and data integrity
4. **Rollback Plan**: Have rollback procedures ready

## 🚨 Emergency Rollback

If migrations fail and you need to rollback:

```bash
# For individual service
cd services/your-service
npx prisma migrate reset --force

# Or manually rollback specific migration
npx prisma migrate resolve --rolled-back migration_name
```

## 📈 Performance Considerations

- **Large Datasets**: Migrations include indexes for optimal performance
- **Zero Downtime**: Migration patterns designed for production use
- **Concurrent Access**: Migration locks prevent conflicts
- **Monitoring**: Scripts include health checks and progress reporting

## 🔐 Security Notes

- **Credentials**: Never commit database credentials to version control
- **Access Control**: Use least privilege for migration users
- **Audit Trail**: All migrations are version controlled and auditable
- **Encryption**: Database connections use TLS in production

## 📞 Support

For migration issues:
1. Check PostgreSQL logs: `docker-compose logs postgres`
2. Verify connection: `npx prisma db push --preview-feature`
3. Reset if needed: `npx prisma migrate reset --force`
4. Consult documentation: `npx prisma --help`

## ✅ Success Indicators

After successful migration:
- ✅ All 13 services show "Database schema is up to date"
- ✅ Prisma clients generated without errors
- ✅ Application starts successfully
- ✅ No database connection errors in logs
- ✅ Data integrity maintained across all services
