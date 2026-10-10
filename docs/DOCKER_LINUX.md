> Estado vigente al 10/10/2026: la instalación principal es Docker/Linux con SQL Express, NestJS, React/Nginx y libfprint. El puente C# y los resultados de simulación corresponden a alternativas o pruebas históricas. Foto personal obligatoria en nuevas altas, código oculto/automático, horarios y semáforo, historial por fecha y reconexión USB están implementados. Véase [cambios consolidados](CAMBIOS.md) y los manuales actuales.

# Servidor Linux en Docker, sin SDK comercial HID

Esta variante ejecuta SQL Server Express, NestJS, la web React compilada y un puente Python/libfprint en contenedores Linux. No requiere DPUruNet ni una suscripción HID. El C# Windows queda como alternativa antigua y no se ejecuta en este arranque. No hay lector simulado ni generación ficticia de huellas.

## Arranque en esta máquina Windows

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-docker.ps1
```

Abra http://localhost:5173. El script detiene exclusivamente los procesos locales registrados por este proyecto y conserva el volumen SQL existente. El inicializador aplica migraciones y conserva las cuentas y empleados. No use `down -v`: elimina la base de datos.

Este arranque utiliza `docker-compose.desktop.yml` para iniciar todo sin acceso USB. Por tanto el puente responde **Lector desconectado**, y Enrolar permanece bloqueado. Es un diagnóstico real, no una simulación: un contenedor de Docker Desktop no recibe automáticamente el USB del anfitrión Windows.

## Captura física en un anfitrión Linux

### USB comprobado en esta máquina Windows/WSL2

El 10/10/2026 se conectó el U.are.U 4500 (`05ba:000a`, BUSID Windows `2-5`) mediante usbipd-win 5.3.0. Se comprobó que Ubuntu y docker-desktop ven el mismo nodo USB. Se montó el bus real, se asignó solo el lector al grupo 10001 con modo 0660, y **libfprint abrió el dispositivo**. El navegador recibió `state=available`, `available=true`, `mode=hardware`; no se capturó ninguna huella en este diagnóstico. Evidencia: [WebSocket](evidence/usb-attached-bridge.txt), [navegador](evidence/usb-attached-browser.txt).

Después de instalar y compartir con `usbipd bind` (una sola vez, administrador), conectar en PowerShell con el BUSID actual:

```powershell
& 'C:\Program Files\usbipd-win\usbipd.exe' list
& 'C:\Program Files\usbipd-win\usbipd.exe' attach --wsl --busid 2-5
```

Después, desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/enable-reader-usb.ps1
```

El script instala una regla udev limitada en Ubuntu, configura el nodo conectado y arranca el puente con montaje USB real, sin el override Desktop que elimina dispositivos. También inicia `start-reader-autoattach.ps1` en segundo plano para recuperar la conexión cada tres segundos al desconectar/reconectar. Mantiene Ubuntu activa y selecciona el modelo `05ba:000a` usando el BUSID actual, sin imponer un puerto físico. Ante múltiples lectores o un dispositivo sin autorización previa `bind`, no adjunta ninguno. No captura ni registra huellas.

Conserve Docker Desktop abierto. El supervisor dura esta sesión de Windows; después de reiniciar ejecute `scripts/start-docker.ps1 -Usb` (también activa la reconexión). Sin `-Usb` se inicia deliberadamente sin montaje USB. Un cambio de puerto que Windows identifique como dispositivo nuevo puede requerir otro `bind` administrativo; el supervisor nunca comparte otros dispositivos ni solicita privilegios automáticamente.

El estado «disponible» se comprueba abriendo el lector con libfprint, no mirando sus LED. En reposo puede estar apagado: la captura se inicia únicamente al enrolar o marcar. Compruebe un ciclo real de enrolamiento con un empleado que haya consentido; no se han validado físicamente los LED ni capturado huellas durante las pruebas técnicas.

