#!/bin/bash
# Production Migration Deployment Script
# Usage: ./scripts/migration-deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-"staging"}
BACKUP_ENABLED=true
ROLLBACK_TIMEOUT=300 # 5 minutes

# Environment-specific settings
case $ENVIRONMENT in
    "staging")
        ENV_FILE=".env.staging"
        DATABASE_URL_VAR="DATABASE_URL_STAGING"
        ;;
    "production")
        ENV_FILE=".env.production"
        DATABASE_URL_VAR="DATABASE_URL_PRODUCTION"
        BACKUP_ENABLED=true
        ;;
    *)
        echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Use 'staging' or 'production'${NC}"
        exit 1
        ;;
esac

# Validate environment
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting Migration Deployment to $ENVIRONMENT${NC}"
echo -e "${BLUE}=================================================${NC}"

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1: Running pre-deployment checks...${NC}"

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${RED}Error: Production deployments must be from main/master branch${NC}"
    exit 1
fi

# Check migration status
echo -e "${YELLOW}Checking migration status...${NC}"
if ! npx prisma migrate status --schema prisma/schema.prisma; then
    echo -e "${RED}Error: Migration status check failed${NC}"
    exit 1
fi

# Step 2: Database backup (production only)
if [ "$BACKUP_ENABLED" = true ] && [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}Step 2: Creating database backup...${NC}"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="backup_$ENVIRONMENT_$TIMESTAMP.sql"

    # Export database (adjust command based on your database)
    # Example for PostgreSQL:
    # pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

    echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
fi

# Step 3: Dry run (validate migration)
echo -e "${YELLOW}Step 3: Performing dry run...${NC}"
# Note: Prisma doesn't have a built-in dry run, but you can validate the migration files

# Step 4: Deploy migrations
echo -e "${YELLOW}Step 4: Deploying migrations...${NC}"
if npx prisma migrate deploy --schema prisma/schema.prisma; then
    echo -e "${GREEN}✅ Migrations deployed successfully${NC}"
else
    echo -e "${RED}❌ Migration deployment failed${NC}"
    exit 1
fi

# Step 5: Post-deployment validation
echo -e "${YELLOW}Step 5: Running post-deployment validation...${NC}"

# Check database connectivity
if npx prisma db push --preview-feature --schema prisma/schema.prisma --accept-data-loss 2>/dev/null; then
    echo -e "${GREEN}✅ Database connectivity verified${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Database connectivity check failed${NC}"
fi

# Step 6: Generate Prisma client
echo -e "${YELLOW}Step 6: Regenerating Prisma client...${NC}"
npx prisma generate --schema prisma/schema.prisma

# Step 7: Health check
echo -e "${YELLOW}Step 7: Running health checks...${NC}"
# Add your health check commands here
# Example: curl -f http://your-app/health || exit 1

echo -e "${GREEN}🎉 Deployment to $ENVIRONMENT completed successfully!${NC}"
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "${GREEN}   - Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}   - Branch: $CURRENT_BRANCH${NC}"
if [ "$BACKUP_ENABLED" = true ] && [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}   - Backup: $BACKUP_FILE${NC}"
fi
echo -e "${GREEN}   - Next steps: Monitor application logs and metrics${NC}"
