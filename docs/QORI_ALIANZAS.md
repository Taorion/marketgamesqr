# Qori Alianzas

Implementación en `Ofrece → Alianzas`. Rama `feat/qori-alianzas-20261124`, basada en `origin/main` en `e9b39f2`. El checkout principal tenía cambios de otros trabajos y no se modificó. La entrega inicial `0c61f83` y su migración se publicaron el 24 de noviembre de 2026; se verificaron SHA, salud, rutas y recursos.

### Corrección de inicialización (24 de noviembre de 2026)

La integración inicial no cambiaba la URL cacheada de `empresa/js/app.js` y dependía exclusivamente de que ese archivo llamara a `QoriAlliances.open()`. Un navegador con el shell anterior, o una vista restaurada antes de cargar el módulo, podía mostrar una sección vacía. Se reprodujeron ambos casos con el HTML completo del portal. El módulo ahora se inicializa al cargar y al entrar en su vista, comparte la petición en curso con el hook del portal y presenta un error recuperable si falla la carga. Se versionan tanto el shell (`alliances=2`) como el módulo (`alliance-v2-20261124`). La suite focalizada de esta corrección tiene 49 pruebas; las pruebas de DOM no acreditan una revisión visual.

## Recorrido operativo

1. El emisor crea un borrador, verifica el identificador (slug) del aliado, configura el beneficio y la comisión y envía la propuesta.
2. El aliado entra en **Recibidas**, revisa las condiciones y acepta. Completa su presentación, logo HTTPS opcional, mensaje, invitación y campos de teléfono/correo. Nombre y documento son obligatorios.
3. El emisor asigna un lote. Se descuenta una sola vez de `business_qr_credit_accounts` usando `consumeQrCredits`, con movimiento en el ledger existente. El aliado recibe inventario específico de esa alianza, sin crédito en su saldo general.
4. El aliado comparte el QR de captación. El cliente acepta el uso de sus datos por los dos negocios y elige independientemente si autoriza publicidad de cada uno. Se registra un contacto `players` por negocio usando el resolvedor de identidad existente, y se asigna una unidad del lote sin otro débito.
5. El cliente guarda el enlace privado, descarga su QR o imprime/guarda el ticket en PDF mediante el navegador. No hay envío automático por WhatsApp o correo.
6. La panadería escanea el QR único en el Validador existente. Confirma el documento, los productos, la sucursal y el pago. Una lectura o una entrega sin compra no genera comisión. Se exige compra positiva en COP y medio de pago.
7. El Validador crea su venta canónica, canje e inventario en la transacción existente. Alianzas vincula esa venta a una única comisión. Ambos participantes pueden consultar resultados; el panel refresca cada 30 segundos mientras está visible y no hay un formulario abierto.
8. El emisor registra el pago ya efectuado al aliado, con importe, fecha y referencia. Esto es un registro operativo: Qori no transfiere dinero ni verifica una transferencia bancaria.

## Edición y cierre

- Borradores sin aceptación ni lotes pueden editarse y eliminarse definitivamente; también permiten cambiar el aliado antes de enviar la propuesta.
- Después de aceptar, editar condiciones crea una revisión pendiente. El aliado puede aceptarla o rechazarla. No se emiten nuevos lotes mientras hay cambios pendientes; las unidades bajo el acuerdo anterior siguen disponibles hasta la aceptación.
- Aceptar una revisión cierra los lotes anteriores no entregados conforme a su política. Los tickets entregados conservan las condiciones del lote, su personalización y vencimiento originales.
- Cualquiera de los dos participantes puede pausar las nuevas entregas. El emisor solicita reactivación y el aliado vuelve a aceptar.
- Se puede cerrar un lote individual, cerrar lotes vencidos, cancelar o archivar la alianza. Los tickets entregados siguen siendo canjeables hasta su vencimiento, salvo anulación individual expresa del emisor, con motivo y auditoría.
- Política de unidades sin entregar: devolución de créditos vigentes al emisor, o cierre sin devolución. Los créditos incluidos solo se restauran como incluidos dentro de su periodo original; los de periodos vencidos no se convierten en saldo permanente. No se devuelven créditos por tickets ya entregados.
- No se elimina historial de ventas, comisiones o pagos. Un registro de pago incorrecto se revierte mediante una entrada compensatoria; no se simula una devolución de dinero.
- Una reducción del importe pagado en la venta canónica reduce proporcionalmente la comisión original. Anular la venta, quitar su estado pagado o cambiar su moneda de COP revierte la comisión. Si estaba pagada al aliado, el exceso se muestra como saldo a recuperar. La venta y sus mecanismos de devolución existentes siguen siendo la autoridad.

## Datos y permisos

