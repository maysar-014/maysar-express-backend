# Targeted TypeScript Fixes
# Fixes only critical blocking issues without breaking tests

Write-Host "Applying targeted TypeScript fixes..." -ForegroundColor Green

# Fix 1: Add missing saga-base export in user-service
Write-Host "`n1. Fixing saga exports..." -ForegroundColor Yellow

$sagaIndexPath = "services\user-service\src\application\sagas\index.ts"
if (Test-Path $sagaIndexPath) {
    $content = Get-Content $sagaIndexPath -Raw
    # Remove invalid imports
    $content = $content -replace "export \{ SagaStep, SagaCompensationRecord \} from './saga-base';", ""
    Set-Content -Path $sagaIndexPath -Value $content -NoNewline
    Write-Host "Fixed saga index exports" -ForegroundColor Green
}

# Fix 2: Fix missing module declarations
Write-Host "`n2. Creating missing type declarations..." -ForegroundColor Yellow

# Create types for missing modules
$typesContent = @"
// Type declarations for missing modules
declare module 'express-validator' {
  export function body(...args: any[]): any;
  export function param(...args: any[]): any;
  export function query(...args: any[]): any;
  export function validationResult(req: any): any;
}

declare module 'express-winston' {
  export function logger(options: any): any;
  export function errorLogger(options: any): any;
}

declare module 'prom-client' {
  export class Counter {
    constructor(config: any);
    inc(value?: number): void;
  }
  export class Histogram {
    constructor(config: any);
    observe(value: number): void;
  }
  export class Gauge {
    constructor(config: any);
    set(value: number): void;
  }
  export function register(): any;
}
"@

$typesDir = "src\types"
if (-not (Test-Path $typesDir)) {
    New-Item -ItemType Directory -Path $typesDir -Force | Out-Null
}
Set-Content -Path "$typesDir\external-modules.d.ts" -Value $typesContent
Write-Host "Created external module declarations" -ForegroundColor Green

# Fix 3: Fix User entity userId property
Write-Host "`n3. Fixing User entity..." -ForegroundColor Yellow

$userMapperPath = "services\user-service\src\application\mappers\user-mapper.ts"
if (Test-Path $userMapperPath) {
    $content = Get-Content $userMapperPath -Raw
    # Replace userId with id
    $content = $content -replace '\.userId', '.id'
    Set-Content -Path $userMapperPath -Value $content -NoNewline
    Write-Host "Fixed user mapper" -ForegroundColor Green
}

# Fix 4: Fix undefined variable names
Write-Host "`n4. Fixing variable names..." -ForegroundColor Yellow

$getUserPath = "services\user-service\src\application\use-cases\get-user.use-case.ts"
if (Test-Path $getUserPath) {
    $content = Get-Content $getUserPath -Raw
    $content = $content -replace 'targetuser', 'targetUser'
    Set-Content -Path $getUserPath -Value $content -NoNewline
}

$userPoliciesPath = "services\user-service\src\domain\policies\user-policies.ts"
if (Test-Path $userPoliciesPath) {
    $content = Get-Content $userPoliciesPath -Raw
    $content = $content -replace 'currentuser', 'currentUser'
    $content = $content -replace 'targetuser', 'targetUser'
    Set-Content -Path $userPoliciesPath -Value $content -NoNewline
}

Write-Host "Fixed variable names" -ForegroundColor Green

# Fix 5: Fix package keyword in delivery entity
Write-Host "`n5. Fixing reserved keywords..." -ForegroundColor Yellow

$deliveryEntityPath = "services\logistics-service\src\domain\entities\delivery.entity.ts"
if (Test-Path $deliveryEntityPath) {
    $content = Get-Content $deliveryEntityPath -Raw
    $content = $content -replace '\bpackage\b', 'packageInfo'
    Set-Content -Path $deliveryEntityPath -Value $content -NoNewline
    Write-Host "Fixed delivery entity" -ForegroundColor Green
}

