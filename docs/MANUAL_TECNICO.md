# Manual técnico — Presencia local

Estado vigente: 10 de octubre de 2026. Stack operativo: SQL Server Express 2022, NestJS/TypeORM, React/Vite, Nginx y Python/libfprint, en Docker. C#/.NET/Fleck/DPUruNet es una alternativa conservada que requiere SDK auténtico y no está activa.

## Arquitectura

Monolito modular: módulo → controlador → servicio → puerto de repositorio → adaptador TypeORM. Políticas de asistencia y criptografía independientes. SQL utiliza migraciones explícitas; synchronize=false.

~~~mermaid
flowchart LR
  R[React / Nginx :5173] -->|JWT administrador / evidencia HMAC| A[NestJS :3000]
  R -->|WebSocket token y Origin| B[Python / libfprint :8080]
  D[U.are.U 4500 USB] -->|Windows usbipd / WSL2| B
  B -->|Token privado de dispositivo| A
  A -->|Usuario SQL limitado| S[SQL Server Express :1433]
~~~

Los puertos publicados se limitan a loopback. Los servicios escuchan en sus interfaces internas dentro del contenedor. Solo el puente recibe el bus USB; no recibe el socket Docker. Se ejecuta sin privileged, con UID/GID 10001, capabilities retiradas y permisos USB 0660 limitados a 05ba:000a.

## Archivos principales

| Ruta | Función |
|---|---|
| docker-compose.yml + docker-compose.linux.yml | Servicios actuales y volumen SQL persistente |
| docker-compose.desktop.yml | Diagnóstico sin montaje USB |
| scripts/start-docker.ps1 | Build, migraciones, inicio y habilitación USB con -Usb |
| scripts/start-reader-autoattach.ps1 | Supervisor oculto: un lector autorizado, reevaluación de BUSID y Ubuntu activa |
| scripts/enable-reader-usb.ps1 | Regla udev, permisos y comprobación acotada de disponibilidad |
| backend/src/database | Entidades, inicialización y migraciones |
| backend/src/admin/employee-photo.ts | Validación y normalización segura de imágenes |
| backend/src/attendance/schedule-policy.ts | Clasificación del semáforo |
| frontend/src/features/admin | Formulario, enrolamiento y agrupación del historial |
| frontend/src/components/AttendanceTrafficLight.jsx | Presentación del semáforo |
| bridge-linux/device.py | Operación física en proceso efímero |
| bridge-linux/server.py | WebSocket, autorización, exclusión y coordinación con API |
| bridge-linux/matcher.py + match-extension.c | Comparación NBIS de todas las plantillas compatibles |

## Datos y migraciones

AdminUser guarda contraseña scrypt y versión de sesión. SchoolConfig define nombre y zona IANA. Employee conserva código único inmutable, datos personales, consentimiento textual, scheduledExit, hasPhoto y encryptedPhoto. Biometric guarda una plantilla cifrada por empleado. Attendance conserva captura única, secuencia, IN/OUT, modo, fecha escolar y snapshots de salida, color y minutos. EnrollmentTicket guarda hash, administrador/versión, expiración y consumo.

Migraciones: inicial, secuencia de marcajes, código automático, horarios y fotografías. EmployeeCode usa una secuencia SQL y trigger inmutable; admite huecos y conserva códigos antiguos. EmployeeSchedule añade salida permitida 12:45/13:00 y evaluación nullable. EmployeePhoto añade foto cifrada y hasPhoto=false para empleados existentes.

Crear exige foto. Editar permite cambiarla, pero no admite eliminarla enviando null. El campo código no existe en el formulario y la API rechaza modificaciones. Desactivar o revocar consentimiento elimina huella y tickets, conservando historial; la foto permanece en el registro desactivado.

## Fotografías

JPG/PNG hasta 2 MB mediante photoDataUrl; JSON máximo 3 MB. Sharp limita entrada a 20 millones de píxeles, rechaza formatos no admitidos e imágenes múltiples y recodifica a JPEG de hasta 800x1000 manteniendo proporción. Elimina EXIF/GPS y metadatos. No verifica identidad ni encuadre corporal.

La columna encryptedPhoto usa AES-256-GCM con la clave privada existente y select:false. El listado devuelve hasPhoto, nunca bytes ni contenido cifrado. GET /admin/employees/:id/photo exige administrador y no-store. No hay archivos públicos. El formulario solo reenvía foto al seleccionar una nueva, evitando recomprimirla en cada edición.

