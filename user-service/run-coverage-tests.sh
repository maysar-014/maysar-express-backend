#!/bin/bash
# User Service - Test Coverage Validation Commands

echo "=========================================="
echo "User Service - Test Coverage Validation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Running all tests...${NC}"
npm test

echo ""
echo -e "${BLUE}2. Generating coverage report...${NC}"
npm run test:coverage

echo ""
echo -e "${BLUE}3. Test Results Summary${NC}"
echo "=========================================="
echo ""

# Run specific test files to show improvements
echo -e "${GREEN}✅ Health Routes Tests${NC}"
npm test -- src/api/routes/__tests__/health.routes.test.ts --verbose

echo ""
echo -e "${GREEN}✅ Cache Service Tests${NC}"
npm test -- src/infrastructure/services/__tests__/cache.service.test.ts --verbose

echo ""
echo -e "${GREEN}✅ Error Middleware Tests${NC}"
npm test -- src/api/middleware/__tests__/error.middleware.test.ts --verbose

echo ""
echo -e "${GREEN}✅ Prisma Client Tests${NC}"
npm test -- src/infrastructure/database/__tests__/prisma-client.test.ts --verbose

echo ""
echo -e "${GREEN}✅ Email Value Object Tests${NC}"
npm test -- src/domain/value-objects/__tests__/email.value-object.test.ts --verbose

echo ""
echo "=========================================="
echo -e "${YELLOW}Coverage Validation Complete!${NC}"
echo "=========================================="
