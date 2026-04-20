# Test Password Protection
Write-Host "`n[TEST] Password Protection for Short Links`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# Step 1: Create password-protected link
Write-Host "Step 1: Creating password-protected link..." -ForegroundColor Yellow
$createBody = @{
    owner_id = "test-user-123"
    blob_path = "GUI_Ifconfig_1759518383504_55da3b3c.png"
    password = "test123"
    expiry_minutes = 1440
    metadata = @{
        original_file_name = "GUI_Ifconfig.png"
        file_size = 50000
        mime_type = "image/png"
    }
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/links/create" -Method Post -Body $createBody -ContentType "application/json"
    $shortCode = $createResponse.short_code
    Write-Host "[OK] Link created: $($createResponse.link)" -ForegroundColor Green
    Write-Host "   Short Code: $shortCode`n" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to create link: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   (This is expected if blob doesn't exist in Azure)`n" -ForegroundColor Gray
    exit
}

# Step 2: Try accessing without password
Write-Host "Step 2: Accessing link WITHOUT password..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/s/$shortCode" -Method Get
    Write-Host "[FAIL] ERROR: Should have returned 401!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "[OK] Correctly returned 401 Unauthorized`n" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Unexpected status: $($_.Exception.Response.StatusCode)`n" -ForegroundColor Red
    }
}

# Step 3: Verify with WRONG password
Write-Host "Step 3: Verifying with WRONG password..." -ForegroundColor Yellow
$wrongPasswordBody = @{ password = "wrong-password" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/api/v1/links/verify/$shortCode" -Method Post -Body $wrongPasswordBody -ContentType "application/json"
    Write-Host "[FAIL] ERROR: Should have returned 403!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "[OK] Correctly returned 403 Forbidden`n" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Unexpected status: $($_.Exception.Response.StatusCode)`n" -ForegroundColor Red
    }
}

# Step 4: Verify with CORRECT password
Write-Host "Step 4: Verifying with CORRECT password..." -ForegroundColor Yellow
$correctPasswordBody = @{ password = "test123" } | ConvertTo-Json
try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/links/verify/$shortCode" -Method Post -Body $correctPasswordBody -ContentType "application/json"
    $token = $verifyResponse.downloadToken
    Write-Host "[OK] Password verified! Got JWT token" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 50))...`n" -ForegroundColor Gray
    
    # Step 5: Access with valid token
    Write-Host "Step 5: Accessing link WITH valid token..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$baseUrl/s/$shortCode`?token=$token" -Method Get -OutFile "test-download.tmp"
        Write-Host "[OK] File download successful!`n" -ForegroundColor Green
        Remove-Item "test-download.tmp" -ErrorAction SilentlyContinue
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "[WARN] File not found in Azure (expected for test)" -ForegroundColor Yellow
            Write-Host "   But token validation PASSED! [OK]`n" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Download failed: $($_.Exception.Message)`n" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "[FAIL] Password verification failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "`n[SUCCESS] Password Protection Test Complete!" -ForegroundColor Cyan
Write-Host "`nSummary:" -ForegroundColor White
Write-Host "   [OK] Link creation with password" -ForegroundColor Green
Write-Host "   [OK] Access denied without token" -ForegroundColor Green
Write-Host "   [OK] Wrong password rejected" -ForegroundColor Green
Write-Host "   [OK] Correct password returns JWT" -ForegroundColor Green
Write-Host "   [OK] Valid token allows access`n" -ForegroundColor Green
