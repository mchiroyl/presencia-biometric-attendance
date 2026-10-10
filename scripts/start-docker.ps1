# Contenedores Linux. En Desktop sin USB el lector se informa desconectado, jamás simulado.
param([switch]$Usb)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (!(Test-Path -LiteralPath '.env')) { throw 'Ejecute npm run setup primero.' }
$composeFiles = @('-f','docker-compose.yml','-f','docker-compose.linux.yml')
if (!$Usb) { $composeFiles += @('-f','docker-compose.desktop.yml') }
& docker compose @composeFiles build
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación Docker; se conserva la instancia anterior.' }
& "$PSScriptRoot/stop-local.ps1"
if ($Usb) {
    # El bus USB aparece después de attach a WSL, no antes. Prepararlo evita
    # invalid mount config cuando Docker Desktop/Windows acaba de reiniciarse.
    & "$PSScriptRoot/enable-reader-usb.ps1" -PrepareOnly
}
& docker compose @composeFiles up -d --no-build --wait
if ($LASTEXITCODE -ne 0) { throw 'Falló el arranque Docker. Revise docker compose logs sin compartir secretos.' }
if ($Usb) { & "$PSScriptRoot/enable-reader-usb.ps1" }
Write-Host 'Interfaz: http://localhost:5173 — API: http://localhost:3000/health'
if (!$Usb) { Write-Host 'USB todavía no compartido con Docker: captura bloqueada hasta preparar acceso físico Linux.' }
