# Presencia — Control de asistencia biométrico escolar local

[![CI](https://github.com/mchiroyl/presencia-biometric-attendance/actions/workflows/ci.yml/badge.svg)](https://github.com/mchiroyl/presencia-biometric-attendance/actions/workflows/ci.yml)

## Integración continua

GitHub Actions ejecuta `.github/workflows/ci.yml` en cada push, pull request hacia `main` y ejecución manual. Comprueba las pruebas unitarias del backend y frontend, la compilación y la autorización del puente Python. Un segundo trabajo levanta SQL Server Express temporal, aplica las migraciones y ejecuta las pruebas de integración de la API y la base de datos.

El CI genera un `.env` desechable con secretos aleatorios. La contraseña SQL publicada en el workflow corresponde exclusivamente al contenedor temporal de pruebas; nunca se debe usar en una instalación real. No requiere secretos de GitHub ni acceso a datos locales. Las pruebas de integración utilizan datos sintéticos y simulación de prueba, sin cambiar la configuración de producción. El workflow no valida capturas físicas, LED, reconexión USB ni enrolamiento con una persona real; estas comprobaciones se realizan localmente según `docs/HARDWARE.md` y `docs/PRUEBAS.md`.

El token de Actions tiene únicamente permiso de lectura, las acciones están fijadas a un commit y las credenciales de checkout no se conservan. El workflow no despliega ni publica archivos de configuración, datos o respaldos.

Estado actualizado: 10 de octubre de 2026. La instalación actual ejecuta SQL Server Express, NestJS/TypeORM, React compilado servido por Nginx y el puente Python/libfprint en Docker. El puente C# permanece como alternativa histórica; no interviene en este arranque. El sistema de producción utiliza el lector real y mantiene la simulación deshabilitada.

## Arranque en esta computadora

Mantenga Docker Desktop abierto. En PowerShell ejecute, en este orden:

~~~powershell
Set-Location -LiteralPath 'D:\UMG\SEMINARIO DE TECNOLGIAS\proyecto_eddy\Sistema de Control de Asistencia Biométrico Escolar'
powershell -ExecutionPolicy Bypass -File '.\scripts\start-docker.ps1' -Usb
~~~

Abra [Presencia](http://localhost:5173). Salud de API: [localhost:3000/health](http://localhost:3000/health). WebSocket: ws://127.0.0.1:8080. El script compila, inicia los servicios, aplica migraciones y activa el supervisor de reconexión USB. Consulte [preparación del lector](docs/HARDWARE.md) antes del primer arranque en una computadora nueva.

Sin -Usb se inicia el diagnóstico Docker sin acceso al lector. Este modo bloquea capturas y no simula hardware. No ejecute scripts desde C:\Windows\system32 usando rutas relativas al proyecto.

## Primera instalación después de clonar desde GitHub

Estos pasos son para una instalación nueva en Windows desde el repositorio oficial de Presencia.

### 1. Instalar y comprobar requisitos

Instale Git, Node.js >=22.12 y Docker Desktop con motor WSL2 y contenedores Linux. Abra Docker Desktop y espere a que el motor esté disponible. No necesita instalar SQL Server, NestJS o el SDK HID por separado: los servicios se construyen en Docker.

~~~powershell
git --version
node --version
npm --version
docker version
docker compose version
~~~

Para lectura física necesita Ubuntu en WSL2 y usbipd-win. En PowerShell administrador, si todavía no tiene Ubuntu:

~~~powershell
wsl --install -d Ubuntu
~~~

Si Windows solicita reiniciar, hágalo antes de continuar. Abra Ubuntu y complete la creación del usuario Linux. Compruebe que Ubuntu figure con VERSION 2 en:

~~~powershell
wsl --list --verbose
wsl -d Ubuntu -- uname -r
~~~

La instalación actual de los scripts espera una distribución llamada Ubuntu. Si usa otra distribución debe adaptar los scripts; no basta con cambiar el nombre de una carpeta. Preparación de las utilidades que usa el script:

~~~powershell
wsl -d Ubuntu -u root -- apt-get update
wsl -d Ubuntu -u root -- apt-get install -y python3 udev
~~~

### 2. Clonar e instalar dependencias de preparación

En una terminal normal, clone en su carpeta de usuario y entre al proyecto:

~~~powershell
Set-Location -LiteralPath $env:USERPROFILE
git clone "https://github.com/mchiroyl/presencia-biometric-attendance.git" presencia
Set-Location -LiteralPath '.\presencia'
npm ci
npm run setup
~~~

npm run setup crea un único .env privado con contraseñas y claves aleatorias; no imprime sus valores. No copie .env.example como configuración operativa: contiene marcadores sin secretos válidos. No suba .env, fotografías o volcados SQL a GitHub.

Si setup informa Configuración local existente, ya tiene archivos privados de una instalación: no los borre ni regenere para continuar. El script protege la configuración y las claves de cifrado. En esta computadora ya existe .env y no debe ejecutarse setup otra vez.

### 3. Elegir arranque con o sin lector

**Sin lector:** puede entrar a Administración y consultar registros. Desde la raíz del clon:

~~~powershell
powershell -ExecutionPolicy Bypass -File '.\scripts\start-docker.ps1'
~~~

La captura estará bloqueada, sin simulación. Conectar luego el lector no añade por sí solo el montaje USB a este contenedor: debe preparar la autorización y ejecutar el arranque con -Usb.

**Con lector real:** conecte una sola unidad U.are.U 4500 (05ba:000a). En PowerShell administrador instale USB/IP y autorice la unidad conectada:

~~~powershell
winget install --interactive --exact dorssel.usbipd-win
& 'C:\Program Files\usbipd-win\usbipd.exe' list
& 'C:\Program Files\usbipd-win\usbipd.exe' bind --hardware-id 05ba:000a
~~~

La instalación de usbipd-win se realiza una vez. Si ya está instalado, omita winget. Una unidad nueva puede requerir otro bind aunque sea de la misma marca/modelo. La ruta absoluta evita el error de PATH en una terminal abierta antes de instalar. No comparta la cámara ni otros dispositivos.

Desde la raíz del clon, en PowerShell normal:

~~~powershell
powershell -ExecutionPolicy Bypass -File '.\scripts\start-docker.ps1' -Usb
~~~

El comando construye las imágenes, prepara USB/IP y permisos antes del montaje, inicializa SQL y aplica migraciones, levanta web/API/puente y comprueba disponibilidad real. El primer build descarga dependencias y tarda más; necesita Internet y espacio disponible. No elimina la base ni reemplaza las cuentas existentes.

### 4. Abrir e ingresar

Abra [http://localhost:5173](http://localhost:5173). Abra el .env raíz con su editor local para consultar BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD. No los publique en capturas. Tras cambiar la contraseña desde Administración use la nueva: editar bootstrap no cambia cuentas ya almacenadas en SQL.

Resultado esperado: web, API, SQL y puente Healthy; db-init Exited es normal porque finalizó la inicialización. Para captura, además debe mostrarse Lector conectado y disponible. Healthy por sí solo no acredita lector ni captura.

### 5. Arranques posteriores con un solo comando

Mantenga Docker Desktop abierto. Desde cualquier carpeta, use la ruta absoluta del clon; por ejemplo si clonó en su carpeta de usuario:

~~~powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\presencia\scripts\start-docker.ps1" -Usb
~~~

El lector debe estar conectado y autorizado para -Usb. Quite -Usb para iniciar sin hardware. Después de reiniciar Windows, ejecute otra vez el arranque; el supervisor USB no está instalado como tarea automática de inicio de sesión.

## Errores que aparecieron y solución

| Mensaje o estado | Causa comprobada | Acción |
|---|---|---|
| El argumento scripts/start-docker.ps1 no existe | Terminal situada en system32, fuera del proyecto | Entrar al clon o utilizar ruta absoluta del script |
| usbipd no se reconoce | La terminal conserva el PATH anterior a instalar | Abrir otra terminal o usar la ruta completa de usbipd.exe |
| invalid mount config: /dev/bus/usb no existe | Se intentó iniciar el puente antes de adjuntar USB a WSL | Usar el script actualizado con -Usb, que prepara el bus antes de compose up |
| Lector no conectado y registro Persisted | Windows conserva autorización pero no ve una unidad físicamente conectada | Reconectar cable/puerto y verificar la sección Connected de list |
| Not shared con lector nuevo | Windows no ha autorizado esa unidad | Ejecutar bind --hardware-id 05ba:000a como administrador y volver a iniciar con -Usb |
| Lector no conectado tras iniciar sin -Usb | Contenedor de diagnóstico sin montaje USB | Preparar lector y volver a ejecutar con -Usb |
| Shared después de desconectar/reconectar | Se perdió el cliente USB/IP | Supervisor de reconexión activo; comprobar Attached y apertura libfprint |
| db-init Exited | Terminó la tarea temporal de inicialización | Estado normal, no reiniciarlo repetidamente para corregir una falla del lector |
| ReconexiÃ³n o â€” en consola | Codificación de caracteres en Windows PowerShell | No representa fallo USB; comprobar estados y resultado final |

La causa del montaje y el cambio de unidad se detallan en [Hardware: errores resueltos](docs/HARDWARE.md#errores-observados-y-resueltos). No habilite privileged ni quite restricciones de acceso para resolverlos. No ejecute compose up manualmente con montaje USB antes de preparar el bus. El sistema admite otras unidades compatibles 05ba:000a sin fijar número de serie ni puerto; deja de seleccionar si hay múltiples lectores.

## Funcionalidades actuales

- Registro y edición de empleados; código EMP automático, único e inmutable, oculto en el formulario y visible en el directorio.
- Foto de medio cuerpo obligatoria para nuevas altas: JPG/PNG hasta 2 MB, vista previa, reemplazo al editar y almacenamiento cifrado. Los empleados antiguos se conservan aunque carezcan de foto.
- Consentimiento textual, enrolamiento con ticket administrativo y confirmación persistente de éxito o error. No se almacenan imágenes dactilares.
- Horario por empleado: entrada 06:45 y salida 12:45 o 13:00. Semáforo con motivo y minutos; sin horario aplicado, evaluación neutral.
- Historial agrupado por fecha escolar dentro de cada página, filtro de fecha y exportación de la página.
- Marcajes IN/OUT alternados, firma del dispositivo, protección contra repetición y conservación del historial.
- Disponibilidad USB real y reconexión a WSL sin imponer un puerto físico. No se aplican sanciones automáticas.

## Documentación

- [Manual de usuario](docs/MANUAL_USUARIO.md)
- [Manual técnico](docs/MANUAL_TECNICO.md)
- [Preparación y diagnóstico hardware](docs/HARDWARE.md)
- [Docker/Linux](docs/DOCKER_LINUX.md)
- [Pruebas y límites comprobados](docs/PRUEBAS.md)
- [Prueba de reconexión](docs/PRUEBA_RECONEXION_USB.md)
- [Cambios consolidados](docs/CAMBIOS.md)

## Pruebas y apagado

~~~powershell
npm run build
npm test
npm run test:integration
node scripts/check-docker.cjs
node scripts/check-hardware.cjs
docker compose -f docker-compose.yml -f docker-compose.linux.yml stop
~~~

Las pruebas de integración crean empleados de prueba y marcajes identificados como simulación en su proceso de pruebas; no activan simulación en la API de producción. Algunos datos de prueba desactivados quedan en el historial y no representan asistencia real. No use down -v: elimina el volumen SQL. El supervisor USB permanece activo durante la sesión de Windows; vuelva a ejecutar el arranque con -Usb después de reiniciar.
