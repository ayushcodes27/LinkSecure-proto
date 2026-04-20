# PowerShell script to fix all hardcoded API URLs

$clientSrc = "C:\Users\deore\OneDrive\Desktop\LinkSecure-prototypes\v_10_enhace_UI\client\src"

# Get all TypeScript/TSX files
$files = Get-ChildItem -Path $clientSrc -Recurse -Include *.tsx,*.ts | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*api.ts" 
}

$fixedCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Check if file has API calls
    if ($content -match "http://localhost:5000" -or ($content -match "fetch\(\[" -and $content -notmatch "apiUrl")) {
        
        Write-Host "Fixing: $($file.Name)"
        
        # Add import if not present
        if ($content -notmatch "import.*apiUrl.*from") {
            # Find the last import statement  
            if ($content -match "(?s)(import[^;]+;)") {
                $lastImport = $Matches[0]
                $content = $content -replace "($lastImport)", "`$1`nimport { apiUrl } from '@/lib/api';"
            }
        }
        
        # Replace http://localhost:5000/api/... with apiUrl('/api/...')
        $content = $content -replace "http://localhost:5000(/api/[^'""]+)", "apiUrl('`$1')"
        
        # Replace '/api/... with apiUrl('/api/...
        $content = $content -replace "fetch\((['""])(/api/[^'""]+)(['""])", "fetch(apiUrl('`$2')"
        
        # Save if changed
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $fixedCount++
            Write-Host "  Fixed" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Total files fixed: $fixedCount" -ForegroundColor Cyan
Write-Host "Now commit and push the changes"
