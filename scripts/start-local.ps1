# Inicio normal: hardware real, nunca activa simulación. No instala drivers ni SDK.
param([string]$DPUruNetPath = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$logPath = Join-Path $projectRoot 'docs/evidence'
New-Item -ItemType Directory -Force -Path $logPath | Out-Null
foreach ($port in @(3000,5173,8080)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Puerto $port ocupado. Detenga la instancia anterior antes de iniciar." }
}
$dotnetPath = Join-Path $projectRoot '.tools/dotnet/dotnet.exe'
if (!(Test-Path -LiteralPath $dotnetPath)) { $dotnetPath = (Get-Command dotnet).Source }
$nodePath = (Get-Command node).Source
& docker compose up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'SQL Server no disponible' }
& npm.cmd run build -w backend
if ($LASTEXITCODE -ne 0) { throw 'Backend no compilado' }
$buildArguments = @('build','bridge/SchoolBridge.csproj')
if ($DPUruNetPath) {
    $sdkFile = (Resolve-Path -LiteralPath $DPUruNetPath).Path
    if ([System.IO.Path]::GetFileName($sdkFile) -ne 'DPUruNet.dll') { throw 'Indique la DLL autentica DPUruNet.dll del SDK HID' }
    $buildArguments += "-p:DPUruNetPath=$sdkFile"
}
& $dotnetPath @buildArguments
if ($LASTEXITCODE -ne 0) { throw 'Puente no compilado' }
$owned = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()
$previousSimulation = $env:ALLOW_SIMULATION
try {
    $env:ALLOW_SIMULATION = 'false'
    $apiFile = Join-Path $projectRoot 'backend/dist/main.js'
    $api = Start-Process $nodePath -ArgumentList @("`"$apiFile`"") -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath 'local-api.txt') -RedirectStandardError (Join-Path $logPath 'local-api-error.txt')
    $owned.Add($api); $env:ALLOW_SIMULATION = $previousSimulation
    $viteFile = Join-Path $projectRoot 'node_modules/vite/bin/vite.js'
    $web = Start-Process $nodePath -ArgumentList @("`"$viteFile`"") -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath 'local-web.txt') -RedirectStandardError (Join-Path $logPath 'local-web-error.txt')
    $owned.Add($web)
    $bridgeFile = Join-Path $projectRoot 'bridge/bin/Debug/net8.0/SchoolBridge.dll'
    $bridge = Start-Process $dotnetPath -ArgumentList @("`"$bridgeFile`"",'--hardware') -WorkingDirectory (Join-Path $projectRoot 'bridge') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath 'local-bridge.txt') -RedirectStandardError (Join-Path $logPath 'local-bridge-error.txt')
    $owned.Add($bridge)
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if (@($owned | Where-Object { $_.HasExited }).Count) { throw 'Un servicio termino. Consulte docs/evidence/local-*-error.txt' }
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:3000/health' -TimeoutSec 2
            $null = Invoke-WebRequest 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2
            if ($health.simulation -eq $false -and (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'No se pudo verificar el inicio sin simulacion' }
    @{api=$api.Id;frontend=$web.Id;bridge=$bridge.Id} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logPath 'local-processes.json')
    Write-Host 'Sistema iniciado sin simulacion: http://127.0.0.1:5173'
} catch {
    foreach ($process in $owned) { if (!$process.HasExited) { Stop-Process -Id $process.Id -Force } }
    throw
} finally { $env:ALLOW_SIMULATION = $previousSimulation }
