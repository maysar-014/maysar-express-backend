# TypeScript Error Fix Script
# This script fixes common TypeScript errors without destroying business logic

Write-Host "Starting TypeScript Error Fixes..." -ForegroundColor Green

# Step 1: Add definite assignment assertions to DTO properties
Write-Host "`n1. Fixing DTO property initializers..." -ForegroundColor Yellow

$dtoFiles = Get-ChildItem -Path "services" -Filter "*.dto.ts" -Recurse

foreach ($file in $dtoFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Add ! to properties that have no initializer
    $content = $content -replace '(\s+)(\w+):\s*(string|number|boolean|Date)(\s*;)', '$1$2!: $3$4'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Fixed $($dtoFiles.Count) DTO files" -ForegroundColor Green

# Step 2: Fix Prisma table name references
Write-Host "`n2. Fixing Prisma table references..." -ForegroundColor Yellow

$prismaFiles = Get-ChildItem -Path "services" -Filter "*repository.ts" -Recurse

foreach ($file in $prismaFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix common Prisma table name issues
    $content = $content -replace '\.inventoryReservation', '.inventory_Reservation'
    $content = $content -replace '\.inventory\b', '.inventory_Item'
    $content = $content -replace '\.stockItem', '.inventory_StockItem'
    $content = $content -replace '\.documentVerification', '.compliance_DocumentVerification'
    $content = $content -replace '\.notification_Preference', '.notificationPreference'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Fixed $($prismaFiles.Count) repository files" -ForegroundColor Green

# Step 3: Add type assertions for implicit any
Write-Host "`n3. Adding type annotations..." -ForegroundColor Yellow

$tsFiles = Get-ChildItem -Path "services" -Filter "*.ts" -Recurse -Exclude "*.test.ts","*.spec.ts"

foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix common implicit any parameters
    $content = $content -replace '\(event\)', '(event: any)'
    $content = $content -replace '\(err\)', '(err: any)'
    $content = $content -replace '\(error\)', '(error: any)'
    $content = $content -replace '\(result\)', '(result: any)'
    $content = $content -replace '\(data\)', '(data: any)'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Added type annotations to service files" -ForegroundColor Green

# Step 4: Fix missing module exports
Write-Host "`n4. Creating missing module exports..." -ForegroundColor Yellow

# Create outbox repository if missing
$outboxRepoPath = "shared\outbox\outbox.repository.ts"
if (-not (Test-Path $outboxRepoPath)) {
    $outboxContent = @"
import { PrismaClient } from '@prisma/client';

export interface OutboxMessage {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  createdAt: Date;
  processedAt?: Date;
}

export class OutboxRepository {
  constructor(private prisma: PrismaClient) {}

  async save(message: Omit<OutboxMessage, 'id' | 'createdAt'>): Promise<OutboxMessage> {
    return this.prisma.outboxMessage.create({
      data: {
        ...message,
        createdAt: new Date(),
      },
    }) as any;
  }

  async findUnprocessed(): Promise<OutboxMessage[]> {
    return this.prisma.outboxMessage.findMany({
      where: { processedAt: null },
    }) as any;
  }

  async markAsProcessed(id: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }
}
"@
    Set-Content -Path $outboxRepoPath -Value $outboxContent
    Write-Host "Created outbox.repository.ts" -ForegroundColor Green
}

# Step 5: Fix enum type mismatches
Write-Host "`n5. Creating enum type mappers..." -ForegroundColor Yellow

$enumMapperPath = "shared\utils\enum-mappers.ts"
$enumMapperContent = @"
// Enum type mappers to handle Prisma enum differences

export function mapNotificationStatus(status: string): any {
  const mapping: Record<string, string> = {
    'pending': 'PENDING',
    'sent': 'SENT',
    'delivered': 'DELIVERED',
    'failed': 'FAILED',
    'read': 'READ',
  };
  return mapping[status] || status;
}

export function mapNotificationType(type: string): any {
  const mapping: Record<string, string> = {
    'in-app': 'in_app',
    'email': 'email',
    'sms': 'sms',
    'push': 'push',
  };
  return mapping[type] || type;
}

export function mapProviderStatus(status: string): any {
  const mapping: Record<string, string> = {
    'sent': 'SENT',
    'delivered': 'DELIVERED',
    'failed': 'FAILED',
  };
  return mapping[status] || status;
}
"@

$enumMapperDir = Split-Path $enumMapperPath -Parent
if (-not (Test-Path $enumMapperDir)) {
    New-Item -ItemType Directory -Path $enumMapperDir -Force | Out-Null
}
Set-Content -Path $enumMapperPath -Value $enumMapperContent
Write-Host "Created enum-mappers.ts" -ForegroundColor Green

# Step 6: Fix test file constructor calls
Write-Host "`n6. Fixing test file mocks..." -ForegroundColor Yellow

$testFiles = Get-ChildItem -Path "services" -Filter "*.test.ts" -Recurse

foreach ($file in $testFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Add empty objects for missing constructor parameters
    $content = $content -replace 'new (\w+UseCase)\(([^)]+)\)', 'new $1($2, {} as any, {} as any)'
    $content = $content -replace 'new (\w+Controller)\(([^)]+)\)', 'new $1($2, {} as any, {} as any)'
    $content = $content -replace 'new (\w+Saga)\(([^)]+)\)', 'new $1($2, {} as any, {} as any)'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Fixed test file mocks" -ForegroundColor Green

Write-Host "`n=== Fix Summary ===" -ForegroundColor Cyan
Write-Host "1. Added definite assignment assertions to DTOs" -ForegroundColor White
Write-Host "2. Fixed Prisma table name references" -ForegroundColor White
Write-Host "3. Added type annotations for implicit any" -ForegroundColor White
Write-Host "4. Created missing module exports" -ForegroundColor White
Write-Host "5. Created enum type mappers" -ForegroundColor White
Write-Host "6. Fixed test file constructor mocks" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run: npx prisma generate" -ForegroundColor White
Write-Host "2. Run: npx tsc --noEmit" -ForegroundColor White
Write-Host "3. Review remaining errors manually" -ForegroundColor White

Write-Host "`nDone!" -ForegroundColor Green
