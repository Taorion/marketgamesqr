# Aprobación obligatoria del Embajador

Crear la cuenta e iniciar sesión no autoriza acceso comercial. Solo una solicitud
APPROVED habilita el dashboard, CRM, cartera y enlaces de atribución, por revisión
documental o por alta expresa del superadmin. Las cuentas
antiguas sin expediente también quedan pendientes. Superadmin conserva acceso
para revisar y aprobar solicitudes.

- SUBMITTED: pantalla exclusiva «Estamos revisando tu solicitud para aprobación».
- DRAFT o sin expediente: acceso bloqueado; solo completar la postulación.
- CHANGES_REQUESTED: acceso bloqueado; solo corregir documentación.
- REJECTED/SUSPENDED: aviso del estado y observación administrativa, sin funciones.
- Consultar estado vuelve a leer la solicitud; una aprobación habilita el portal.

`requireApproved` exige aprobación también cuando no existe expediente. Protege
dashboard, cuentas, CRM y uso público de enlaces de asesor. La API de postulación
sigue disponible para consultar y preparar documentos; cargar documentos exige
DRAFT, CHANGES_REQUESTED o APPROVED con `approval_mode=ADMIN_OVERRIDE`.
El frontend nunca considera `legacy` una autorización.
Un rechazo de permiso por cambio de aprobación vuelve a consultar el expediente
y reemplaza la vista comercial con el bloqueo. No se modifican decisiones ni
expedientes existentes durante el despliegue.

## Alta administrativa con documentos pendientes

Admin → Cuentas Qori → Vendedores → Administrar → Dar de alta. El superadmin
registra un motivo y confirma expresamente la documentación pendiente. El servidor
habilita la cuenta y registra `SELLER_ACCESS_AUTHORIZED`, con actor, estado previo,
documentos presentes y faltantes. El vendedor debe tener un expediente iniciado;
el alta nunca inventa identificación ni aceptación de condiciones.

`APPROVED` con `approval_mode=ADMIN_OVERRIDE` habilita el acceso comercial, pero
mantiene una alerta roja en el listado y detalle Admin, y en Seller. El embajador
puede cargar y enviar documentos sin perder ese acceso. La alerta persiste aunque
ya haya cuatro archivos, hasta la aprobación documental explícita con todas las
verificaciones. Esa decisión establece `approval_mode=DOCUMENTS`. Los pagos
conservan el requisito de aprobación documental; el alta no los registra.

Suspender, rechazar o solicitar correcciones revoca el acceso comercial. Una
cuenta suspendida puede recibir una nueva alta expresa. El control de permisos
se ejecuta en el servidor y la autorización y su auditoría son transaccionales.

Migración previa al backend: `20261109194733_qori_seller_admin_authorization.sql`,
reflejada en database/migrations y supabase/migrations. Conserva las aprobaciones
anteriores como DOCUMENTS y no da altas automáticas.

Validación del alta (2026-11-09): 32 pruebas locales aprobadas entre
`sellerAdminAuthorization.integration.test.js`, `qoriSellerLaunch.integration.test.js`,
`sellerAccountLifecycle.integration.test.js`, `adminBusinessBalances.integration.test.js`,
`qoriSellerUI.test.js` y `adminAccountsUI.test.js`. Migración ejecutada solo en
PostgreSQL local `qori_customer_qa`; RLS permanece activo sin grants a anon,
authenticated o PUBLIC. Revisión visual pendiente por navegador no disponible.
Este registro no acredita despliegue en producción.

Validación local: `qoriSellerLaunch.integration.test.js`,
`sellerAccountLifecycle.integration.test.js`, `qoriSellerUI.test.js` y
`sellerAccountsUI.test.js`. Incluyen login pendiente, estados no aprobados,
cuentas sin expediente, permisos por API, aprobación documental y renovación
de estado en interfaz. La prueba DOM no sustituye una revisión visual.