### Anfitrión Linux nativo

El proceso Docker debe poder ver `/dev/bus/usb`, y el lector debe estar conectado a ese Linux. En un anfitrión Linux con Docker Engine, confirme `lsusb` y el lector `05ba:000a`. Instale estos permisos limitados:

```bash
sudo groupadd -g 10001 school-biometric
sudo install -m 0644 bridge-linux/99-school-reader.rules /etc/udev/rules.d/99-school-reader.rules
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=usb
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d --build --wait
```

Si el grupo/GID ya existe, revise su identidad y elija un GID libre; cambie la regla y configure `BIOMETRIC_USB_GID` en el único `.env`. No reutilice un grupo ajeno. Si el lector no cambia de permisos, reconéctelo. La regla solo autoriza ese VID/PID, el contenedor usa UID 10001, sin capabilities ni `privileged`. Solo el puente recibe el bus USB; la API y la web no tienen dispositivos. El bus montado permite detectar reconexiones en cualquier puerto. El código solo abre el driver `uru4000`, y bloquea múltiples lectores reconocidos.

En Windows con WSL2 se requiere adicionalmente USB/IP. La guía oficial de Microsoft explica instalar usbipd-win, identificar el BUSID, compartir el lector con `usbipd bind --busid <BUSID>` en una consola administrativa y conectar con `usbipd attach --wsl --busid <BUSID>`. Compruebe después el USB en Linux y su apertura dentro del contenedor; aquí ya se comprobó, como indica la sección anterior. No exponga el daemon Docker por TCP ni monte su socket en el puente para resolverlo.

