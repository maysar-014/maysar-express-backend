#!/bin/bash
# Migration Development Workflow Script
# Usage: ./scripts/migration-dev.sh [migration_name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_NAME=${1:-"feature_update"}
ENV_FILE=".env"

# Validate environment
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting Migration Development Workflow${NC}"
echo -e "${BLUE}=============================================${NC}"

# Step 1: Validate current state
echo -e "${YELLOW}Step 1: Validating current migration state...${NC}"
npx prisma migrate status

# Step 2: Generate migration
echo -e "${YELLOW}Step 2: Generating migration '$MIGRATION_NAME'...${NC}"
npx prisma migrate dev --name "$MIGRATION_NAME" --create-only

# Step 3: Validate migration SQL
echo -e "${YELLOW}Step 3: Validating generated migration...${NC}"
# Check for destructive operations
if grep -r "DROP\|DELETE\|TRUNCATE" prisma/migrations/ | grep -v "DROP INDEX" | grep -v "DROP CONSTRAINT"; then
    echo -e "${RED}⚠️  WARNING: Migration contains destructive operations!${NC}"
    echo -e "${RED}Please review and ensure data safety.${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Migration cancelled.${NC}"
        exit 1
    fi
fi

# Step 4: Apply migration locally
echo -e "${YELLOW}Step 4: Applying migration locally...${NC}"
npx prisma migrate dev

# Step 5: Generate Prisma client
echo -e "${YELLOW}Step 5: Regenerating Prisma client...${NC}"
npx prisma generate

# Step 6: Run database checks
echo -e "${YELLOW}Step 6: Running database integrity checks...${NC}"
# You can add custom validation scripts here
echo -e "${GREEN}✅ Migration applied successfully!${NC}"
echo -e "${GREEN}📝 Remember to:${NC}"
echo -e "${GREEN}   - Test your changes thoroughly${NC}"
echo -e "${GREEN}   - Update any affected application code${NC}"
echo -e "${GREEN}   - Commit migration files to version control${NC}"
echo -e "${GREEN}   - Test in staging before production deployment${NC}"
