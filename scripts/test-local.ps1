# Ejecutar desde la raíz. Inicia únicamente procesos propios, en ventanas ocultas, y los detiene al terminar.
param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$evidence = Join-Path $projectRoot 'docs/evidence'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$localDotnet = Join-Path $projectRoot '.tools/dotnet/dotnet.exe'
$dotnetCommand = if (Test-Path -LiteralPath $localDotnet) { $localDotnet } else { (Get-Command dotnet -ErrorAction Stop).Source }
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$nodeCommand = (Get-Command node -ErrorAction Stop).Source
$processes = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()
$previousSimulation = $env:ALLOW_SIMULATION
function Check([string]$Label, [string]$Executable, [string[]]$Arguments) {
    Write-Host "Verificando: $Label"
    $savedPreference = $ErrorActionPreference
    try { $ErrorActionPreference = 'Continue'; & $Executable @Arguments 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath (Join-Path $evidence "$Label.txt"); $commandExitCode = $LASTEXITCODE }
    finally { $ErrorActionPreference = $savedPreference }
    if ($commandExitCode -ne 0) { throw "Falló $Label (exit $commandExitCode). Consulte docs/evidence/$Label.txt" }
}
function Wait-Http([string]$Url) {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        try { $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2; return } catch { Start-Sleep -Milliseconds 500 }
    }
    throw "Servicio no disponible: $Url"
}
try {
    foreach ($port in @(3000,5173,8080)) {
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Puerto $port ocupado. Detenga sus servicios antes de ejecutar esta prueba." }
    }
    if (!(Test-Path -LiteralPath '.env')) { throw 'Ejecute npm run setup primero.' }
    if (!$SkipInstall) { Check 'install' $npmCommand @('ci') }
    Check 'compose' (Get-Command docker).Source @('compose','up','-d','--wait')
    Check 'build' $npmCommand @('run','build')
    Check 'db-init' $npmCommand @('run','db:init')
    Check 'unit' $npmCommand @('test')
    Check 'integration' $npmCommand @('run','test:integration')
    Check 'bridge-tests' $dotnetCommand @('test','bridge/tests/Bridge.Tests.csproj','--logger','trx;LogFileName=bridge.trx','--results-directory', $evidence)
    Check 'browser-install' $npmCommand @('exec','--','playwright','install','chromium')
    $env:ALLOW_SIMULATION = 'true'
    $backendFile = Join-Path $projectRoot 'backend/dist/main.js'
    $processes.Add((Start-Process -FilePath $nodeCommand -ArgumentList @("`"$backendFile`"") -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $evidence 'backend-runtime.txt') -RedirectStandardError (Join-Path $evidence 'backend-runtime-error.txt')))
    $env:ALLOW_SIMULATION = $previousSimulation
    $viteFile = Join-Path $projectRoot 'node_modules/vite/bin/vite.js'
    $processes.Add((Start-Process -FilePath $nodeCommand -ArgumentList @("`"$viteFile`"") -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $evidence 'frontend-runtime.txt') -RedirectStandardError (Join-Path $evidence 'frontend-runtime-error.txt')))
    $bridgeFile = Join-Path $projectRoot 'bridge/bin/Debug/net8.0/SchoolBridge.dll'
    $processes.Add((Start-Process -FilePath $dotnetCommand -ArgumentList @("`"$bridgeFile`"",'--simulate') -WorkingDirectory (Join-Path $projectRoot 'bridge') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $evidence 'bridge-runtime.txt') -RedirectStandardError (Join-Path $evidence 'bridge-runtime-error.txt')))
    Wait-Http 'http://127.0.0.1:3000/health'
    Wait-Http 'http://127.0.0.1:5173'
    Check 'e2e' $npmCommand @('run','test:e2e')
    Write-Host 'Pruebas locales terminadas. Consulte docs/evidence y docs/PRUEBAS.md. SQL Server permanece iniciado.'
} finally {
    $env:ALLOW_SIMULATION = $previousSimulation
    foreach ($process in $processes) { if (!$process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } }
}
