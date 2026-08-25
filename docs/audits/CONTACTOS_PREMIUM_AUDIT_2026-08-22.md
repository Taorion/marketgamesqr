# Auditoría y rediseño de Contactos — 2026-08-22

## Estado previo

- La sección combinaba dos audiencias principales, Clientes y Leads, dentro del mismo renderizador. La navegación secundaria no explicaba con claridad la diferencia entre resumen, directorio, agenda y contactos agregados.
- Clientes ya se clasificaba por evidencia en `business_sales`; Leads reunía jugadores, contactos manuales y afiliados sin compra. Se conservó esta regla canónica.
- La ficha comercial existente ya reunía compras, beneficios, activaciones, comunicaciones, notas y movimientos. Se reutiliza; no se creó una ficha paralela.
- La carga inicial podía quedar varios segundos sin contexto y el encabezado mostraba el estado obsoleto “Sin cargar”.
- El directorio cortaba el resultado en 24 registros, aunque el servicio devolvía hasta 120; no había paginación ni carga progresiva visible.
- La búsqueda y la composición de filas no exponían empresa de forma uniforme. La coincidencia de ventas para contactos manuales tampoco incluía documento y teléfono normalizados.
- El importador CSV existente pertenecía a contactos manuales/leads. Reutilizarlo para clientes habría creado una clasificación visual incorrecta y sin evidencia comercial canónica.
- El formulario del recolector y el importador antiguo repetían acciones y mensajes. El importador antiguo fue retirado de esta superficie; el recolector conserva su flujo canónico.
- En móvil, los controles del directorio y algunas etiquetas se comprimían o desbordaban.

## Arquitectura conservada

- Estados y renderizadores: se mantienen `state.leadCrm`, `renderLeadsView`, `renderLeadCrmMetrics`, `renderContactDirectoryCards` y `openLeadDetail`; el módulo premium los amplía de forma aislada.
- APIs existentes: se mantiene el directorio y el detalle comercial bajo `/api/business/contacts` y sus contratos de historial.
- Fuentes: `business_manual_leads`, jugadores y afiliados continúan siendo identidades de contacto; `business_sales` sigue siendo la evidencia que convierte una identidad en Cliente.
- Aislamiento: todas las consultas nuevas reciben `business_id` desde la sesión autenticada y filtran lote, filas, identidades, duplicados y ventas por ese negocio.

## Cambios aplicados

- Cabina con Resumen, Clientes, Leads, Directorio, Agenda y Contactos agregados, reutilizando el contenedor y los listeners existentes.
- Encabezado compacto, búsqueda global, acción contextual y métricas calculadas solo con resultados reales cargados.
- Tarjetas operativas con empresa, contacto, canal, última compra, compras acumuladas, valor, próxima acción y estado; carga progresiva de 24 elementos y páginas posteriores.
- Búsqueda por nombre, documento, correo, teléfono y empresa; orden por compra reciente, compras, valor y nombre.
- Modal accesible de importación con plantilla UTF-8 BOM, arrastre, vista previa, contadores, progreso, bloqueo de doble envío, resultado y descarga de errores.
- Importación por lotes de 50 con idempotencia, savepoints por fila y bloqueo consultivo por identidad.
- Los clientes nuevos crean la identidad manual y una venta agregada canónica que conserva exactamente fecha, cantidad y valor declarados. Los contactos existentes sin compra reciben la evidencia de venta sin sobrescribir sus datos. Los clientes ya existentes se omiten y reportan.
- Trazabilidad mediante lotes y filas de importación, origen `Importación CSV`, número original de fila, resultado y motivo.

## Contratos nuevos

- `GET /api/business/contacts/customers/import-template.csv`
- `POST /api/business/contacts/customers/import-csv/preview`
- `POST /api/business/contacts/customers/import-csv`
- `GET /api/business/contacts/customers/imports/:batchId/errors.csv`

Límites: CSV de hasta 2 MB y 2.000 filas. Se exige `nombre`, un identificador válido y evidencia comercial coherente (`fecha_ultima_compra`, `total_compras > 0` y `valor_acumulado > 0`). La prioridad de duplicados es documento, correo y teléfono normalizados. No se actualizan silenciosamente datos existentes.

## Migración

`202608220002_customer_csv_imports.sql` crea `business_customer_import_batches` y `business_customer_import_rows`, junto con restricciones e índices por negocio, lote y fecha. Debe aplicarse antes de habilitar el flujo en un entorno compartido.

## Validación ejecutada

- Verificación sintáctica de frontend, servicio, controlador y rutas.
- Ocho pruebas específicas del parser, plantilla, caracteres especiales, encabezados, columnas, validadores, duplicados internos, evidencia comercial y contrato de aislamiento/idempotencia.
- Suite completa: 60 pruebas aprobadas y una falla preexistente, ajena a Contactos, en `rmsRecyclingQueue.test.js`.
- `git diff --check` sin errores; solo avisos de normalización LF/CRLF.
- Carga local de HTML, CSS y JavaScript y comprobación de autenticación obligatoria: los endpoints nuevos devuelven 401 sin sesión.

## Pendiente de entorno

- No se aplicó la migración ni se escribió en una base compartida.
- No se ejecutó una importación autenticada contra una base real ni una prueba cruzada entre dos tenants.
- La inspección visual local autenticada no fue posible porque el navegador local no tenía sesión. La revisión visual previa se realizó sobre staging, antes de los cambios.
- No se hizo commit, push ni despliegue.