# Fix 6: Fix missing PayoutSchedule and PayoutEligibility types
Write-Host "`n6. Adding missing types..." -ForegroundColor Yellow

$payoutPolicyPath = "services\payout-service\src\domain\policies\payout.policy.ts"
if (Test-Path $payoutPolicyPath) {
    $content = Get-Content $payoutPolicyPath -Raw
    
    # Add type definitions at the top
    $typeDefinitions = @"
// Type definitions
export type PayoutSchedule = 'daily' | 'weekly' | 'monthly';
export interface PayoutEligibility {
  isEligible: boolean;
  reason?: string;
}

"@
    
    if ($content -notmatch "export type PayoutSchedule") {
        $content = $typeDefinitions + $content
        Set-Content -Path $payoutPolicyPath -Value $content -NoNewline
        Write-Host "Added payout types" -ForegroundColor Green
    }
}

# Fix 7: Fix missing error middleware exports
Write-Host "`n7. Fixing error middleware exports..." -ForegroundColor Yellow

$errorMiddlewarePath = "services\user-service\src\api\middleware\error.middleware.ts"
if (Test-Path $errorMiddlewarePath) {
    $content = Get-Content $errorMiddlewarePath -Raw
    
    # Ensure exports exist
    if ($content -notmatch "export.*errorHandler") {
        $content += @"

export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error'
  });
};

export const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createError = (statusCode: number, message: string) => {
  const error: any = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const notFoundHandler = (req: any, res: any) => {
  res.status(404).json({ error: 'Not Found' });
};
"@
        Set-Content -Path $errorMiddlewarePath -Value $content -NoNewline
        Write-Host "Added error middleware exports" -ForegroundColor Green
    }
}

# Fix 8: Fix missing createServer export in sms-service
Write-Host "`n8. Fixing app exports..." -ForegroundColor Yellow

$smsAppPath = "services\sms-service\src\app.ts"
if (Test-Path $smsAppPath) {
    $content = Get-Content $smsAppPath -Raw
    
    if ($content -notmatch "export.*createServer") {
        $content += @"

export function createServer() {
  return app;
}
"@
        Set-Content -Path $smsAppPath -Value $content -NoNewline
        Write-Host "Added createServer export" -ForegroundColor Green
    }
}

# Fix 9: Remove duplicate variable declarations
Write-Host "`n9. Fixing duplicate declarations..." -ForegroundColor Yellow

$simpleTestPath = "services\logistics-service\src\simple-test.ts"
if (Test-Path $simpleTestPath) {
    $content = Get-Content $simpleTestPath -Raw
    # Remove duplicate results declaration
    $lines = $content -split "`r?`n"
    $seenResults = $false
    $fixedLines = $lines | Where-Object {
        if ($_ -match "^\s*const results\s*=") {
            if ($seenResults) {
                return $false
            }
            $seenResults = $true
        }
        return $true
    }
    Set-Content -Path $simpleTestPath -Value ($fixedLines -join "`r`n") -NoNewline
    Write-Host "Fixed duplicate declarations" -ForegroundColor Green
}

# Fix 10: Fix .ts extension imports
Write-Host "`n10. Fixing .ts extension imports..." -ForegroundColor Yellow

$productionEnginePath = "services\production-service\src\domain\engines\ProductionPlanningEngine.ts"
if (Test-Path $productionEnginePath) {
    $content = Get-Content $productionEnginePath -Raw
    $content = $content -replace "from '([^']+)\.ts'", "from '$1'"
    Set-Content -Path $productionEnginePath -Value $content -NoNewline
    Write-Host "Fixed .ts extension imports" -ForegroundColor Green
}

Write-Host "`n=== Targeted Fixes Complete ===" -ForegroundColor Cyan
Write-Host "Applied surgical fixes to critical issues" -ForegroundColor White
Write-Host "`nRun 'npx tsc --noEmit' to check remaining errors" -ForegroundColor Yellow
