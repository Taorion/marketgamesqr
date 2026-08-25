# Política de ciclo de vida del portal

Esta política usa verbos explícitos y conserva la trazabilidad comercial. La tabla
`business_lifecycle_events` es el libro de auditoría común para las operaciones nuevas.
Una acción de archivo, cancelación o anulación no borra filas existentes.

| Módulo / entidad | Acción permitida | Acción prohibida o condición | Estado final | Reversible | Control / endpoint |
| --- | --- | --- | --- | --- | --- |
| Inventario, productos y servicios | Archivar con motivo | No borrar si hay uso comercial; los históricos conservan snapshots | `ARCHIVED` | Sí, por actualización autorizada | Inventario / `DELETE /inventory/products/:id` (archivo compatible) |
| Catálogos | Archivar | No borrar catálogo o producto publicado con referencias | `ARCHIVED` | Sí | Catálogos / endpoint existente de archivo |
| Campañas | Eliminar solo borrador sin actividad; archivar o cancelar en otro caso | No borrar con leads, tickets, activaciones, redenciones o ventas | `ARCHIVED` o `CANCELLED` | Archivo sí | Campañas / requiere extender la confirmación de impacto |
| QR y tickets | Cancelar o desactivar | No borrar emitidos, reclamados o redimidos | `CANCELLED` / `DISABLED` | Según vigencia | QR/Tickets / cancelación existente |
| Reward Pass y beneficios | Cancelar o desactivar | No borrar pases emitidos, usados o con redención | `CANCELLED` / `DISABLED` | Según regla del pase | Reward Pass / cancelación existente |
| Activaciones | Eliminar borrador; archivar, despublicar o cancelar publicada | No borrar participantes, respuestas o métricas | `ARCHIVED` / `CANCELLED` | Sí si no hay resultados | Activaciones / requiere auditoría común |
| Agenda y recordatorios | Cancelar tarea con motivo | No borrar tareas RMS ni su evento | `CANCELLED` | No se borra; puede reabrirse por flujo autorizado | Agenda / `DELETE /leads/agenda/:noteId` ahora cancela |
| Notas manuales | Eliminar solo si no son evidencia ni auditoría | No borrar eventos RMS ni evidencia comercial | `DELETED` o `EVIDENCE_INVALIDATED` | Depende de tipo | CRM / pendiente separar nota manual de evidencia |
| Leads y clientes | Archivar contacto, fusionar duplicado, no contactable o privacidad explícita | No existe eliminación genérica en RMS ni limpieza de historial | `ARCHIVED` | Sí, con permiso | Contactos / `DELETE /leads/:id` ahora archiva por compatibilidad |
| Ventas, pagos y revenue | Anular venta con motivo; corregir atribución o invalidar evidencia | Nunca borrar la venta canónica ni el valor original | `VOIDED` | Reversión explícita posterior | Ventas / `POST /sales/:saleId/void` |
| Postventa | Cancelar acción pendiente | No borrar acción ya emitida, reclamada o redimida | `CANCELLED` | Según recurso vinculado | Activación 2 / pendiente integrar libro común |
| Usuarios y responsables | Desactivar tras reasignar trabajo abierto | No borrar usuarios históricos | `DISABLED` | Sí, con permiso | Administración / pendiente validación de reasignación |
| Configuraciones del negocio | Eliminar solo sin dependencias; archivar en otro caso | No borrar configuraciones con uso comercial | `DELETED` / `ARCHIVED` | Según entidad | Administración / revisión por módulo pendiente |

## Reglas transversales

- Todas las escrituras deben limitarse por `business_id` y registrar actor, fecha y motivo.
- Los comandos críticos se ejecutan en transacción y registran un evento idempotente.
- Los selectores activos excluyen inventario y contactos archivados; los históricos conservan los IDs y snapshots originales.
- Los controles RMS no ofrecen eliminación genérica de leads, eventos ni evidencias.
- La eliminación física queda reservada para borradores sin dependencias y para el flujo de privacidad autorizado, nunca para actividad comercial.

## Cobertura pendiente deliberada

La política documenta todos los módulos, pero todavía falta sustituir de forma compatible
los endpoints físicos heredados de activaciones, catálogos, afiliados y notas. No deben
exponerse como "Eliminar" hasta que cada uno valide dependencias y escriba en el libro
de auditoría. Esta separación evita convertir una auditoría en una migración destructiva.
