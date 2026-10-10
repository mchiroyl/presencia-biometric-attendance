> Documento de diseño/plan original conservado para trazabilidad. La implementación evolucionó: el stack activo es Docker/Linux con SQL Express y libfprint; el alcance actual incluye fotos personales obligatorias, códigos automáticos ocultos, horarios/semáforo, agrupación por fecha y supervisor USB. La prohibición de imágenes se refiere a **imágenes dactilares**, no a fotografías personales cifradas. Los detalles vigentes están en [manual técnico](../../MANUAL_TECNICO.md), [manual de usuario](../../MANUAL_USUARIO.md) y [cambios](../../CAMBIOS.md). No interpretar los pasos C#/SDK o simulación como requisitos del arranque actual.

# Diseño: asistencia biométrica escolar local
Fecha: 2026-10-10

## Objetivo y alcance
Construir en localhost una aplicación integrada con SQL Server en Docker, NestJS/TypeORM, React/Vite/Tailwind y un puente Windows C# con Fleck y HID DigitalPersona DPUruNet. Incluye administración de empleados, consentimiento, enrolamiento biométrico y alternancia IN/OUT. No incluye despliegue a nube.

## Organización
- backend/: módulos auth, admin, employees, biometrics, attendance, school-config y device; controladores con DTOs validados, servicios de aplicación, interfaces de repositorio e implementaciones TypeORM.
- frontend/: hooks/useBiometricDevice.js, features/kiosk/KioskScreen.jsx, features/admin/AdminPanel.jsx y cliente HTTP centralizado.
- bridge/: Program.cs, BiometricDeviceService.cs, WebSocketServerService.cs, configuración y adaptador del SDK.
- docker-compose.yml, archivos de entorno locales excluidos de Git y ejemplos sin credenciales operativas; README con comandos PowerShell y diagnóstico.

## Alternativas
1. Monolito modular local con repositorios y contratos explícitos: recomendado; permite transacciones y pruebas sin infraestructura distribuida.
2. Microservicios locales: añaden complejidad de autenticación, operación y consistencia sin aportar valor al alcance actual.
3. Simulación exclusiva del lector: útil para pruebas automatizadas, insuficiente para dar por validado el hardware real.
Se implementará la primera opción, con un adaptador de simulación explícito para pruebas y un adaptador real del SDK.

## Datos
AdminUser: UUID, correo único, hash de contraseña, estado y fechas.
SchoolConfig: nombre, zona horaria IANA (America/Guatemala por defecto) y configuración del centro.
Employee: UUID, código único, nombres, puesto, estado, consentimiento firmado y fecha de consentimiento. El consentimiento es obligatorio antes del enrolamiento.
Biometric: empleado, plantilla FMD cifrada, formato/versión SDK y fecha; nunca imagen de huella. Un hash criptográfico no sustituye un FMD para comparación biométrica.
Attendance: empleado, instante UTC, fecha escolar local, IN/OUT, identificador único de captura y dispositivo.
Las migraciones crean tablas, claves foráneas, índices y restricciones; synchronize permanece desactivado.

## Identificación y marcaje
DPUruNet extrae y compara FMD dentro del puente. El puente obtiene plantillas por un endpoint limitado a una credencial de dispositivo independiente del token WebSocket. React no recibe el catálogo de plantillas.
Una coincidencia produce una afirmación firmada con una clave exclusiva del puente/backend: empleado, captura UUID, dispositivo y timestamp. React reenvía esa afirmación a POST /attendance/mark. El backend verifica firma, caducidad, dispositivo, empleado activo y consentimiento. No confía en un employeeId enviado sin evidencia.
La alternancia diaria se calcula con la zona horaria escolar. La transacción serializa marcajes del mismo empleado; una captura repetida devuelve el resultado existente. Las capturas consecutivas dentro de un intervalo mínimo se rechazan para evitar IN/OUT accidental.
El enrolamiento requiere login administrador y autorización de un solo uso, vinculada al empleado. El puente envía el FMD al backend; el backend cifra el dato antes de persistirlo.

## Seguridad local
SQL Server, API, Vite y puente se publican únicamente en loopback. La contraseña sa sirve para inicialización; el backend utiliza un usuario SQL dedicado con privilegios de aplicación.
Fleck escucha ws://127.0.0.1:8080. En OnOpen valida token de query mediante comparación constante y Origin contra una lista exacta. Cierra conexiones inválidas antes de habilitar comandos/capturas. Nunca registra la URL completa ni el token. Mensajes limitados en tamaño y comandos permitidos explícitos.
VITE_BRIDGE_TOKEN es visible en el cliente y no constituye una identidad de usuario. La credencial de dispositivo, clave de firma, clave de cifrado y secreto JWT son independientes y no se exponen con prefijo VITE_.
Login con contraseñas derivadas mediante hash adaptativo, JWT de corta duración, límites de intentos y guardas backend. La pantalla protegida de React no sustituye las guardas del servidor. CORS usa orígenes exactos; DTOs rechazan campos ajenos y errores no exponen secretos.
No se conservan imágenes. Los buffers propios se limpian en finally; no se promete borrar copias internas administradas por el SDK, recolector de basura o sistema operativo.

## Interfaz
Kiosco en español con reloj, estado de lector/conexión y resultado accesible del marcaje. Reconexión con backoff y jitter; ninguna captura anterior se reproduce automáticamente. Panel administrativo con login, listado, altas/edición/bajas lógicas, consentimiento y enrolamiento. Estilo sobrio, responsive y estados vacíos/error/carga explícitos.

## Validación y límites
Pruebas del backend: autenticación, firmas inválidas/caducadas, consentimiento, alternancia, fecha local, idempotencia y concurrencia con SQL Server real.
Pruebas del puente: token/origen inválidos, límites de mensajes y limpieza de buffers propios; simulación etiquetada y deshabilitada por defecto.
Frontend: build y flujos de login, altas, conexión y marcaje con simulación explícita.
Prueba real requiere Docker Desktop activo, .NET SDK Windows, lector y SDK propietario DPUruNet compatible instalado por el usuario. No se dará por probado un componente si falta su dependencia. No se inventará un paquete NuGet para DPUruNet ni se distribuirá su DLL.

## Decisiones de implementación
Contratos versionados para capture/match/enrollment; transporte JSON sin imágenes; scripts de preparación que generan secretos locales y archivos de ejemplo; guía de arranque en el orden SQL Server, NestJS, puente C#, React.
La entrega final enlazará archivos reales con rutas absolutas y reportará verificaciones ejecutadas y pendientes.
