> Estado vigente al 10/10/2026: la instalación principal es Docker/Linux con SQL Express, NestJS, React/Nginx y libfprint. El puente C# y los resultados de simulación corresponden a alternativas o pruebas históricas. Foto personal obligatoria en nuevas altas, código oculto/automático, horarios y semáforo, historial por fecha y reconexión USB están implementados. Véase [cambios consolidados](CAMBIOS.md) y los manuales actuales.

# Reconexión del lector — 10/10/2026

Causa comprobada: al perder USB/IP, Windows mostraba `Shared` y Ubuntu carecía del nodo del lector; el puente informó correctamente `available=false`.

Se añadió un supervisor Windows sin privilegios elevados que consulta el hardware actual y vuelve a adjuntar exclusivamente un lector previamente compartido `05ba:000a`. La regla udev conserva permisos 0660 para el grupo del puente al crear un nuevo nodo USB. No se utiliza un lector simulado.

Prueba sobre el dispositivo conectado: se ejecutó `usbipd detach --busid 2-5`, se esperó diez segundos y se comprobó recuperación automática. `test_live.py` devolvió `mode=hardware`, `device=available`, `available=true`; tokens y orígenes no autorizados siguieron rechazados. `node scripts/check-hardware.cjs` confirmó la disponibilidad desde el navegador, la base de datos conectada y ausencia de simulación.

La prueba interrumpió el transporte USB/IP real; no equivale a desconectar físicamente el cable. Pendiente de validación por el operador: quitar/reinsertar el cable, cambiar de puerto y enrolar una huella real con consentimiento. Los LED no fueron inspeccionados físicamente.

Comprobación sin captura, desde la raíz del proyecto:

```powershell
docker compose -f docker-compose.yml -f docker-compose.linux.yml exec -T biometric python3 test_live.py
node scripts/check-hardware.cjs
```
