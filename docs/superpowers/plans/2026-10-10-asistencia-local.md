> Documento de diseño/plan original conservado para trazabilidad. La implementación evolucionó: el stack activo es Docker/Linux con SQL Express y libfprint; el alcance actual incluye fotos personales obligatorias, códigos automáticos ocultos, horarios/semáforo, agrupación por fecha y supervisor USB. La prohibición de imágenes se refiere a **imágenes dactilares**, no a fotografías personales cifradas. Los detalles vigentes están en [manual técnico](../../MANUAL_TECNICO.md), [manual de usuario](../../MANUAL_USUARIO.md) y [cambios](../../CAMBIOS.md). No interpretar los pasos C#/SDK o simulación como requisitos del arranque actual.

# Plan de implementación local

**Objetivo:** entregar backend, interfaz, puente, pruebas reproducibles y manuales.
**Arquitectura:** monolito modular con servicios de aplicación y adaptadores TypeORM; puente autorizado y evidencia firmada; React consume contratos JSON.
**Stack:** SQL Server 2022 Developer, NestJS, TypeORM, React, Vite, Tailwind CSS, .NET 8 y Fleck.
**Especificación:** ../specs/2026-10-10-asistencia-local-design.md
**Ejecución:** directa en esta sesión, autorizada por «crea todo el sistema y realiza pruebas». Carpeta nueva sin Git; no se modifica otra rama.

## Restricciones
Solo loopback; plantillas FMD cifradas; nunca imágenes; credenciales privadas fuera de Vite; simulación explícita y deshabilitada por defecto; resultados pendientes identificados.

## Riesgos que se comprobarán
Firma modificada o antigua; consentimiento revocado; fecha escolar distinta de UTC; duplicados/concurrencia; token u origen WebSocket inválidos.

## Tareas
1. [x] Infraestructura y configuración: docker-compose.yml, scripts/setup-local.mjs, backend/.env.development y frontend/.env.local generados sin sobreescritura. Validar Docker Compose y conexión SQL.
2. [x] Backend: entidades, migración inicial, repositorios, servicios, DTOs y controladores. Pruebas antes de implementación de política diaria, criptografía y endpoints. Ejecutar build, unitarias e integración contra SQL Server.
3. [x] Puente: bridge/SchoolBridge.csproj y servicios con adaptador real condicionado al SDK; simulador separado. Pruebas de conexión, origen, enrolamiento y firma contra backend real. Compilar sin SDK y documentar la validación pendiente del adaptador propietario.
4. [x] Frontend: hook de WebSocket con cleanup/backoff, kiosco, login y administración. Pruebas del protocolo, hook y componentes; build y pruebas de navegador con sistema local.
5. [x] Documentación: README.md, docs/MANUAL_USUARIO.md, docs/MANUAL_TECNICO.md y docs/PRUEBAS.md con comandos, resultados y límites. Revisión final de contratos y seguridad, sin publicar ni desplegar.

## Contratos
POST /auth/login recibe email/password y devuelve accessToken. Rutas /admin requieren Bearer JWT. GET /device/templates y POST /device/enrollments requieren X-Device-Token. POST /attendance/mark recibe deviceId, employeeId, captureId, capturedAt, mode y signature. Firma HMAC-SHA256 en hex sobre campos separados por salto de línea, en ese orden salvo signature.
WebSocket: scan, enroll(ticket), status; respuestas ready, matched(assertion), enrolled(employeeId), error(code). No FMD en WebSocket. Enrollment ticket JWT de 120 segundos, de un solo uso, vinculado al empleado y almacenado por hash.

## Registro
- Diseño revisado contra el alcance del usuario. La instrucción posterior autoriza ejecución completa y manuales.
- Docker Desktop responde; .NET no está en PATH. Se instalará SDK en .tools local para verificar, sin modificar PATH del sistema.
- Impeccable no está disponible entre habilidades locales; no se declara usado.

- Verificación final: builds correctas y 49 pruebas aprobadas; revisión independiente con regresiones de navegación y concurrencia corregidas. Captura DigitalPersona física pendiente, documentada en el informe.
