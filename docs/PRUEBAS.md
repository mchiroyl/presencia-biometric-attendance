> Estado vigente al 10/10/2026: la instalación principal es Docker/Linux con SQL Express, NestJS, React/Nginx y libfprint. El puente C# y los resultados de simulación corresponden a alternativas o pruebas históricas. Foto personal obligatoria en nuevas altas, código oculto/automático, horarios y semáforo, historial por fecha y reconexión USB están implementados. Véase [cambios consolidados](CAMBIOS.md) y los manuales actuales.

# Estado actual de las pruebas — 10/10/2026

Última batería registrada: **68 pruebas aprobadas** (26 unitarias backend, 19 frontend y 23 SQL/API). Los totales anteriores se conservan como evidencia de etapas previas; no se suman para afirmar cobertura física. En la última actualización documental no se repitieron pruebas de código porque solo cambiaron archivos Markdown.

Comprobación final de Docker: API/base conectadas, login operativo, secretos privados ausentes del bundle, lector real disponible y simulación de producción deshabilitada. Navegador: foto obligatoria con vista previa, campo código oculto; no se guardó una fotografía de persona durante esa comprobación. Evidencias: employee-photo-form.png, semaforo-legible.png y hardware-live.json en evidence/.

Los tests de integración usan imágenes sintéticas y marcajes de modo simulation exclusivamente en su proceso de pruebas; pueden dejar historial y empleados desactivados. Nunca constituyen evidencia de asistencia ni captura física. Pendiente una validación técnica supervisada del ciclo completo con dedo real, consentimiento y reconexión física.

## Registro histórico y detalle por cambio

# Reporte de pruebas — versión local

Fecha de ejecución: 10 de octubre de 2026, zona America/Guatemala. Evidencia funcional contra SQL Server real en Docker y puente C# real con adaptador de simulación explícito exclusivamente para el flujo automatizado de captura. Actualización: Windows detecta un lector U.are.U 4500 con driver WBF 5.0.0.5 sin errores. Falta la DLL licenciada DPUruNet; no se ha validado captura física. El arranque habitual y la detección USB funcionan sin simulación; véase [HARDWARE.md](HARDWARE.md).

## Entorno y reproducción

- Windows x64; Node.js 24.19.0; npm 11.17.0.
- Docker Engine 29.8.1; SQL Server 2022 Developer, publicación 127.0.0.1:1433, volumen persistente.
- .NET SDK 8.0.425 local en `.tools/dotnet`; Fleck 1.2.0.
- Dependencias exactas: [inventario](evidence/dependencies.json) y `package-lock.json`.
- Pruebas de navegador: Chromium de Playwright, desktop 1280×720 y mobile 390×844.

