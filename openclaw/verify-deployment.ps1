# OpenClaw Deployment Verification Script
# Run this after deploying to verify everything is set up correctly

Write-Host "=== TADA VTU OpenClaw Deployment Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Files exist
Write-Host "1. Checking if files are deployed..." -ForegroundColor Yellow
$skillPath = "$env:USERPROFILE\.openclaw\skills\tadavtu-buy-data"
$requiredFiles = @("agent.ts", "SKILL.md", "README.md", "package.json")

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $skillPath $file
    if (Test-Path $filePath) {
        Write-Host "   ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $file (MISSING)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-Host "   All required files present!" -ForegroundColor Green
} else {
    Write-Host "   Some files are missing. Run deployment again." -ForegroundColor Red
}
Write-Host ""

# Check 2: Environment variables
Write-Host "2. Checking environment variables..." -ForegroundColor Yellow
if ($env:OPENCLAW_API_KEY) {
    Write-Host "   ✓ OPENCLAW_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "   ✗ OPENCLAW_API_KEY not set" -ForegroundColor Red
    Write-Host "   Run: `$env:OPENCLAW_API_KEY = 'your-api-key'" -ForegroundColor Yellow
}

if ($env:TADA_API_URL) {
    Write-Host "   ✓ TADA_API_URL is set to: $env:TADA_API_URL" -ForegroundColor Green
} else {
    Write-Host "   ℹ TADA_API_URL not set (will use default: https://tadavtu.com)" -ForegroundColor Cyan
}
Write-Host ""

# Check 3: Backend API health
Write-Host "3. Checking backend API health..." -ForegroundColor Yellow
$apiUrl = if ($env:TADA_API_URL) { $env:TADA_API_URL } else { "https://tadavtu.com" }
$healthUrl = "$apiUrl/api/openclaw/health"

try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
    if ($response.status -eq "healthy") {
        Write-Host "   ✓ Backend API is healthy" -ForegroundColor Green
        Write-Host "   Version: $($response.version)" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠ Backend API returned unexpected status: $($response.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Cannot reach backend API at $healthUrl" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Check 4: Test user identification (if API key is set)
if ($env:OPENCLAW_API_KEY) {
    Write-Host "4. Testing user identification endpoint..." -ForegroundColor Yellow
    $identifyUrl = "$apiUrl/api/openclaw/user/identify"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $env:OPENCLAW_API_KEY"
            "Content-Type" = "application/json"
        }
        $body = @{
            phoneNumber = "08012345678"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri $identifyUrl -Method Post -Headers $headers -Body $body -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "   ✓ User identification working" -ForegroundColor Green
            Write-Host "   User ID: $($response.userId)" -ForegroundColor Cyan
        } else {
            Write-Host "   ⚠ Identification returned success=false" -ForegroundColor Yellow
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "   ✗ Authentication failed (401) - Check your OPENCLAW_API_KEY" -ForegroundColor Red
        } elseif ($statusCode -eq 404) {
            Write-Host "   ✗ Endpoint not found (404) - Backend may not be deployed" -ForegroundColor Red
        } else {
            Write-Host "   ✗ Error testing identification: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "4. Skipping user identification test (no API key set)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allFilesExist -and $env:OPENCLAW_API_KEY) {
    Write-Host "Deployment looks good! You can now use the TADA VTU skill." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart OpenClaw gateway: openclaw gateway" -ForegroundColor White
    Write-Host "2. Test with: What's my balance?" -ForegroundColor White
    Write-Host "3. Try: Buy 500 naira MTN airtime for 08012345678" -ForegroundColor White
} else {
    Write-Host "Some issues detected. Please fix them before using the skill." -ForegroundColor Yellow
}
Write-Host ""
