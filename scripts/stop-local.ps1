# Detiene exclusivamente los procesos registrados cuyo comando coincide con este proyecto.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$processFile = Join-Path $projectRoot 'docs/evidence/local-processes.json'
if (!(Test-Path -LiteralPath $processFile)) { Write-Host 'No hay procesos registrados.'; return }
$known = Get-Content -LiteralPath $processFile | ConvertFrom-Json
$files = @{ api='backend/dist/main.js'; frontend='node_modules/vite/bin/vite.js'; bridge='bridge/bin/Debug/net8.0/SchoolBridge.dll' }
foreach ($role in @('api','frontend','bridge')) {
    $processId = [int]$known.$role
    $running = Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
    $expectedFile = Join-Path $projectRoot $files[$role]
    if ($running -and $running.CommandLine -and $running.CommandLine.Contains($expectedFile)) { Stop-Process -Id $processId -Force; Write-Host "Detenido: $role" }
}
Write-Host 'SQL Server permanece iniciado. Para detenerlo: docker compose stop'
