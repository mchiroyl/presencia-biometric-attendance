# Prepara USB antes de iniciar Docker; autoriza exclusivamente el lector 05ba:000a.
param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot/start-reader-autoattach.ps1"
$attached = $false
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    $usbState = & (Join-Path $env:ProgramFiles 'usbipd-win/usbipd.exe') state | ConvertFrom-Json
    $attached = @($usbState.Devices | Where-Object { $_.InstanceId -match '^USB\\VID_05BA&PID_000A\\' -and $_.ClientIPAddress }).Count -eq 1
    if ($attached) { break }
    Start-Sleep -Seconds 2
}
if (!$attached) { throw 'No se pudo reconectar el lector a WSL en 30 segundos.' }
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$readerGroup = & node -e "const f=require('fs'),d=require('dotenv');const v=d.parse(f.readFileSync('.env'));const g=Number(v.BIOMETRIC_USB_GID||10001);if(!Number.isInteger(g)||g<1000||g>60000)process.exit(1);process.stdout.write(String(g));"
if ($LASTEXITCODE -ne 0) { throw 'BIOMETRIC_USB_GID inválido en .env.' }
$linuxSetup = @'
from pathlib import Path
import grp, os, subprocess, sys
gid=int(sys.argv[1])
name='school-biometric'
try:
    group=grp.getgrnam(name)
    if group.gr_gid != gid: raise RuntimeError('El grupo existente usa otro GID; revise .env')
except KeyError:
    try:
        grp.getgrgid(gid)
    except KeyError:
        subprocess.run(['groupadd','-g',str(gid),name],check=True)
    else:
        raise RuntimeError('GID ocupado por otro grupo; revise .env')
nodes=[]
for p in Path('/sys/bus/usb/devices').glob('*'):
    v=p/'idVendor'; product=p/'idProduct'
    if v.exists() and product.exists() and v.read_text().strip()=='05ba' and product.read_text().strip()=='000a':
        bus=int((p/'busnum').read_text()); dev=int((p/'devnum').read_text())
        nodes.append(Path(f'/dev/bus/usb/{bus:03d}/{dev:03d}'))
if len(nodes)!=1:
    raise RuntimeError('Debe haber un solo lector 05ba:000a conectado mediante usbipd attach')
rule='SUBSYSTEM=="usb", ENV{DEVTYPE}=="usb_device", ATTR{idVendor}=="05ba", ATTR{idProduct}=="000a", GROUP="school-biometric", MODE="0660"\n'
target=Path('/etc/udev/rules.d/99-school-reader.rules')
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(rule)
subprocess.run(['udevadm','control','--reload-rules'],check=True)
for node in nodes:
    os.chown(node,0,gid); os.chmod(node,0o660)
print('Permisos USB aplicados exclusivamente al lector 05ba:000a.')
'@
$linuxSetup | wsl -d Ubuntu -u root -- python3 - $readerGroup
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron configurar permisos del lector en Ubuntu.' }
if ($PrepareOnly) { return }
& docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d --no-build --wait biometric
if ($LASTEXITCODE -ne 0) { throw 'No se pudo montar USB en el contenedor.' }
$ready = $false
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    # PS5 puede convertir stderr nativo en excepción; permitir el reintento transitorio.
    $ErrorActionPreference = 'Continue'
    try {
        $statusJson = & docker compose -f docker-compose.yml -f docker-compose.linux.yml exec -T biometric python3 test_live.py 2>$null
    } finally { $ErrorActionPreference = 'Stop' }
    if ($LASTEXITCODE -eq 0) {
        $verifiedStatus = $statusJson | ConvertFrom-Json
        if ($verifiedStatus.available) { $ready = $true; break }
    }
    Start-Sleep -Seconds 2
}
if (!$ready) { throw 'USB configurado, pero libfprint no pudo abrir el lector tras la espera. Revise el estado del puente.' }
Write-Host 'Lector conectado y disponible, confirmado mediante WebSocket. Interfaz: http://localhost:5173.'
