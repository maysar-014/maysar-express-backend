Write-Host "Fixing test constructor signatures..." -ForegroundColor Green

# Fix approve-enabler test
$file = "services\enabler-service\src\application\use-cases\__tests__\approve-enabler.use-case.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new ApproveEnablerUseCase\(mockRepository\)', 'new ApproveEnablerUseCase(mockRepository, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix enabler controller test
$file = "services\enabler-service\src\api\controllers\__tests__\enabler.controller.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new EnablerController\(([^,)]+), ([^)]+)\)', 'new EnablerController($1, $2, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix enabler onboarding saga test
$file = "services\enabler-service\src\application\sagas\__tests__\enabler-onboarding.saga.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new EnablerOnboardingSaga\(([^,)]+), ([^)]+)\)', 'new EnablerOnboardingSaga($1, $2, {} as any, {} as any, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix notification controller tests
$file = "services\notification-service\src\api\controllers\__tests__\notification.controller.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new NotificationController\(([^,)]+), ([^)]+)\)', 'new NotificationController($1, $2, {} as any, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix payout controller test
$file = "services\payout-service\src\api\controllers\__tests__\payout.controller.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new PayoutController\(([^,)]+), ([^,)]+), ([^)]+)\)', 'new PayoutController($1, $2, $3, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix production controller test
$file = "services\production-service\src\api\controllers\__tests__\ProductionController.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new ProductionController\(([^,)]+), ([^)]+)\)', 'new ProductionController($1, $2, {} as any, {} as any, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix support controller tests
$file = "services\support-service\src\api\controllers\__tests__\agent.controller.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new AgentController\(([^)]+)\)', 'new AgentController($1, {} as any)'
    Set-Content $file $content -NoNewline
}

$file = "services\support-service\src\api\controllers\__tests__\ticket.controller.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new TicketController\(([^,)]+), ([^)]+)\)', 'new TicketController($1, $2, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any)'
    Set-Content $file $content -NoNewline
}

# Fix training controller test
$file = "services\training-service\src\api\controllers\__tests__\course.controller.test.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new CourseController\(([^,)]+), ([^)]+)\)', 'new CourseController($1, $2)'
    Set-Content $file $content -NoNewline
}

# Fix user controller tests
$files = Get-ChildItem "services\user-service\src\api\controllers\__tests__" -Filter "*.test.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace 'new UserController\(([^)]+)\)', 'new UserController($1, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any)'
    Set-Content $file.FullName $content -NoNewline
}

# Fix user use-case tests
$files = Get-ChildItem "services\user-service\src\application\use-cases\__tests__" -Filter "*.test.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace 'new (\w+UseCase)\(([^)]+)\)(?!\s*,)', 'new $1($2, {} as any, {} as any)'
    Set-Content $file.FullName $content -NoNewline
}

# Fix order service index
$file = "services\order-service\index.ts"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'new (\w+)\(([^,)]+), ([^,)]+)\)(?!\s*,)', 'new $1($2, $3, {} as any, {} as any, {} as any)'
    Set-Content $file $content -NoNewline
}

Write-Host "Test constructor fixes complete!" -ForegroundColor Green
