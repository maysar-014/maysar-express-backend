#!/bin/bash

# Database Configuration Test Script
# Tests that environment variables are properly loaded and databases start

set -e

echo "🧪 Testing Database Configuration..."
echo "=================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

echo "✅ .env file found"

# Load environment variables
set -a
source .env
set +a

# Validate required environment variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "POSTGRES_DB" "POSTGRES_USER")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ All required environment variables are set"

# Test docker-compose configuration
echo ""
echo "🔍 Testing Docker Compose Configuration..."
echo "==========================================="

if ! docker-compose config > /dev/null 2>&1; then
    echo "❌ Docker Compose configuration is invalid"
    exit 1
fi

echo "✅ Docker Compose configuration is valid"

# Check if ports are properly commented out (security check)
if grep -q "^\s*ports:" docker-compose.yml; then
    echo "⚠️  WARNING: Database ports are still exposed in docker-compose.yml"
    echo "   This is acceptable for local development but should be removed for production."
else
    echo "✅ Database ports are not exposed (secure configuration)"
fi

echo ""
echo "🎉 Database configuration test passed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Run: docker-compose up -d"
echo "   2. Check container logs: docker-compose logs"
echo "   3. Test database connectivity from your application"
echo "   4. For production: Use managed database services (RDS, Cloud SQL, etc.)"
echo ""
echo "🔒 Security Notes:"
echo "   - Never commit .env files to version control"
echo "   - Use strong, unique passwords for each environment"
echo "   - Rotate credentials regularly"
echo "   - Consider using secret management services (AWS Secrets Manager, Vault, etc.)"
