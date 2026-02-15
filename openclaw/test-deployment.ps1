# Test OpenClaw Deployment

Write-Host "Testing OpenClaw API Deployment..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://tadavtu.com"
$apiKey = "oc_tada_2024_secure_key_change_in_production"

# Test 1: Health endpoint
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/openclaw/health" -Method Get -ErrorAction Stop
    Write-Host "[SUCCESS] Health endpoint is working!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "[FAILED] Health endpoint not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "This likely means:" -ForegroundColor Yellow
    Write-Host "- Vercel is still deploying (wait 1-2 minutes)" -ForegroundColor Gray
    Write-Host "- Or the deployment failed (check Vercel dashboard)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Check deployment status at: https://vercel.com/dashboard" -ForegroundColor Cyan
