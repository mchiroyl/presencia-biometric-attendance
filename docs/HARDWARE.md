# Lector físico: instalación y diagnóstico

Actualizado el 10 de octubre de 2026. Ruta activa: U.are.U 4500 05ba:000a → Windows USB/IP → WSL2 → Docker Linux/libfprint. No requiere DPUruNet. La alternativa C# del repositorio sí requiere el SDK auténtico del fabricante y sus condiciones; no es el camino actual.

## Preparación Windows

Windows reconoce el lector como U.are.U 4500 Fingerprint Reader (WBF). Si no aparece en Administrador de dispositivos, revisar conexión/controlador obtenido de fuente oficial. Reconocerlo en Windows no implica que Linux pueda abrirlo.

En PowerShell administrador:

~~~powershell
winget install --interactive --exact dorssel.usbipd-win
& 'C:\Program Files\usbipd-win\usbipd.exe' list
& 'C:\Program Files\usbipd-win\usbipd.exe' bind --busid 2-5
~~~

2-5 fue el BUSID de esta computadora: sustituirlo por el lector 05ba:000a mostrado en list, nunca seleccionar cámara/Bluetooth. Si usbipd no se reconoce tras instalar, abrir una terminal nueva o usar la ruta absoluta anterior. El supervisor no comparte dispositivos nuevos automáticamente.

Compruebe WSL2/Ubuntu:

~~~powershell
wsl --list --verbose
wsl -d Ubuntu -- uname -r
~~~

Desde la raíz del proyecto:

~~~powershell
powershell -ExecutionPolicy Bypass -File '.\scripts\enable-reader-usb.ps1'
powershell -ExecutionPolicy Bypass -File '.\scripts\start-docker.ps1' -Usb
~~~

El primer script inicia la reconexión, espera USB/IP, configura permisos 0660 solo para el lector y monta el bus real. El segundo es el arranque completo para usos posteriores. Es necesario Docker Desktop activo y Ubuntu preparada; consulte [DOCKER_LINUX](DOCKER_LINUX.md).

## Estados y comprobaciones

Shared significa compartido pero sin cliente WSL; Attached significa transportado a WSL. Ninguno por sí solo asegura apertura libfprint. La web separa conexión WebSocket y disponibilidad del hardware. Disponible exige apertura física satisfactoria; múltiples lectores, errores o desconexión bloquean capturas.

~~~powershell
& 'C:\Program Files\usbipd-win\usbipd.exe' list
docker compose -f docker-compose.yml -f docker-compose.linux.yml ps
docker compose -f docker-compose.yml -f docker-compose.linux.yml exec -T biometric python3 test_live.py
node scripts/check-hardware.cjs
~~~

Los diagnósticos no solicitan huellas. Esperado: mode=hardware, available=true cuando el lector esté operativo. Un contenedor Healthy comprueba el servicio, no demuestra disponibilidad ni una captura completa.

## Reconexión y LED

El supervisor consulta cada tres segundos, reevalúa VID/PID/BUSID y adjunta solo un lector autorizado. Mantiene Ubuntu activa; no exige puerto fijo. Si Windows identifica un nuevo dispositivo, otro bind puede ser necesario. Tras reiniciar Windows ejecute start-docker.ps1 -Usb. No se instala automáticamente una tarea de inicio de sesión.

Un LED apagado en reposo no demuestra ausencia de lector; la comprobación abre y cierra el dispositivo. Una captura comienza únicamente al enrolar/marcar. Se verificó recuperación tras cortar USB/IP con el lector conectado. Quedan por verificar supervisadamente desenchufar/reinsertar físicamente, cambio de puerto y comportamiento LED durante captura. Véase [prueba de reconexión](PRUEBA_RECONEXION_USB.md).

Si falla: revisar Docker/Ubuntu, estado Shared/Attached, permisos del nuevo nodo USB y apertura libfprint. No habilitar privileged, permisos globales 0666 ni exponer Docker por TCP para solucionar USB.

Documentación oficial de referencia: [USB en WSL](https://learn.microsoft.com/en-us/windows/wsl/connect-usb), [usbipd-win](https://github.com/dorssel/usbipd-win), [libfprint](https://fprint.freedesktop.org/).

Actualización de arranque USB: start-docker.ps1 -Usb ejecuta enable-reader-usb.ps1 -PrepareOnly antes de compose up. Así se adjunta el lector a WSL y se crea el bus antes del montaje; evita invalid mount config /dev/bus/usb tras reiniciar. Sin lector conectado se detiene con un mensaje explícito antes de iniciar el puente; un dispositivo en Persisted no equivale a conectado.

## Sustituir el lector por otra unidad del mismo modelo

La selección se realiza por VID:PID 05ba:000a, no por número de serie ni puerto fijo. Se admite otra unidad U.are.U 4500 compatible, conectando una sola a la vez. Windows conserva la autorización por unidad: si la nueva aparece Not shared, ejecute en PowerShell administrador usbipd bind --hardware-id 05ba:000a. Después arranque start-docker.ps1 -Usb para adjuntarla y habilitar el montaje del contenedor. Marca/modelo visual no sustituye comprobar VID:PID. Cambiar de lector no garantiza compatibilidad de plantillas anteriores: verifique identificación real y reenrole si son incompatibles. No se borran huellas ni historial automáticamente.

## Errores observados y resueltos

Esta guía es la referencia detallada para errores de lector; el README contiene el resumen y el procedimiento completo después de clonar.

| Situación observada | Diagnóstico | Solución adoptada |
|---|---|---|
| El script no existe desde system32 | Ruta relativa fuera del proyecto | Ejecutar ruta absoluta o entrar al clon |
| usbipd no se reconoce después de instalar | PATH de terminal desactualizado | Ruta absoluta o nueva terminal |
| /dev/bus/usb no existe para bind mount | Orden de inicio incorrecto tras reiniciar | start-docker.ps1 -Usb prepara el lector mediante -PrepareOnly antes de compose up |
| Unidad antigua en Persisted y ninguna conectada | Autorización guardada, dispositivo ausente | Verificar cable, puerto y Windows; no confundir Persisted con Connected |
| Nueva unidad 05ba:000a Not shared | Autorización por unidad en Windows | bind --hardware-id 05ba:000a como administrador |
| Puente Healthy pero lector desconectado | Healthy es estado de servicio, no apertura física | Verificar mount USB, Attached y test_live.py |
| Arranque sin -Usb | Override Desktop elimina acceso a dispositivos | Volver a ejecutar con -Usb después de autorizar/conectar |

El 10/10/2026 se comprobó el reemplazo por otra unidad 05ba:000a: inicialmente Not shared y contenedor sin montaje. Después de bind y arranque -Usb, list mostró Attached y test_live.py confirmó mode=hardware, available=true y rechazo de token/origen no autorizados. Esta comprobación no capturó un dedo ni certificó compatibilidad de huellas anteriores.

Comprobación del montaje activo:

~~~powershell
docker inspect sistemadecontroldeasistenciabiomtricoescolar-biometric-1 --format '{{json .Mounts}}'
~~~

Ese nombre corresponde al proyecto Compose en esta carpeta; en un clon puede cambiar. Para obtener el ID correcto desde el clon, use docker compose -f docker-compose.yml -f docker-compose.linux.yml ps -q biometric y consulte docker inspect con ese ID. Un arreglo vacío de Mounts implica que el contenedor actual no recibe el bus.

No se requiere instalar DPUruNet para esta variante. El bloqueo por Not shared pertenece a Windows/USB-IP; no es una licencia biométrica ni una restricción del backend por número de serie.
