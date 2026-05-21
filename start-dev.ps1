$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Set-Location $PSScriptRoot
Write-Host "Node: $(node --version)" -ForegroundColor Green
Write-Host "npm:  $(npm --version)" -ForegroundColor Green
Write-Host "Demarrage sur http://localhost:3000 ..." -ForegroundColor Cyan
npm run dev
