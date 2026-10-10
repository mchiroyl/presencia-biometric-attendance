# Mantiene únicamente el lector 05ba:000a conectado a WSL. No captura huellas.
param([switch]$Watch)
$ErrorActionPreference = 'Stop'
$usbipd = Join-Path $env:ProgramFiles 'usbipd-win/usbipd.exe'
if (!(Test-Path -LiteralPath $usbipd)) { throw 'Instale usbipd-win antes de iniciar la reconexión.' }
if ($Watch) {
    $keepAlive = $null
    while ($true) {
        try {
            if (!$keepAlive -or $keepAlive.HasExited) {
                $keepAlive = Start-Process -FilePath 'wsl.exe' -ArgumentList @('-d','Ubuntu','--','sleep','infinity') -WindowStyle Hidden -PassThru
                Start-Sleep -Seconds 2
            }
            $snapshot = & $usbipd state | ConvertFrom-Json
            $candidates = @($snapshot.Devices | Where-Object { $_.InstanceId -match '^USB\\VID_05BA&PID_000A\\' -and $_.BusId })
            # Reevalúa el hardware en cada ciclo: no conserva un BUSID de otro puerto.
            # Ante múltiples lectores o uno no autorizado con bind, no adjunta ninguno.
            if ($candidates.Count -eq 1 -and $candidates[0].PersistedGuid -and !$candidates[0].ClientIPAddress) {
                # PowerShell 5 interpreta mensajes informativos de stderr como errores:
                # ejecutar directamente evita abortar attach a mitad de la conexión.
                Start-Process -FilePath $usbipd -ArgumentList @('attach','--wsl','Ubuntu','--hardware-id','05ba:000a') -WindowStyle Hidden -Wait
            }
        } catch { Write-Warning $_.Exception.Message } # No registra secretos ni datos biométricos.
        Start-Sleep -Seconds 3
    }
}
$state = (& $usbipd state | ConvertFrom-Json)
$readers = @($state.Devices | Where-Object { $_.InstanceId -match '^USB\\VID_05BA&PID_000A\\' -and $_.BusId })
if ($readers.Count -eq 0) { throw 'Lector U.are.U 4500 no conectado en Windows. Conecte el cable USB y vuelva a ejecutar el arranque con -Usb.' }
if ($readers.Count -gt 1) { throw 'Hay múltiples lectores 05ba:000a. Deje conectado solo uno; no se seleccionará un dispositivo ambiguo.' }
if (!$readers[0].PersistedGuid) { throw 'El lector está conectado pero Windows no autoriza esta unidad. En PowerShell administrador ejecute usbipd bind --hardware-id 05ba:000a y después repita el arranque con -Usb.' }
# Evita supervisores duplicados verificando el nombre y la ruta exacta del script.
$existing = @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -in @('powershell.exe','pwsh.exe') -and $_.CommandLine -and
    $_.CommandLine.Contains($PSCommandPath) -and $_.CommandLine -match '-Watch'
})
if (!$existing.Count) {
    # --hardware-id identifica el modelo sin exigir un puerto USB fijo.
    # El supervisor queda activo al cerrar esta terminal; solo transporta USB a WSL.
    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$PSCommandPath+'"'),'-Watch') -WindowStyle Hidden
}
Write-Host 'Reconexión automática del lector activada para esta sesión de Windows.'
