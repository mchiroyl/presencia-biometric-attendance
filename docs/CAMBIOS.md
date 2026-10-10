# Cambios consolidados — 10 de octubre de 2026

Este registro reúne las modificaciones de la sesión. [README](../README.md), [manual de usuario](MANUAL_USUARIO.md), [manual técnico](MANUAL_TECNICO.md), [Docker](DOCKER_LINUX.md), [hardware](HARDWARE.md) y [pruebas](PRUEBAS.md) describen el estado operativo.

| Cambio | Comportamiento actual |
|---|---|
| Contenedores Linux | SQL Express, API NestJS, React/Nginx y puente libfprint; C# queda como alternativa |
| USB real | Apertura libfprint requerida para disponible; sin lectores simulados en producción |
| Reconexión | Supervisor Windows para un lector previamente autorizado 05ba:000a, reevaluación de BUSID y permisos udev |
| Credenciales | Único .env raíz privado; sin local-access.json ni copias de secretos en frontend/imagen |
| Código | Secuencia SQL, EMP automático e inmutable; oculto en formulario y visible en directorio |
| Consentimiento | Nombre del firmante, fecha y versión; revocación borra huella/tickets |
| Enrolamiento | Cuadro visible con instrucciones, confirmación persistente y errores/timeout |
| Horarios | Entrada 06:45, salida por empleado 12:45/13:00, asignación opcional |
| Semáforo | Verde hasta 06:45, amarillo hasta 07:10, rojo desde 07:11; salida anticipada amarilla |
| Evaluación histórica | Salida, color y minutos guardados en cada marcaje; edición no recalcula anteriores |
| Presentación | Columna propia, colores claros, motivo y minutos; sin evaluación en gris |
| Agrupación | Encabezados por fecha escolar dentro de cada página, últimos marcajes primero |
| Foto | Obligatoria en nuevas altas, JPG/PNG <=2 MB, vista previa y reemplazo al editar |
| Privacidad de foto | Validación/recodificación, eliminación de metadatos, AES-GCM y consulta solo administrativa |
| Pruebas | Último conjunto: 26 backend +19 frontend +23 SQL/API =68 aprobadas |
| Documentación | Arranque actual unificado; diseños originales marcados históricos |

## Decisiones y límites

La exigencia de foto obligatoria reemplaza la selección previa de opcional. Los empleados anteriores se conservan sin foto; pueden añadirla al editar. La foto se conserva al desactivar; la plantilla dactilar se elimina. No se verifica identidad/encuadre mediante inteligencia artificial ni se utiliza reconocimiento facial.

Resolución del semáforo: minuto completo; 06:45:59 es verde y 07:10:59 amarillo. Cada IN se evalúa con horario diario. El sistema no calcula sanciones, ausencias, feriados o permisos automáticamente. El CSV actual exporta registros visibles sin semáforo. Un día puede continuar en otra página.

La recuperación automática fue comprobada interrumpiendo USB/IP del dispositivo real; no equivale a desenchufar el cable. No se certificaron físicamente los LED ni un ciclo supervisado completo de capturas en la última batería. Los resultados históricos de simulación no son asistencia real.

No se compra DPUruNet para el puente Linux; esto no elimina las licencias aplicables a SQL Server, Docker Desktop o componentes libres. No se alteraron datos ni secretos durante esta actualización documental.

Actualización de arranque USB: start-docker.ps1 -Usb ejecuta enable-reader-usb.ps1 -PrepareOnly antes de compose up. Así se adjunta el lector a WSL y se crea el bus antes del montaje; evita invalid mount config /dev/bus/usb tras reiniciar. Sin lector conectado se detiene con un mensaje explícito antes de iniciar el puente; un dispositivo en Persisted no equivale a conectado.

## Sustituir el lector por otra unidad del mismo modelo

La selección se realiza por VID:PID 05ba:000a, no por número de serie ni puerto fijo. Se admite otra unidad U.are.U 4500 compatible, conectando una sola a la vez. Windows conserva la autorización por unidad: si la nueva aparece Not shared, ejecute en PowerShell administrador usbipd bind --hardware-id 05ba:000a. Después arranque start-docker.ps1 -Usb para adjuntarla y habilitar el montaje del contenedor. Marca/modelo visual no sustituye comprobar VID:PID. Cambiar de lector no garantiza compatibilidad de plantillas anteriores: verifique identificación real y reenrole si son incompatibles. No se borran huellas ni historial automáticamente.

## Instalación después de clonar y resolución de errores

README actualizado con requisitos, git clone de URL sustituible, npm ci, generación segura de .env, preparación WSL/Ubuntu, autorización USB, arranque con/sin lector, acceso inicial y comando absoluto posterior. HARDWARE centraliza las causas de ruta relativa, PATH, bus USB ausente, autorización Persisted/Not shared y montaje ausente. Confirmada disponibilidad de la nueva unidad tras bind; historial y secretos conservados.