Fuentes: [USB en WSL, Microsoft](https://learn.microsoft.com/en-us/windows/wsl/connect-usb), [dispositivos libfprint](https://fprint.freedesktop.org/supported-devices.html).

## Seguridad y biometría

- Todas las variables privadas provienen del `.env` raíz y se inyectan por servicio. No se copian a imágenes. API no recibe `sa` ni contraseña bootstrap; solo el inicializador temporal las recibe.
- El WebSocket publicado en `127.0.0.1:8080` valida token y Origin **antes** del upgrade. El token `VITE_BRIDGE_TOKEN` es público en el navegador: no sustituye al JWT administrador ni al ticket de enrolamiento de uso único y 120 segundos. Antes de iniciar captura de enrolamiento, el puente consulta `POST /device/enrollments/authorize`: firma JWT, consentimiento vigente, empleado activo, administrador vigente y ticket no consumido. Se vuelve a validar dentro de la transacción al guardar.
- La web solo recibe estado, errores e identidades firmadas. Las plantillas viajan por la red interna entre API y puente. Conservar el acceso al daemon Docker únicamente para administradores: estos pueden leer variables de contenedores.
- `FpPrint.serialize()` descarta la imagen. SQL conserva solamente la plantilla serializada cifrada con AES-GCM. Cada operación del lector ejecuta un proceso efímero sin archivos de plantilla; salir libera la memoria nativa. No se promete borrado criptográfico de todas las copias temporales de Python.
- `LIBFPRINT-v1` y `ANSI-FMD-XML` son formatos diferentes; las huellas DigitalPersona deben reenrolarse con el nuevo motor. El historial se conserva. La simulación está deshabilitada.
- Se compila libfprint 1.94.5 con una extensión pequeña de su comparador NBIS, umbral 40 del motor original. Una sola lectura se compara con **todas** las plantillas compatibles; dos coincidencias bloquean el marcaje. También se rechaza enrolar una huella que coincide con otro empleado. El umbral requiere evaluación con usuarios reales antes de una implantación: no constituye certificación biométrica.
- No se crea un usuario Linux por empleado ni se usa fprintd para almacenar huellas fuera de SQL.

Fuentes de API: [operaciones libfprint](https://fprint.freedesktop.org/libfprint-dev/FpDevice.html), [serialización sin imágenes](https://fprint.freedesktop.org/libfprint-dev/FpPrint.html).

## Pruebas reproducibles

```powershell
npm test
npm run test:integration
docker compose -f docker-compose.yml -f docker-compose.linux.yml exec -T biometric python3 -m unittest test_security test_matcher -v
docker compose -f docker-compose.yml -f docker-compose.linux.yml exec -T biometric python3 test_live.py
node scripts/check-hardware.cjs
```

Las pruebas de política/matching con comparadores controlados son pruebas unitarias, no captura física. `test_live.py` prueba transporte real y rechazo de token/origen, sin solicitar huellas. La prueba de hardware registra el estado real observado y no captura. Solo una prueba con USB abierto, dedo real, consentimiento, enrolamiento y posterior marcaje valida el camino completo.

## Licencias y coste

La vía biométrica usa libfprint LGPL-2.1-or-later. La imagen incluye las fuentes completas aplicadas y la extensión en `/usr/share/school-libfprint/`, para permitir inspección y reconstrucción. Consulte allí `COPYING`. No hay compra de SDK HID. Esto no significa software sin licencia: se deben respetar licencias libres y condiciones de SQL Server Express y Docker Desktop. SQL Express tiene límites de capacidad; revisar el motor para alta escala. Docker Engine en Linux evita depender del producto Docker Desktop.

## Parar y volver a la alternativa anterior

```powershell
docker compose -f docker-compose.yml -f docker-compose.linux.yml -f docker-compose.desktop.yml stop api web biometric
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

SQL queda ejecutándose y el volumen no se borra. La alternativa Windows seguirá mostrando SDK pendiente hasta instalar su SDK; el arranque Docker no lo necesita.

## Cambios funcionales de la instalación actual

El arranque con -Usb incorpora el supervisor de reconexión. La interfaz exige foto JPG/PNG <=2 MB al crear empleados, oculta el campo de código y permite sustituir fotos privadas al editar. Sharp se instala en la imagen API y recodifica sin metadatos; SQL cifra la foto, separada de la plantilla dactilar. Las migraciones employee-schedule y employee-photo son aplicadas por db-init sin borrar registros.

Los horarios por empleado permiten salidas 12:45/13:00 y entrada 06:45. El backend guarda el resultado del semáforo en cada marcaje. La interfaz diferencia llegada tarde, muy tarde, salida anticipada y evaluación neutral, y agrupa el historial por fecha dentro de cada página. Los resultados de enrolamiento permanecen visibles hasta reconocerlos. No se aplican sanciones automáticas.

Para el arranque habitual desde la raíz use:

~~~powershell
powershell -ExecutionPolicy Bypass -File '.\scripts\start-docker.ps1' -Usb
~~~

Actualización de arranque USB: start-docker.ps1 -Usb ejecuta enable-reader-usb.ps1 -PrepareOnly antes de compose up. Así se adjunta el lector a WSL y se crea el bus antes del montaje; evita invalid mount config /dev/bus/usb tras reiniciar. Sin lector conectado se detiene con un mensaje explícito antes de iniciar el puente; un dispositivo en Persisted no equivale a conectado.

## Sustituir el lector por otra unidad del mismo modelo

La selección se realiza por VID:PID 05ba:000a, no por número de serie ni puerto fijo. Se admite otra unidad U.are.U 4500 compatible, conectando una sola a la vez. Windows conserva la autorización por unidad: si la nueva aparece Not shared, ejecute en PowerShell administrador usbipd bind --hardware-id 05ba:000a. Después arranque start-docker.ps1 -Usb para adjuntarla y habilitar el montaje del contenedor. Marca/modelo visual no sustituye comprobar VID:PID. Cambiar de lector no garantiza compatibilidad de plantillas anteriores: verifique identificación real y reenrole si son incompatibles. No se borran huellas ni historial automáticamente.