Detenga procesos en 3000, 5173 y 8080; ejecute desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-local.ps1 -SkipInstall
```

El script conserva logs de build, SQL, suites y procesos en `docs/evidence/`. Arranca simulación únicamente en los procesos que crea y los termina en `finally`; no cambia el valor `ALLOW_SIMULATION=false` de la configuración persistente.

## Resultados ejecutados

| Validación | Resultado | Evidencia |
|---|---|---|
| Docker SQL | Healthy, loopback 1433 | `evidence/compose.txt` |
| Migraciones / bootstrap | Base y usuario limitado inicializados; repetición sin pérdida | `evidence/db-init.txt` |
| Build backend y frontend | Sin errores de compilación | `evidence/build.txt` |
| Backend unitarias | 13/13 | `evidence/unit.txt` |
| Frontend unitarias | 12/12 | `evidence/unit.txt` |
| API + SQL Server real | 22/22 | `evidence/integration.txt` |
| Puente C# | 17/17, incluyendo conexión Fleck real, disponibilidad y lectura de .env | `evidence/bridge-tests.txt`, `evidence/bridge.trx` |
| Navegador + cuatro servicios | 2/2 | `evidence/e2e.txt`, reporte `playwright-report/` |
| Dependencias NuGet del puente | Sin vulnerabilidades reportadas por fuente NuGet consultada | Comando `dotnet list bridge/SchoolBridge.csproj package --vulnerable --include-transitive` |
| Dependencias npm | 5 alertas moderadas en cadena SQL; 0 altas/críticas en consulta final | `evidence/npm-audit.json` |
| Captura DigitalPersona real | **Pendiente** | Requiere DLL/driver/lector |

Total de pruebas automatizadas funcionales: **66**. No se cuenta un build como prueba ni un componente simulado como hardware validado. Las suites documentan comportamientos, no porcentajes de cobertura inexistentes.

## Casos de backend

Unitarias: primer marcaje IN, IN→OUT, OUT→IN, fecha de Guatemala antes de medianoche UTC, cambio a medianoche escolar, nonce AES-GCM no determinista, privacidad del texto, clave de descifrado incorrecta, firma interoperable, firma vigente, empleado modificado, evidencia caducada, evidencia futura y firma malformada.

Integración con SQL real:

1. Administración sin JWT → 401.
2. Contraseña incorrecta → 401.
3. Propiedades no permitidas en alta → 400.
4. Alta con consentimiento → fecha de firma presente, sin biometría.
5. Código suministrado por el cliente al crear → 400; el servidor asigna automáticamente `EMP-` y número.
6. Un JWT administrativo no accede al catálogo de plantillas → 401.
7. Enrolamiento con ticket → 201; reutilización → 409; listado administrativo sin FMD.
8. FMD persistido cifrado, sin texto simulado; usuario SQL con DML y sin CREATE TABLE.
9. Simulación deshabilitada → 403.
10. Firma falsa → 401.
11. Evidencia de más de 60 segundos → 401.
12. Primera entrada, reintento con mismo UUID retorna mismo registro, siguiente captura produce salida.
13. Dos capturas concurrentes quedan serializadas y producen IN/OUT, sin doble entrada.
14. Intervalo mínimo de 30 segundos → 409.
15. Historial contiene solo los cuatro registros confirmados de esa prueba.
16. Cambio de contraseña invalida JWT anterior; desactivar cuenta invalida la nueva sesión.
17. Retirada de consentimiento elimina plantilla; marcaje y ticket nuevos → 403.
18. Origen CORS ajeno no recibe autorización de lectura en navegador.
19. Cambio inicial de zona horaria concurrente con el primer marcaje: la fecha guardada coincide con la configuración finalmente confirmada. Esta prueba crea y elimina exclusivamente una base temporal propia, con bloqueo SQL real para reproducir la carrera.
20. Intento de cambiar código por API → 400; editar el puesto conserva el código.
21. Ocho altas simultáneas → ocho códigos distintos; empleados de prueba desactivados al terminar.
22. UPDATE directo del código en SQL → error del trigger; el valor original se conserva.

La suite pone el intervalo en cero únicamente en su instancia de prueba para comprobar alternancia/concurrencia rápida, y lo restaura a 30 para probar antirrebote. Esto no modifica el entorno ni el comportamiento por defecto de la API del usuario.

## Casos de puente y frontend

Configuración central: dos pruebas adicionales C# verifican valores entre comillas, caracteres literales sin ejecución/expansión, claves duplicadas y comillas incompletas. La suite integrada completa utiliza únicamente `.env` raíz. `node scripts/check-client-env.mjs` comprobó que siete valores privados no aparecen en el JavaScript del frontend, que la configuración pública VITE sí se carga y que las copias antiguas fueron retiradas; evidencia en `evidence/environment-check.json`. La ACL verificada contiene solamente el usuario de instalación y SYSTEM, sin herencia. El `.env` sigue siendo texto plano, no una bóveda cifrada.

Código automático: dos regresiones de formulario comprueban campo de solo lectura tanto en alta como en edición, y ausencia de `code` en el payload. El flujo de navegador obtiene el código generado en la respuesta del alta y modifica el puesto conservándolo. Los códigos históricos quedan intactos y la migración se volvió a ejecutar sin pérdida de datos.

Actualización de hardware (10 casos adicionales): seis combinaciones de presencia, driver, SDK, apertura y múltiples lectores; un escenario WebSocket real con adaptador controlado que verifica desconectado → SDK pendiente → disponible → desconectado, notificaciones entre dos clientes y rechazo de captura no disponible; tres pruebas React que distinguen autorización de disponibilidad, bloquean scan/enroll sin lector operativo, rechazan estados contradictorios y descartan el cierre tardío de una conexión anterior. Estas transiciones controladas no sustituyen el ensayo físico de desconexión USB. Las pruebas nuevas reprodujeron ausencia del contrato y cierre tardío antes de sus correcciones; pasan después del cambio.

C#: token codificado correctamente + origen exacto válido; token falso, faltante, origen ajeno, origen faltante y token duplicado rechazados; HMAC con el mismo formato backend; conexión real ClientWebSocket/Fleck que acepta ready autorizado, rechaza token/origen y comando desconocido, y cierra mensajes sobredimensionados. Un cierre TCP inmediato de Fleck se registra como rechazo válido solamente si no entrega un mensaje autorizado.

React: respuesta ready/error validada; protocolo malformado rechazado; token con caracteres especiales codificado; autorización mediante ready y cleanup; reconexión sin reproducción de capturas; JSON inválido ignorado; formulario con control de actividad y desactivación explícita dentro del diálogo.

Navegador end-to-end: login, alta de empleado con consentimiento, enrolamiento a través del puente C# real en simulación, retorno al kiosco, evidencia HMAC enviada a NestJS, entrada confirmada en SQL, rechazo de segundo marcaje inmediato, vista móvil sin desbordamiento horizontal y token WebSocket incorrecto rechazado sin ready.

## Evidencia visual

### Verificación real sin simulación

`node scripts/check-hardware.cjs` se ejecutó después del arranque normal. La API informó `simulation=false` y SQL conectado; el puente informó `mode=hardware`, `state=sdk-required`, `available=false`. La interfaz no muestra simulación, bloquea el botón de lectura y no presenta desbordamiento horizontal en 390 px. Este diagnóstico no envía comandos de captura ni solicita huellas. Evidencia: [hardware-live.json](evidence/hardware-live.json).

![Detección real y SDK pendiente](evidence/hardware-desktop.png)

Las capturas de las secciones siguientes corresponden exclusivamente al ensayo end-to-end en simulación, identificado en pantalla; no representan el arranque normal.

### Kiosco desktop

![Kiosco](evidence/kiosk-desktop.png)

### Administración

![Directorio](evidence/admin-desktop.png)

### Kiosco móvil

![Móvil](evidence/kiosk-mobile.png)

Las personas de estas capturas son registros sintéticos de pruebas, no datos de empleados reales. Las suites desactivan empleados de prueba y retiran plantillas. Los marcajes y cuentas desactivadas permanecen para trazabilidad.

## Fallos encontrados y resueltos

- Las primeras pruebas detectaron las políticas y criptografía aún sin implementar; se verificó la fase roja antes de completarlas.
- Compilación TypeScript: opciones SQL estaban tipadas con una unión de todos los drivers; se restringieron a `SqlServerConnectionOptions`.
- Inicialización NestJS: `AdminGuard` necesitaba el repositorio de autenticación exportado para su resolución en otros módulos. Se corrigió la exportación y se ejecutó integración completa.
- El formulario no tenía control de reactivación y su acción de desactivar estaba fuera del diálogo. Se añadió control activo y acción dentro del modal; prueba de regresión pasa.
- El teardown inicial del navegador enviaba un campo de nota al login. La validación estricta lo rechazaba: se corrigió el payload de prueba a email/password y se verificó el ciclo completo.
- El cliente .NET asumía que todo rechazo Fleck terminaba con handshake de cierre. Se amplió la prueba para reconocer el cierre TCP inmediato sin ready; un cierre por timeout no cuenta como éxito.
- Se estableció un orden monotónico SQL `sequence` para evitar ambigüedad entre marcajes con timestamps iguales.
- Se corrigió el retorno al inicio al cambiar entre kiosco y administración y se capturaron las pantallas desde scroll cero.
- Se actualizó Vitest a una versión que retiró las alertas críticas/moderadas de su ejecutor presentes en la instalación inicial.
- La revisión detectó que cambiar de pestaña podía renderizar filas del listado anterior con otro esquema. Una prueba reprodujo el error; cada resultado ahora se vincula a sesión, pestaña y filtros, y se descartan respuestas obsoletas. La regresión de navegación pasa.
- La revisión detectó una carrera entre cambiar la zona inicial y registrar la primera asistencia. La prueba SQL reprodujo una fecha inconsistente. La configuración ahora toma un bloqueo exclusivo dentro de la transacción; el marcaje toma un bloqueo compartido. La regresión concurrente pasa.
- La repetición end-to-end detectó una búsqueda iniciada mientras terminaba el alta de empleado. La actualización posterior al guardado ahora utiliza la consulta vigente y una llamada obsoleta no invalida solicitudes nuevas. Se repitió la validación completa: 49 pruebas aprobadas.

## Dependencia pendiente y límites

La revisión independiente del cambio de hardware identificó y se corrigieron tres casos: publicar cambios a todos los clientes incluso si se detectan al solicitar captura; ignorar cierres tardíos de sockets anteriores; mantener el diagnóstico real sin comandos de captura. Las regresiones de cliente y notificación están incluidas en las 64 pruebas. La revisión posterior confirmó las correcciones por inspección, sin afirmar validación física del SDK. Una revisión independiente adicional del código automático no encontró hallazgos importantes de migración, concurrencia o inmutabilidad.

`npm audit` informa una vulnerabilidad moderada de `sprintf-js` propagada por `tedious → mssql → typeorm → @nestjs/typeorm`: precisión de formato no acotada con posible agotamiento de recursos. No se afirma que el proyecto esté libre de vulnerabilidades. No se ejecutó `audit fix --force`, que proponía retroceder a drivers/ORM incompatibles. La aplicación no permite formatos de sprintf suministrados por usuarios ni SQL arbitrario; esa reducción de exposición no elimina la alerta. Se requiere una corrección compatible del upstream y repetir las pruebas al actualizar. El informe completo identifica el advisory y rangos.

El SDK propietario está condicionado por compilación; la build validada **no** compila la rama DIGITALPERSONA_SDK. Faltan: compatibilidad exacta de DPUruNet con runtime/arquitectura, extracción FMD física, repetición de enrolamiento, calidad, tiempos, cancelación/limpieza nativa, reconexión USB y calibración FAR/FRR. No se ha medido carga, rendimiento con miles de plantillas, recuperación de backup ni resistencia completa a clientes locales maliciosos.

## Protocolo de aceptación de hardware pendiente

1. Registrar versión, licencia y arquitectura del SDK/driver; compilar con DLL auténtica y símbolo DIGITALPERSONA_SDK.
2. Deshabilitar simulación en ambos procesos; iniciar puente y confirmar lector disponible.
3. Crear un empleado sintético con consentimiento; enrolar un dedo con muestras válidas y verificar que SQL recibe únicamente FMD cifrado.
4. Capturar ese dedo → IN; esperar 30 segundos → OUT; un dedo no enrolado → sin coincidencia.
5. Retirar consentimiento → plantilla eliminada y marcaje rechazado; asegurar que no se persiste ninguna imagen.
6. Desconectar/reconectar USB, probar dedos secos/húmedos/movidos y comprobar recuperación y mensajes.
7. Medir falsos rechazos/aceptaciones y latencia con un conjunto consentido; decidir el umbral con evidencia del fabricante y del centro.
8. Guardar resultados con fecha, versión de SDK, lector, operador y logs sin imágenes/plantillas/secretos. Solo entonces declarar hardware validado.
# Actualización: variante Docker Linux con libfprint — 10/10/2026

En esta adaptación se ejecutaron **75 pruebas aprobadas**: 17 unitarias NestJS, 12 React, 22 de integración con SQL real, 7 del puente Linux y 17 de regresión C#. Las pruebas E2E previas que usan simulación se conservan como evidencia histórica; no se cuentan como ejecutadas en esta variante sin simulación.

Se compilaron y levantaron los contenedores SQL Express, API, web y puente Linux. El inicializador terminó correctamente sobre el volumen existente. La comprobación de solo lectura confirmó inicio de sesión administrativo, lectura del directorio, API con SQL conectado y `simulation=false`, siete secretos privados ausentes del JavaScript servido, y ausencia de credenciales `sa`/bootstrap en el proceso API. Evidencia: [docker-check.json](evidence/docker-check.json).

El transporte WebSocket real rechazó token incorrecto y Origin no autorizado con HTTP 401 antes del upgrade. El cliente autorizado recibió modo hardware, lector desconectado y captura bloqueada. El navegador verificó interfaz de escritorio, ancho móvil sin desbordamiento y ausencia de banner de simulación. Evidencia: [transporte](evidence/docker-bridge-live.txt), [navegador](evidence/docker-browser.txt), [estado hardware](evidence/hardware-live.json).

Las siete pruebas Linux incluyen firma interoperable, autorización del socket, comparación de una sola muestra contra todos los candidatos, plantilla nativa malformada que falla de forma cerrada, y comparación C real de minucias de prueba serializadas con una o varias muestras. Estos datos se construyen únicamente dentro de la prueba: no son un lector simulado ni una validación física. La prueba positiva detectó una precondición de construcción de FpPrint (driver/device-id), corregida y comprobada nuevamente. Evidencia: [pruebas Linux](evidence/docker-bridge-unit.txt).

El enrolamiento ahora preautoriza el ticket contra la API antes de capturar. La integración verifica autorización válida, rechazo de cliente sin token del dispositivo, rechazo de ticket inválido y rechazo de ticket ya consumido. La transacción de guardado vuelve a verificar consentimiento, caducidad y administrador vigente. Se comprobó por revisión y pruebas que no se selecciona arbitrariamente un empleado ante coincidencias múltiples.

**Pendiente físico:** Windows reconoce el lector `05ba:000a`, pero aún no está compartido con Linux/Docker. No se ha ejecutado enrolamiento ni marcaje con dedo real y no se declara disponible el lector. Los comandos, permisos y límites están en [DOCKER_LINUX.md](DOCKER_LINUX.md). La variante Docker no necesita el SDK de pago HID. La dependencia npm existente mantiene cinco avisos moderados; esta adaptación no equivale a un escaneo de seguridad integral.

---

# Actualización física USB — 10/10/2026

Tras instalar usbipd-win y conectar BUSID `2-5`, Docker Desktop pudo montar el USB real `05ba:000a`. El dispositivo recibió permisos 0660 para GID 10001, sin modo privileged. **libfprint abrió el lector** y la web recibió `state=available`, `available=true`, `mode=hardware`, con API/SQL conectados y simulación deshabilitada. El WebSocket siguió rechazando token y Origin incorrectos. Evidencia: [estado en navegador](evidence/usb-attached-browser.txt), [transporte](evidence/usb-attached-bridge.txt). El script `scripts/enable-reader-usb.ps1` se ejecutó y verificó correctamente la preparación y disponibilidad.

Pendiente: colocar un dedo real para enrolar al empleado autorizado y comprobar su marcaje. La apertura del USB no se presenta como una prueba de captura o identificación completa. Los estados desconectados descritos abajo corresponden al diagnóstico anterior a compartir USB.

---


## Mensajes de enrolamiento (10/10/2026)

Vitest: 14 pruebas frontend aprobadas, incluidas dos regresiones que verifican instrucciones de captura, confirmación persistente tras actualizar la lista y error de tiempo agotado sin éxito falso. Las pruebas de interfaz utilizan mensajes controlados exclusivamente en tests; el puente de producción mantiene captura USB real. El puente diferencia CAPTURE_TIMEOUT de CAPTURE_FAILED. La verificación de disponibilidad no captura huellas: la captura física y su resultado requieren un empleado presente con consentimiento.

## Horarios docentes y semáforo (10/10/2026)

24 pruebas unitarias backend, 14 frontend y 22 de integración con SQL Server aprobadas. Los nuevos casos comprueban límites 06:45:59/06:46, 07:10:59/07:11, zona Guatemala, dos salidas y ausencia de horario. La integración comprueba rechazo de salida 14:00, cambio de 12:45 a 13:00 y conservación de la salida original en el reintento idempotente. Un primer intento de integración previo a aplicar la migración falló por esquema antiguo; después de db:init pasaron las 22 pruebas. No se capturaron huellas para probar horarios.

Semaforo visual: 17 pruebas frontend aprobadas. Verificacion navegador real 1440x1000: columna Semaforo visible, seis registros neutrales, dos amarillos y dos rojos. Captura: evidence/semaforo-legible.png. Sin cambios en reglas ni historial.

## Foto obligatoria y código oculto (10/10/2026)

26 pruebas unitarias backend, 19 frontend y 23 SQL/API aprobadas. Se verifica bloqueo de alta sin foto, ausencia del código en el formulario, vista previa y preservación de foto al editar otros datos. Backend rechaza SVG, contenido falso y ausencia de imagen; convierte PNG a JPEG sin EXIF y respeta dimensiones. Integración confirma GET de foto protegido sin JWT, recuperación con administrador y ausencia de encryptedPhoto en respuestas. Los archivos de prueba son imágenes sintéticas exclusivamente de tests; no simulan lectores ni personas reales.

Orden de arranque USB: corregida preparación antes de compose up. En el diagnóstico actual Windows no tiene conectado 05ba:000a, solo autorización persistida. Se verificó el rechazo explícito por ausencia de lector y la sintaxis/orden de los scripts; la recuperación completa del montaje queda pendiente hasta conectar el hardware. No se simuló disponibilidad.

## Cambio de unidad y orden USB confirmados — 10/10/2026

Tras autorizar la nueva unidad con bind --hardware-id 05ba:000a y arrancar con -Usb, usbipd list mostró Attached. test_live.py devolvió mode=hardware, device=available, available=true y rechazo de token/origen no autorizados. Actualiza el resultado anterior pendiente por falta de dispositivo. No se realizó captura dactilar en esta comprobación. La guía de clonación se contrastó con setup-local.mjs y los scripts existentes; no se creó una segunda instalación ni se regeneró .env.
