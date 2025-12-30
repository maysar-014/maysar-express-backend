# PowerShell script to create migration files for all services
# Run this script to generate migration files for services that don't have them

$services = @(
    "analytics-service",
    "catalog-service",
    "commission-service",
    "community-service",
    "inventory-service",
    "logistics-service",
    "notification-service",
    "seller-service",
    "trust-service"
)

foreach ($service in $services) {
    $migrationPath = "services/$service/prisma/migrations/20251229000500_init"

    if (!(Test-Path $migrationPath)) {
        Write-Host "Creating migration for $service..."

        # Create migration directory
        New-Item -ItemType Directory -Force -Path $migrationPath | Out-Null

        # Create migration.sql file with basic content
        $migrationContent = @"
-- Migration for $service
-- This migration creates all tables for the $service database

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add your table creation statements here
-- This is a placeholder migration file
-- Actual migration content should be generated from Prisma schema

SELECT 'Migration placeholder for $service - replace with actual schema DDL';
"@

        $migrationContent | Out-File -FilePath "$migrationPath/migration.sql" -Encoding UTF8
        Write-Host "✅ Created migration for $service"
    } else {
        Write-Host "⏭️  Migration already exists for $service"
    }
}

Write-Host ""
Write-Host "🎯 Migration files created!"
Write-Host "Next steps:"
Write-Host "1. Start PostgreSQL: docker-compose up -d postgres"
Write-Host "2. Run: .\scripts\run-migrations.sh"
Write-Host "3. Or run individual migrations: npx prisma migrate deploy (in each service directory)"
