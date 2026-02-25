$replacements = @{
    'prisma\.order_Order' = 'prisma.order'
    'prisma\.order_OrderItem' = 'prisma.orderItem'
    'prisma\.analytics_SellerMetrics' = 'prisma.analytics_SellerMetrics'
    'prisma\.analytics_SellerProductPerformance' = 'prisma.analytics_SellerProductPerformance'
    'prisma\.analytics_SellerDailySales' = 'prisma.analytics_SellerDailySales'
}

Get-ChildItem -Path "services" -Filter "*.ts" -Recurse -Exclude "*node_modules*","*.test.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $modified = $false
    
    foreach ($pattern in $replacements.Keys) {
        $replacement = $replacements[$pattern]
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacement
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($_.FullName)"
    }
}
