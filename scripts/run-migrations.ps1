# PowerShell script to run database migrations for all services
# Deploy all database migrations to production

param(
    [switch]$Force,
    [switch]$SkipHealthCheck
)

Write-Host "🚀 Running Database Migrations for Maysar E-commerce Platform" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Yellow

# Configuration
$services = @(
    "admin-service",
    "analytics-service",
    "auth-service",
    "catalog-service",
    "commission-service",
    "community-service",
    "inventory-service",
    "logistics-service",
    "notification-service",
    "order-service",
    "payment-service",
    "seller-service",
    "trust-service"
)

# Check if Docker Compose is available and PostgreSQL is running
if (!$SkipHealthCheck) {
    Write-Host "🔍 Checking PostgreSQL connectivity..." -ForegroundColor Cyan

    try {
        $postgresRunning = docker-compose ps 2>$null | Select-String "postgres" -Quiet
        if (!$postgresRunning) {
            Write-Host "❌ PostgreSQL is not running via Docker Compose" -ForegroundColor Red
            Write-Host "💡 Start with: docker-compose up -d postgres" -ForegroundColor Yellow
            if (!$Force) {
                exit 1
            }
        } else {
            Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Could not check Docker Compose status (might not be installed)" -ForegroundColor Yellow
        Write-Host "   Continuing anyway..." -ForegroundColor Yellow
    }

    # Wait for PostgreSQL to be ready
    Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
}

# Track results
$successCount = 0
$failureCount = 0
$failedServices = @()

foreach ($service in $services) {
    Write-Host ""
    Write-Host "📦 Migrating $service..." -ForegroundColor Magenta
    Write-Host ("-" * (15 + $service.Length)) -ForegroundColor Magenta

    $servicePath = "services/$service"

    if (!(Test-Path $servicePath)) {
        Write-Host "❌ Service directory not found: $servicePath" -ForegroundColor Red
        $failureCount++
        $failedServices += $service
        continue
    }

    try {
        Push-Location $servicePath

        # Generate Prisma client
        Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
        $generateResult = npx prisma generate 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
            Write-Host $generateResult -ForegroundColor Red
            $failureCount++
            $failedServices += $service
            Pop-Location
            continue
        }

        # Run migrations
        Write-Host "📝 Running database migrations..." -ForegroundColor Blue
        $migrateResult = npx prisma migrate deploy 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Migration failed for $service" -ForegroundColor Red
            Write-Host $migrateResult -ForegroundColor Red
            $failureCount++
            $failedServices += $service
        } else {
            Write-Host "✅ Successfully migrated $service" -ForegroundColor Green
            $successCount++
        }

    } catch {
        Write-Host "❌ Error processing $service : $($_.Exception.Message)" -ForegroundColor Red
        $failureCount++
        $failedServices += $service
    } finally {
        Pop-Location
    }
}

# Summary
Write-Host ""
Write-Host "📊 Migration Summary" -ForegroundColor Cyan
Write-Host ("=" * 20) -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount services" -ForegroundColor Green
Write-Host "❌ Failed: $failureCount services" -ForegroundColor Red

if ($failureCount -gt 0) {
    Write-Host ""
    Write-Host "❌ Failed Services:" -ForegroundColor Red
    foreach ($failedService in $failedServices) {
        Write-Host "   - $failedService" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check PostgreSQL is running: docker-compose ps" -ForegroundColor Yellow
    Write-Host "   2. Check logs: docker-compose logs postgres" -ForegroundColor Yellow
    Write-Host "   3. Test connection: npx prisma db push --preview-feature" -ForegroundColor Yellow
    Write-Host "   4. Reset if needed: npx prisma migrate reset --force" -ForegroundColor Yellow

    exit 1
} else {
    Write-Host ""
    Write-Host "🎉 All migrations completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Start your services: npm run dev" -ForegroundColor White
    Write-Host "   2. Verify health checks: curl http://localhost:3000/health" -ForegroundColor White
    Write-Host "   3. Check application logs for any issues" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 For more information, see: scripts/README.md" -ForegroundColor Blue
