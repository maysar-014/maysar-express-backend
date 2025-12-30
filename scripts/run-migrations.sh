#!/bin/bash

# Run Prisma migrations for all services
# This script applies database migrations in the correct order

set -e

echo "🚀 Running Prisma migrations for all services..."

# Check if PostgreSQL is running
if ! docker-compose ps | grep -q "postgres"; then
    echo "❌ PostgreSQL is not running. Please start with: docker-compose up -d postgres"
    exit 1
fi

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

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
    echo "📦 Migrating $service..."

    if [ ! -d "services/$service/prisma" ]; then
        echo "❌ Prisma directory not found for $service"
        continue
    fi

    cd "services/$service"

    # Apply migrations
    echo "🔄 Applying migrations for $service..."
    npx prisma migrate deploy

    # Generate Prisma client
    echo "🔧 Generating Prisma client for $service..."
    npx prisma generate

    cd ../..
done

echo "✅ All migrations completed successfully!"
echo ""
echo "📋 Database setup complete:"
echo "- All 13 service databases migrated"
echo "- Prisma clients generated"
echo "- Ready for application deployment"
