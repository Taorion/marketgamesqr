# Pedidos a domicilio en Qori Empresa

Entrega incluida en el despliegue completo solicitado el 17 de noviembre de 2026.
El alcance se limita a domicilios desde la vitrina existente y su administración
en el Qori Empresa habitual. Se retiraron de esta entrega el lienzo, el editor,
las páginas públicas y las APIs del estudio de estrategias.

## Qué se reutiliza

| Capacidad | Implementación reutilizada | Cambio de esta entrega |
|---|---|---|
| Productos, categorías, imágenes y publicación | `smart_catalogs`, `smart_catalog_products`, `/c/:slug` | Carrito opcional y variantes en metadatos del producto |
| Acceso y planes | Sesión de Empresa, roles y habilitación `showcase` | Panel para dueño/gerente; aislamiento por negocio en servidor |
| Contactos e historial | `business_manual_leads`, `lead_events` | Vinculación explícita al aceptar y eventos del pedido |
| Inventario | Productos vinculados y `syncSaleProductsWithCatalog` | Validación y descuento único al cobrar o entregar |
| Ventas | `business_sales` | Una venta por pedido al confirmar manualmente el cobro completo |
| Medición | `smart_catalog_events` | Sesiones de vitrina, productos, carrito y solicitud; métricas de pedidos |

Se añaden tres tablas: `catalog_order_settings`, `catalog_orders` y
`catalog_order_events`. No se crea otro catálogo, CRM ni registro contable.
Todas tienen RLS y acceso directo revocado para clientes de Supabase.
Express aplica autorización y alcance del negocio.

## Recorrido operativo

1. En **Vitrina web**, el negocio mantiene productos, categorías, imágenes,
   precios, disponibilidad y publica su vitrina usando la función existente.
2. En **Pedidos a domicilio → Configurar domicilios**, elige esa vitrina,
   habilita solicitudes, define horarios, zona horaria, zonas, tarifas,
   condiciones y forma de cobro. Puede pausar nuevas solicitudes.
3. Abre **Mi vitrina y QR**: revisa los pasos de preparación y publicación.
   Comparte el enlace o descarga el QR, el volante en PNG o el PDF A5 para
   imprimir. Se generan con el nombre del negocio y el enlace exacto de la
   misma vitrina; no necesita diseñar otra página ni otro catálogo.
4. El cliente elige productos y variantes, revisa el carrito y el total calculado
   por el servidor, y envía nombre, teléfono, dirección y observaciones.
   Las comunicaciones comerciales tienen una casilla independiente y opcional.
5. Recibe un número y enlace privado. La confirmación indica:
   «Tu solicitud fue enviada. El establecimiento debe confirmar disponibilidad y entrega».
6. El negocio actualiza el panel, revisa disponibilidad y confirma la identidad
   antes de crear o vincular un contacto existente con el mismo teléfono.
   Gestiona aceptación, preparación, despacho, entrega o cancelación con motivo.
7. **Registrar cobro y venta** requiere confirmar dinero recibido, importe
   completo, método y referencia. Entregar no equivale a cobrar. Los pagos se
   identifican como confirmaciones manuales, no verificaciones bancarias.
8. El historial conserva fecha y responsable. Los resultados permiten abrir los
   pedidos del período para revisar los registros que los explican.

Desde **Vitrina web** también está disponible **Domicilios, QR y volante**.
Desde domicilios, **Productos y fotos** vuelve al editor canónico y conserva
la vitrina elegida. Publicar desde el panel llama a la API existente de vitrinas.
La descarga se habilita cuando hay vitrina publicada, configuración de pedidos
y un producto disponible con precio. El servidor comprueba esos requisitos
antes de generar cada pieza. El volante no queda guardado en un catálogo paralelo.

El cliente puede buscar, explorar categorías, consultar detalles, horarios y
zonas sin abrir el antiguo formulario de WhatsApp. El contacto manual con el
negocio sigue disponible. Una solicitud cuya respuesta se perdió se puede
recuperar incluso después de recargar la pestaña, usando el mismo identificador.

El establecimiento prepara, cobra y entrega con su propio domiciliario o servicio.
Qori organiza las solicitudes; no suministra domiciliarios ni recauda dinero.

## Reglas verificables

- El servidor comprueba productos, variantes, precios, cobertura y horarios.
  Cada solicitud conserva una copia de precios y condiciones; editar la vitrina
  no cambia pedidos anteriores. Revisiones vencidas o modificadas requieren
  volver a revisar el carrito.
- Envíos y cobros repetidos se protegen mediante identificadores únicos y
  transacciones. El acceso público requiere un token aleatorio, no el número
  del pedido. El seguimiento omite nombre, teléfono y dirección.
- Una tarifa de domicilio pendiente no produce un total definitivo. El negocio
  propone el costo y el cliente debe aceptarlo desde su enlace antes de aceptar
  el pedido. Se rechazan aceptaciones de propuestas reemplazadas.
- El inventario vinculado se verifica al solicitar y aceptar. No se reserva.
  Se descuenta una sola vez al registrar cobro o entrega, con control de
  concurrencia. Productos sin inventario vinculado no prometen disponibilidad.
- No se combinan contactos por nombre ni se crea una cuenta Customer. Si el
  teléfono ya existe, el operador elige explícitamente el contacto confirmado.
