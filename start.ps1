# Script de démarrage rapide — WiFi DensePose Smart Room
# Usage : .\start.ps1 [-Mode dev|docker]

param(
    [ValidateSet("dev", "docker")]
    [string]$Mode = "dev"
)

Write-Host "`n WiFi DensePose — Chambre Intelligente`n" -ForegroundColor Cyan

if ($Mode -eq "docker") {
    Write-Host "Mode Docker — construction et démarrage..." -ForegroundColor Yellow
    docker compose up --build
} else {
    Write-Host "Mode Développement`n" -ForegroundColor Green
    Write-Host "1. Démarrage du backend Python..." -ForegroundColor Gray

    $backendJob = Start-Job -ScriptBlock {
        Set-Location "C:\Users\pc\Desktop\WifiDensePose\backend"
        python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    }

    Start-Sleep -Seconds 3
    Write-Host "2. Démarrage du frontend Next.js..." -ForegroundColor Gray

    $frontendJob = Start-Job -ScriptBlock {
        Set-Location "C:\Users\pc\Desktop\WifiDensePose\frontend"
        npm run dev
    }

    Write-Host "`n Backend  : http://localhost:8000" -ForegroundColor Cyan
    Write-Host " Frontend : http://localhost:3000" -ForegroundColor Cyan
    Write-Host " API docs : http://localhost:8000/docs`n" -ForegroundColor Cyan
    Write-Host "Ctrl+C pour arrêter`n" -ForegroundColor Gray

    try {
        while ($true) {
            Receive-Job $backendJob | Write-Host -ForegroundColor DarkGray
            Receive-Job $frontendJob | Write-Host -ForegroundColor DarkGray
            Start-Sleep -Seconds 1
        }
    } finally {
        Stop-Job $backendJob, $frontendJob
        Remove-Job $backendJob, $frontendJob
    }
}
