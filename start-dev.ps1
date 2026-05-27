param(
  [switch]$Clean
)

$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Set-Location $PSScriptRoot

$port = 3006
Write-Host "Node: $(node --version)" -ForegroundColor Green
Write-Host "npm:  $(npm --version)" -ForegroundColor Green

# Libere le port si un ancien serveur bloque (evite page blanche / 500)
$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  $procId = $conn.OwningProcess
  Write-Host "Arret du processus $procId sur le port $port..." -ForegroundColor Yellow
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

if ($Clean -and (Test-Path ".next")) {
  Write-Host "Suppression du cache .next..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force ".next"
}

Write-Host "Demarrage sur http://localhost:$port ..." -ForegroundColor Cyan
if (-not $Clean) {
  Write-Host "Page blanche ? Relance avec: .\start-dev.ps1 -Clean" -ForegroundColor DarkGray
}
npm run dev -- -p $port
