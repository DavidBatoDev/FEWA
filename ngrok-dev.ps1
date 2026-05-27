# ngrok-dev.ps1
# Starts ngrok on port 8000, grabs the public URL, writes it to server/.env
#
# Usage: .\ngrok-dev.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EnvFile   = Join-Path $ScriptDir "server\.env"
$Port      = 8000
$NgrokApi  = "http://localhost:4040/api/tunnels"

# ── 1. Create .env from example if it doesn't exist ──────────────────────────
if (-not (Test-Path $EnvFile)) {
    $example = Join-Path $ScriptDir "server\.env.example"
    if (Test-Path $example) {
        Copy-Item $example $EnvFile
        Write-Host "[ngrok-dev] Created server\.env from .env.example"
    } else {
        New-Item -ItemType File $EnvFile | Out-Null
        Write-Host "[ngrok-dev] Created empty server\.env"
    }
}

# ── 2. Kill any existing ngrok process ───────────────────────────────────────
$existing = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[ngrok-dev] Stopping existing ngrok process..."
    $existing | Stop-Process -Force
    Start-Sleep -Milliseconds 800
}

# ── 3. Start ngrok in the background ─────────────────────────────────────────
Write-Host "[ngrok-dev] Starting ngrok on port $Port..."
Start-Process -FilePath "ngrok" -ArgumentList "http $Port" -WindowStyle Hidden

# ── 4. Wait for ngrok to be ready ────────────────────────────────────────────
Write-Host "[ngrok-dev] Waiting for ngrok tunnel..."
$NgrokUrl = $null

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $response = Invoke-RestMethod -Uri $NgrokApi -ErrorAction Stop
        $NgrokUrl = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
        if ($NgrokUrl) { break }
    } catch {
        # not ready yet
    }
}

if (-not $NgrokUrl) {
    Write-Host "[ngrok-dev] ERROR: Could not get ngrok URL after 10 seconds." -ForegroundColor Red
    Write-Host "[ngrok-dev] Make sure ngrok is installed and your authtoken is set." -ForegroundColor Red
    exit 1
}

# ── 5. Write BACKEND_PUBLIC_URL to server/.env ───────────────────────────────
$envContent = Get-Content $EnvFile -Raw

if ($envContent -match "(?m)^BACKEND_PUBLIC_URL=.*$") {
    $envContent = $envContent -replace "(?m)^BACKEND_PUBLIC_URL=.*$", "BACKEND_PUBLIC_URL=$NgrokUrl"
} else {
    $envContent = $envContent.TrimEnd() + "`nBACKEND_PUBLIC_URL=$NgrokUrl`n"
}

Set-Content -Path $EnvFile -Value $envContent -NoNewline

# ── 6. Print summary ──────────────────────────────────────────────────────────
Write-Host ''
Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
Write-Host '  ngrok tunnel active' -ForegroundColor Cyan
Write-Host "  $NgrokUrl" -ForegroundColor Cyan
Write-Host '  BACKEND_PUBLIC_URL updated in server\.env' -ForegroundColor Cyan
Write-Host "  Agora will call: $NgrokUrl/chat/completions" -ForegroundColor Cyan
Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
Write-Host ''
Write-Host '[ngrok-dev] Ready. Now start the server:' -ForegroundColor Green
Write-Host '  cd server' -ForegroundColor Yellow
Write-Host '  .\.venv\Scripts\Activate.ps1' -ForegroundColor Yellow
Write-Host '  python run.py' -ForegroundColor Yellow
Write-Host ''
Write-Host '[ngrok-dev] ngrok is running in the background.' -ForegroundColor Gray
Write-Host '  To stop it: Stop-Process -Name ngrok' -ForegroundColor Gray