## Seguridad

Única fuente local: .env raíz privado, ignorado por Git y excluido del contexto Docker; ACL Windows usuario actual/SYSTEM. El archivo no es una bóveda cifrada. API recibe solo credenciales limitadas; sa y bootstrap se destinan al inicializador. VITE_* son públicos en el bundle. Cambiar bootstrap no reemplaza contraseñas existentes; cambiar claves de cifrado puede impedir recuperar datos.

El puente Linux rechaza token/origen antes del upgrade WebSocket. React exige ready antes de enviar comandos. El token del navegador no autoriza enrolamientos: se exige ticket administrativo de uso único y 120 segundos, validado antes de la captura y nuevamente al guardar. La guarda del dispositivo exige X-Device-Token y rechaza Origin de navegador en rutas privadas.

La captura genera evidencia HMAC-SHA256 con dispositivo, empleado, UUID de captura, timestamp y modo. API valida firma/antigüedad, modo, consentimiento y huella vigente. La transacción SERIALIZABLE bloquea al empleado, aplica intervalo mínimo, alterna IN/OUT e impide reutilizar captureId para otra identidad. Un reintento válido devuelve el mismo marcaje.

No se almacenan imágenes dactilares. libfprint serializa plantillas sin imagen y SQL las cifra con AES-GCM. Fotografías personales son un dato diferente. Cada operación física usa un proceso efímero y no crea archivos con plantillas. No se promete borrado criptográfico de todas las copias temporales en memoria.

## Políticas y presentación

El servidor calcula fecha y minutos locales con SchoolConfig.timeZone. Entrada: verde <=06:45, amarillo hasta 07:10, rojo desde 07:11, incluyendo todo el segundo final de cada minuto. Salida: amarillo antes de scheduledExit, verde después o igual. Sin asignación devuelve evaluación null. Cada IN se evalúa; no hay política adicional de reingresos, vacaciones o sanciones.

El horario y resultado se guardan en el marcaje. Editar Employee no altera evaluaciones anteriores. El historial agrupa schoolDate en la página actual; la API pagina registros y un día puede abarcar varias páginas. El filtro de fecha sigue disponible. El CSV actual exporta la página y no incluye todavía el semáforo.

Enrolamiento muestra autorización/instrucciones y resultado persistente. CAPTURE_TIMEOUT diferencia tiempo agotado de CAPTURE_FAILED. Si no llega confirmación, se consulta el listado antes de repetir; no se asegura fallo de persistencia solo por perder la respuesta.

## USB, matching y operación

Consulte [Docker/Linux](DOCKER_LINUX.md) y [hardware](HARDWARE.md). El supervisor solo adjunta un lector ya compartido por bind; ante múltiples lectores no elige arbitrariamente. Usa el hardware actual y mantiene Ubuntu viva. Un cambio de identidad USB puede requerir otro bind administrativo. Dura la sesión Windows; iniciar nuevamente con -Usb después de reiniciar.

libfprint 1.94.5 se compila con driver uru4000 y extensión NBIS de umbral 40. Se compara la captura contra todas las plantillas compatibles; múltiples coincidencias o huella de otro empleado se rechazan. LIBFPRINT-v1 difiere de ANSI-FMD-XML: una migración entre motores requiere reenrolamiento. Código fuente/licencia de libfprint se incluyen en la imagen.

No se requiere comprar el SDK HID para esta variante; siguen aplicando las licencias de cada componente y los términos de Docker Desktop/SQL Server. No se garantiza ausencia de toda licencia ni certificación biométrica. Antes de implantación, validar capturas reales, reconexión física y tasas de error con usuarios autorizados.

## Verificación y límites

Última batería documentada: 26 unitarias backend, 19 frontend y 23 integración SQL/API, 68 en total. Consulte [PRUEBAS](PRUEBAS.md) para evidencia histórica y comandos. La disponibilidad del lector y el transporte real se comprobaron sin capturar un dedo. El usuario ha mostrado marcajes Hardware, pero eso no sustituye una validación técnica supervisada de enrolamiento/identificación y LED.

Apagar con compose stop conserva SQL. No utilizar down -v. No reemplazar .env para corregir errores. No ejecutar simultáneamente el puente C# y Linux en 8080. Mantener copias de seguridad SQL y de las claves privadas con acceso restringido.
