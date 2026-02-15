# Simple OpenClaw Deployment Verification

Write-Host "TADA VTU OpenClaw Deployment Check" -ForegroundColor Cyan
Write-Host ""

# Check files
Write-Host "Checking deployed files..." -ForegroundColor Yellow
$skillPath = "$env:USERPROFILE\.openclaw\skills\tadavtu-buy-data"

if (Test-Path "$skillPath\agent.ts") {
    Write-Host "[OK] agent.ts found" -ForegroundColor Green
} else {
    Write-Host "[FAIL] agent.ts missing" -ForegroundColor Red
}

if (Test-Path "$skillPath\SKILL.md") {
    Write-Host "[OK] SKILL.md found" -ForegroundColor Green
} else {
    Write-Host "[FAIL] SKILL.md missing" -ForegroundColor Red
}

Write-Host ""

# Check API key
Write-Host "Checking environment..." -ForegroundColor Yellow
if ($env:OPENCLAW_API_KEY) {
    Write-Host "[OK] OPENCLAW_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "[WARN] OPENCLAW_API_KEY not set" -ForegroundColor Yellow
    Write-Host "Set it with: `$env:OPENCLAW_API_KEY = 'your-key'" -ForegroundColor Gray
}

Write-Host ""

# Check backend
Write-Host "Checking backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://tadavtu.com/api/openclaw/health" -Method Get -UseBasicParsing
    Write-Host "[OK] Backend API is reachable" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Cannot reach backend API" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployment check complete!" -ForegroundColor Cyan
