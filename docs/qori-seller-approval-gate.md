# Aprobación obligatoria del Embajador

Crear la cuenta e iniciar sesión no autoriza acceso comercial. Solo una solicitud
APPROVED habilita el dashboard, CRM, cartera y enlaces de atribución. Las cuentas
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
DRAFT o CHANGES_REQUESTED. El frontend nunca considera `legacy` una autorización.
Un rechazo de permiso por cambio de aprobación vuelve a consultar el expediente
y reemplaza la vista comercial con el bloqueo. No se modifican decisiones ni
expedientes existentes durante el despliegue.

Validación local: `qoriSellerLaunch.integration.test.js`,
`sellerAccountLifecycle.integration.test.js`, `qoriSellerUI.test.js` y
`sellerAccountsUI.test.js`. Incluyen login pendiente, estados no aprobados,
cuentas sin expediente, permisos por API, aprobación documental y renovación
de estado en interfaz. La prueba DOM no sustituye una revisión visual.