- Gestión: propietario/gerente y administradores con cuenta de negocio concreta. Las búsquedas, lecturas y cambios verifican la participación del negocio en la alianza. Los validadores solo canjean para el emisor y dentro de su sucursal autorizada.
- Crear y emitir reutiliza el permiso de plan `qr_batch_generator`; el panel recibido no exige ese permiso para permitir aceptar y administrar una invitación con acceso al portal.
- La captación crea relaciones separadas por negocio. No crea acceso autenticado a Customer ni enlaza cuentas personales por simple coincidencia de documento.
- Cada negocio ve su propio contacto y únicamente compras/comisiones originadas por esta alianza. La clasificación de comprador depende de una venta pagada, no del formulario.
- Los DTO públicos usan una lista explícita de campos. Las comisiones, condiciones de liquidación y datos personales no se incluyen en la consulta pública, el ticket ni los QR. El ticket privado usa un secreto aleatorio de 256 bits; nunca se recupera con solo conocer el documento.
- Tablas nuevas con RLS, sin grants de lectura/escritura para `PUBLIC`, `anon` o `authenticated`. Acceso a través del backend, con sus verificaciones de cuenta y rol. Antes de publicar, la conexión del backend debe tener el acceso privado que ya usa para las tablas existentes; no abrir las tablas mediante políticas públicas. Referencia: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
- El consentimiento guarda versión, fecha, negocios, finalidad y elecciones separadas de publicidad. No se solicita información médica. La política de privacidad existente debe describir esta participación de dos establecimientos antes de utilizarlo con clientes reales.

## Archivos e integración

- `database/migrations/20261124121902_qori_alliances.sql`: acuerdos, lotes, asignaciones, comisiones, pagos, auditoría y trigger sobre cambios en ventas.
- `backend/src/services/allianceRules.js`: validación y proyección pública.
- `backend/src/services/allianceService.js`: transacciones, stock asignado, identidad y comisiones.
- `backend/src/routes/allianceRoutes.js`: API privada `/api/business/alliances` y pública `/api/public/alliances`.
- `backend/src/services/qrService.js`: validación y devengo dentro del canje canónico.
- `backend/src/controllers/qrController.js`: invalidación posterior al commit de las cachés de negocio y Revenue.
- `empresa/js/alliances.js`, `empresa/css/alliances.css`: panel integrado en Ofrece.
- `alliance-public/`: inscripción y ticket en `/alianzas/`.

Los datos privados del acuerdo permanecen en las tablas de Alianzas, no en `qr_codes.metadata`. La atribución añade identificadores de alianza y aliado a la venta existente; no crea otro libro de ventas o saldos.

## Probar esta entrega local

Con el servidor de demostración en ejecución, abrir:

`http://127.0.0.1:3057/empresa/?view=alliances`

| Cuenta ficticia | Correo | Contraseña local |
| --- | --- | --- |
| Panadería Origen | `panaderia@alianzas.test` | `Alianzas-QA-2026!` |
| Naturista Vida | `naturista@alianzas.test` | `Alianzas-QA-2026!` |

Identificadores: `alianza-panaderia-qa` y `alianza-naturista-qa`. Existe una alianza preparada con 10 unidades asignadas. Entrar con la naturista, abrir **Recibidas** y acceder al enlace de captación. Usar datos ficticios; luego entrar con la panadería y presentar el código recibido en Validador. Las credenciales solo pertenecen a la base local aislada.

Los scripts de QA fijan explícitamente `127.0.0.1:55441/qori_alliances_qa_v2`; no usan `DATABASE_URL` de producción.

Desde la raíz de este worktree, con Node y PostgreSQL disponibles:

```powershell
# Preparación inicial: requiere PostgreSQL local en 55441, usuario postgres.
node scripts/alliance-local-setup.js

# No borra ni reinicia una base existente. Los fixtures usan identidades distintas.
node --test test/alliances.integration.test.js test/alliancesUI.test.js test/validatorBeneficiary.test.js test/validatorInventorySaleMovement.test.js test/validatorScannedCart.test.js

# Demo local con cuentas ficticias; escucha solamente en loopback.
node scripts/alliance-local-demo.js
```

En este equipo se ejecutó con `..\..\.local-tools\node-v22.23.5-win-x64\node.exe`. El clúster de prueba está en `..\..\tmp\alianzas-pgdata`, separado de las otras bases de QA. Si no está arrancado:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D '..\..\tmp\alianzas-pgdata' -l '..\..\tmp\alianzas-pg.log' -o '-p 55441 -h 127.0.0.1' start
```

## Evidencia y límites

La suite focalizada terminó con **44 pruebas aprobadas, cero fallos y cero omitidas**. Cubre concurrencia de emisión e inscripción, agotamiento, privacidad pública, aislamiento entre negocios, canje único, venta canónica, comisiones fijas/porcentuales, producto/sucursal, pagos, reversión, créditos incluidos, cambios de acuerdo y cierre individual. Las regresiones focalizadas del Validador también pasan. Los formularios se ejecutaron en DOM simulado; se comprobaron eventos, payloads, errores, reintentos e inyección de texto.

La revisión visual de escritorio/móvil quedó **pendiente**: el navegador integrado no estaba disponible y Computer Use detuvo el acceso a Chrome al no poder verificar su URL con confianza. No se afirma prueba de cámara física, ausencia de desbordamientos visuales ni flujo manual completo en navegador.

Pendiente antes de publicación: revisión visual y funcional en navegador, migración en entorno de despliegue, comprobación de permisos reales del rol de base de datos y verificación de versión/health y comportamiento público después del despliegue. No se hizo push, despliegue ni cambio en datos reales.
