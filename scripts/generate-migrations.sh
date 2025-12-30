#!/bin/bash

# Generate Prisma migrations for all services
# This script generates migration files for all service databases

set -e

echo "🚀 Generating Prisma migrations for all services..."

SERVICES=(
    "admin-service"
    "analytics-service"
    "auth-service"
    "catalog-service"
    "commission-service"
    "community-service"
    "inventory-service"
    "logistics-service"
    "notification-service"
    "order-service"
    "payment-service"
    "seller-service"
    "trust-service"
)

for service in "${SERVICES[@]}"; do
    echo "📦 Processing $service..."

    if [ ! -d "services/$service/prisma" ]; then
        echo "❌ Prisma directory not found for $service"
        continue
    fi

    cd "services/$service"

    # Generate Prisma client
    echo "🔧 Generating Prisma client for $service..."
    npx prisma generate

    # Create migration (this will fail if DB is not running, but that's OK)
    echo "📝 Creating migration for $service..."
    npx prisma migrate dev --name init --create-only 2>/dev/null || echo "⚠️  Migration creation skipped (database not available)"

    cd ../..
done

echo "✅ Migration generation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start PostgreSQL database with Docker Compose"
echo "2. Run migrations: ./scripts/run-migrations.sh"
echo "3. Verify database schemas"