- La revocación comercial se guarda en el contacto y bloquea operaciones
  promocionales futuras que usan los servicios existentes de comunicaciones y
  activación. No interrumpe el seguimiento operativo del pedido.
- Una devolución completa anula la venta y se refleja en resultados. El retorno
  físico de inventario requiere revisión manual; no se repone automáticamente.
- Las métricas usan fecha de solicitud, sesiones del navegador y ventas canónicas
  vigentes. No presentan sesiones como personas únicas ni solicitudes como ventas.

## Habilitación y reversión

Migración: `20261113210829_catalog_delivery_orders.sql`, idéntica en
`database/migrations` y `supabase/migrations`. Se generó con la CLI y se aplicó
solamente a QA local. Aplicarla mediante el procedimiento de despliegue vigente
antes de habilitar el módulo en un entorno autorizado.

```env
QORI_CATALOG_ORDERS_ENABLED=true
QORI_CATALOG_ORDERS_BUSINESSES=uuid-del-negocio-piloto
```

El valor predeterminado es `true`. Una lista vacía habilita negocios sujetos a
sus permisos y planes existentes. No cambia la matriz comercial de Qori.
API privada: `/api/business/catalog-orders`; pública: `/api/public/catalog-orders`.
El volante usa `PUBLIC_APP_URL`, igual que el resto de enlaces públicos.
En localhost se marca **VISTA PREVIA LOCAL**: ese QR es para probar en ese
computador, no para repartir a clientes. Después del despliegue autorizado se
debe generar con la dirección pública real. PNG y PDF usan las dependencias
existentes `qrcode`, `sharp` y `pdf-lib`; no se añadieron paquetes ni migraciones.

Desactivar la variable impide nuevas solicitudes y cambios de configuración;
conserva la consulta y gestión de pedidos en curso. Es la primera opción de
reversión. No borrar tablas, contactos ni ventas. Volver al código anterior
retiraría también el seguimiento: terminar los pedidos o conservar soporte
compatible antes de hacerlo. Las preferencias de consentimiento deben permanecer.

## Prueba local

Requiere PostgreSQL QA con el esquema previo de Qori en
`127.0.0.1:55441/qori_customer_qa`. Desde la raíz, en PowerShell:

```powershell
$env:DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa'
$env:DB_SSL='false'
& .\.local-tools\node-v22.23.5-win-x64\node.exe scripts/prepare-catalog-orders-qa.cjs
& .\.local-tools\node-v22.23.5-win-x64\node.exe --test --test-concurrency=1 test/catalogOrders.integration.test.js test/catalogOrders.ui.integration.test.js
& .\.local-tools\node-v22.23.5-win-x64\node.exe scripts/preview-catalog-orders.cjs
```

Abrir `http://127.0.0.1:3138/__pedidos_qa`. Esta entrada crea una sesión ficticia
local para abrir el **Qori Empresa habitual** y proporciona el enlace a la
vitrina de prueba. Elegir **Pedidos a domicilio** en el menú del portal.
El script escucha únicamente en loopback, fija la base QA, desactiva proveedores
y no inicia workers. La sesión dura cuatro horas. Detener con Ctrl+C; los
datos ficticios permanecen en QA. No publicar estas rutas de prueba.

## Evidencia y límites

- **16/16 pruebas de integración aprobadas** contra PostgreSQL QA y Express:
  recorrido completo, permisos, aislamiento, variantes, precios, conservación,
  duplicados, tarifa pendiente, consentimiento, conflicto de configuración,
  horarios, pausa, inventario concurrente, contactos y venta única, PNG/PDF,
  lectura del QR, recuperación ante respuesta perdida y productos agotados.
- Cinco de esas pruebas ejecutan las interfaces reales en JSDOM con APIs reales:
  configuración y volante; vitrina → carrito → solicitud → panel → cobro → seguimiento;
  búsqueda/detalles/contacto; recuperación de solicitudes; productos agotados.
  Esta evidencia comprueba comportamiento, no apariencia en un navegador real.
- **5/5 regresiones de vitrina aprobadas**: acciones de plantilla y estilos del
  diálogo de productos. No se afirma haber ejecutado toda la suite del proyecto.
- Migración aplicada en QA; copias iguales; revisión sintáctica y de diferencias.
- Volante PDF A5 renderizado con Poppler y revisado visualmente. El QR del PNG
  completo se decodificó con `jsqr` y coincide con el enlace canónico. Falta una
  prueba física de cámara e impresión; no se afirma haberla realizado.
- Queda pendiente la revisión visual del portal completo en escritorio y móvil,
  navegación de teclado y accesibilidad en navegador real. La herramienta de
  control de interfaz informó que el host de acceso al navegador no está disponible.
- Los avisos internos consisten en la actualización de la cola cada 20 segundos
  mientras está visible y sin diálogo abierto. No se incorporó envío externo
  automático por WhatsApp, correo o SMS: el negocio usa contacto manual.
- Primera versión en COP, un intervalo de atención por día, tarifas simples por
  zonas, variantes que comparten inventario, cobro y devolución completos.
  No incluye abonos, pasarela, rutas, reservas ni sustituciones automáticas.

El despliegue completo fue autorizado el 17 de noviembre de 2026. La revisión
visual y el piloto real permanecen como verificaciones separadas. Publicar el
módulo no activa la recepción de pedidos en ninguna vitrina: cada negocio debe
guardar su propia configuración habilitada.
