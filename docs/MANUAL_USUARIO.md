# Manual de usuario — Presencia

Actualizado el 10 de octubre de 2026. Interfaz: [localhost:5173](http://localhost:5173). El operador técnico debe iniciar Docker y preparar el lector según [README](../README.md) y [HARDWARE](HARDWARE.md).

## Acceso administrativo

Seleccione Administración e ingrese correo y contraseña. Las credenciales iniciales están en el único .env raíz; no comparta ese archivo. Cambiar allí la contraseña no modifica una cuenta existente. La sesión dura 15 minutos, se mantiene en memoria y requiere nuevo ingreso al recargar. Cierre sesión al terminar.

## Registrar y editar empleados

1. Abra Empleados y pulse Nuevo empleado.
2. Seleccione una foto de medio cuerpo (cabeza hasta cintura), JPG o PNG, máximo 2 MB. Es obligatoria para nuevas altas. Revise la vista previa.
3. Complete nombre y puesto. El código no aparece como campo: se genera al guardar y se muestra en el directorio. No se puede modificar.
4. Asigne, si corresponde, entrada 06:45 y salida 12:45 o 13:00. Sin asignación no se aplica el semáforo.
5. Registre el consentimiento biométrico y el nombre del firmante únicamente si el empleado lo ha leído y firmado.
6. Guarde y espere la confirmación.

El sistema no verifica automáticamente que la foto corresponda a la persona ni que tenga el encuadre solicitado. La foto es independiente de la huella; no se usa para reconocimiento facial. Solo los administradores pueden consultarla al editar. Puede reemplazarla seleccionando otra imagen. Editar otros datos conserva la foto sin volver a comprimirla.

Los empleados anteriores no se borran ni se bloquean por carecer de foto. Pueden añadirla en Editar. La desactivación conserva el historial y elimina la plantilla dactilar y los tickets. La foto se conserva en el registro desactivado; cualquier eliminación definitiva de datos personales requiere una política de conservación acordada.

## Enrolar una huella

1. Confirme Lector conectado y disponible, empleado activo y consentimiento firmado.
2. Pulse Enrolar o Reenrolar en el empleado correcto.
3. Aparece un cuadro visible con su nombre. Espere la autorización y coloque el mismo dedo varias veces; retírelo entre muestras.
4. Espere el resultado. La captura puede tardar hasta 100 segundos.
5. Solo Huella registrada confirma que el servidor guardó la plantilla. El resultado permanece hasta pulsar Entendido.

Un error informa captura incompleta, tiempo agotado, lector ocupado o huella duplicada. Si pierde conexión o no llega confirmación, actualice la lista antes de repetir: el servidor podría haber guardado la huella. Nunca se muestran plantillas biométricas en el navegador.

## Registrar asistencia

En Kiosco confirme servidor en línea y lector disponible. Pulse Iniciar lectura y coloque el dedo registrado. Espere Entrada registrada o Salida registrada y su nombre. Retire el dedo y respete el intervalo mínimo configurado (30 segundos por defecto).

Sin registros en el día escolar se marca IN; después de IN se marca OUT; después de OUT se marca IN. El siguiente día comienza nuevamente con IN. El servidor decide el día y la evaluación con la zona horaria del centro. No hay cola de marcajes sin conexión.

La lectura continua se puede activar y pausar desde el kiosco. Una desconexión la pausa; actívela nuevamente después de recuperar disponibilidad. No use los registros etiquetados Simulación como evidencia de asistencia real.

## Horarios y semáforo

| Movimiento | Condición, con resolución de un minuto | Resultado |
|---|---|---|
| Entrada | Hasta 06:45 inclusive | Verde: a tiempo |
| Entrada | 06:46 a 07:10 inclusive | Amarillo: llegada tarde |
| Entrada | Desde 07:11 | Rojo: llegada muy tarde |
| Salida | Antes de la salida asignada | Amarillo: salida anticipada |
| Salida | A la hora asignada o después | Verde: a tiempo |
| Cualquiera | Sin horario aplicado al marcaje | Gris: sin evaluación |

06:45:59 pertenece al minuto 06:45; 07:10:59 al minuto 07:10. Cada IN se evalúa con este horario diario. Cambiar el horario aplica a futuros marcajes; no recalcula el historial. El semáforo señala incidencias y no aplica sanciones. Ausencias, feriados, permisos y otros turnos no se calculan automáticamente.

## Consultar asistencia

La pestaña Asistencia muestra movimiento y semáforo en columnas separadas, con motivo y minutos debajo. Los registros se agrupan por fecha escolar, con los más recientes primero. El encabezado cuenta solo los marcajes visibles en esa página; un mismo día puede continuar en la siguiente. Filtre por fecha o use la paginación. Exportar página descarga únicamente los registros visibles; el CSV actual incluye empleado, código, fecha, hora UTC, movimiento y modo.

## Lector y recuperación

La reconexión automática funciona durante la sesión de Windows. Mantenga Docker Desktop abierto. No se exige un puerto USB fijo; si Windows considera que se trata de un dispositivo nuevo, el técnico puede necesitar autorizarlo de nuevo con bind. Un LED apagado en reposo no prueba una falla: la disponibilidad se comprueba abriendo el lector. Ante problemas consulte [diagnóstico](HARDWARE.md).

Después de actualizar la interfaz use Ctrl + F5. Los registros antiguos Sin evaluación no se convierten automáticamente en verde o amarillo al asignar un horario.
