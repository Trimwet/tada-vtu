# OpenClaw Skill Verification Script

Write-Host "=== OpenClaw TADA VTU Skill Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Skill directory exists
Write-Host "1. Checking skill directory..." -ForegroundColor Yellow
$skillPath = "C:\Users\MAFUYAI\.openclaw\skills\tadavtu-buy-data"

if (Test-Path $skillPath) {
    Write-Host "[OK] Skill directory exists" -ForegroundColor Green
    
    # List files
    $files = Get-ChildItem $skillPath | Select-Object -ExpandProperty Name
    Write-Host "   Files found: $($files.Count)" -ForegroundColor Gray
    
    # Check required files
    $requiredFiles = @("SKILL.md", "index.js", "package.json")
    foreach ($file in $requiredFiles) {
        if ($files -contains $file) {
            Write-Host "   [OK] $file" -ForegroundColor Green
        } else {
            Write-Host "   [MISSING] $file" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[FAIL] Skill directory not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check 2: SKILL.md format
Write-Host "2. Checking SKILL.md format..." -ForegroundColor Yellow
$skillMd = Get-Content "$skillPath\SKILL.md" -Raw

if ($skillMd -match "^---") {
    Write-Host "[OK] SKILL.md has frontmatter" -ForegroundColor Green
    
    # Extract name
    if ($skillMd -match "name:\s*(.+)") {
        Write-Host "   Skill name: $($matches[1])" -ForegroundColor Gray
    }
    
    # Extract version
    if ($skillMd -match "version:\s*(.+)") {
        Write-Host "   Version: $($matches[1])" -ForegroundColor Gray
    }
} else {
    Write-Host "[WARN] SKILL.md missing frontmatter" -ForegroundColor Yellow
}

Write-Host ""

# Check 3: Test skill execution
Write-Host "3. Testing skill execution..." -ForegroundColor Yellow
$env:OPENCLAW_API_KEY = "oc_tada_2024_secure_key_change_in_production"
$env:USER_PHONE = "09063546728"

try {
    $output = node "$skillPath\index.js" "help" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Skill executes successfully" -ForegroundColor Green
        Write-Host "   Output preview: $($output.ToString().Substring(0, [Math]::Min(100, $output.ToString().Length)))..." -ForegroundColor Gray
    } else {
        Write-Host "[FAIL] Skill execution failed" -ForegroundColor Red
        Write-Host "   Error: $output" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Cannot execute skill" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check 4: Environment variables
Write-Host "4. Checking environment..." -ForegroundColor Yellow
if ($env:OPENCLAW_API_KEY) {
    Write-Host "[OK] OPENCLAW_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "[WARN] OPENCLAW_API_KEY not set" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Stop OpenClaw gateway (Ctrl+C)" -ForegroundColor White
Write-Host "2. Restart with: openclaw gateway" -ForegroundColor White
Write-Host "3. Watch for: [skills] Loaded skill: tadavtu-buy-data" -ForegroundColor White
Write-Host "4. Test with: /new then 'check my TADA balance'" -ForegroundColor White
Write-Host ""
