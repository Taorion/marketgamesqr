# Auditoría Qori Invoice — 22 de noviembre de 2026

Base inspeccionada: `2380911ca0b2bfc2a4f871f5bfbdfda1845e4284`, rama `feat/qori-invoice-sandbox`, checkout aislado `tmp/qori-invoice-20261122`. El checkout principal contiene cambios ajenos extensos. No se copiaron, descartaron ni incluyeron en esta rama. La integración posterior debe reconciliarlos explícitamente.

## Plataforma encontrada

| Dominio | Componentes y rutas reales | Decisión |
| --- | --- | --- |
| Servidor | Node/CommonJS, Express 5, `backend/src/app.js`, `server.js`, `config/db.js`; PostgreSQL vía `pg` | Reutilizar servidor, pool, transacciones, errores y limitador; nuevo módulo delimitado `backend/src/invoice` |
| Datos/despliegue | `database/schema.sql`, `database/migrations`, espejo `supabase/migrations`; `backend/src/migrate.js`; `render.yaml` ejecuta migraciones al arrancar | No ejecutar despliegue ni migrador contra infraestructura remota. Nueva migración aditiva y rollback separado del directorio autoejecutado |
| Empresa | `app_users`, `businesses`, JWT, `middleware/auth.js`, suscripciones y roles; `/api/business`, `/empresa` | No exigir negocio ni suscripción para un integrador/emisor; no extender permisos Seller |
| Seller | `qoriSellerRoutes.js`, `/seller`, `platform_role`, controles de acceso del middleware | Sin cambios |
| Customer | `customer_accounts`, `customer_sessions`, `customerAuthService.js`, `customerRoutes.js`; `/api/customer`, `/customer`; `customer-web`, `apps/customer` Expo | Reutilizar cuentas personales y sesiones opacas revocables. Membresía Developers referencia cuenta existente; no nueva contraseña ni tabla de usuarios |
| Identidad | `customerIdentityService.js`, `declared_document_key`, `document_locked_at`; `verified_at` procede del acceso a correo | Declaración/confirmación de cédula y correo NO prueban titularidad documental. Nuevo registro de atestaciones con evidencia, vigencia y revocación; solo fixtures locales en esta entrega |
| Consentimiento previo | Relaciones, invitaciones, recuperación de beneficios, `customer_finance_connections` y capturas | Ninguno autoriza por sí mismo la recepción externa. Consentimiento específico por aplicación, canal, finalidad y versión; revocable |
| Finanzas | `customerFinance.js` (categorías/importes), `customerFinanceBooks.js`, `customerService.js`, `customer_entries`, `customer_receipts`, `business_sales`, capturas/asignaciones | Factura externa es documento de compra, no pago. Vincular a bolsillo existente; nunca insertar ventas ni gastos pagados por recibir XML. Conciliación explícita con un gasto propio existente |
| Facturas previas | `rewardPassService.js` almacena número/adjunto asociado a redención; agenda usa el término factura para vencimientos | No existe repositorio UBL, normalizador ni gateway M2M que pueda reutilizarse. Conservar esos flujos |
| Seguridad | Helmet/CORS, CSRF de sesión Customer mediante origen/cabecera, cuenta esperada, RLS con privilegios públicos revocados | Reutilizar identidad y CSRF. Límites del módulo antes del parser global de 26 MB; errores públicos sin XML, documentos, correos ni SQL |
| QA | `node:test`, pruebas puras e integración PostgreSQL; varias suites Customer apuntan explícitamente a 55441/qori_customer_qa | Usar base nueva aislada y un runner que fija destino local antes de importar configuración. No lanzar indiscriminadamente suites contra bases preexistentes |

## Diseño incremental y límites

1. Registro de partner separado de app y emisor. Membresía sobre Customer existente, sin FK obligatoria a Empresa. La sesión prueba acceso a cuenta; partner queda pendiente de verificación empresarial.
2. Aplicaciones y claves sandbox con expiración/revocación, huellas de secreto, scopes fijos, aislamiento por app. Ninguna API permite averiguar si una cédula tiene Qori.
3. Gateway `/api/invoice/v1`: idempotencia por app/clave, persistencia transaccional con trabajo en cola, acuse 202 opaco. El estado externo no revela asignación, consentimiento ni existencia de receptor.
4. Extracción UBL namespace-aware, límites de tamaño/profundidad/nodos, sin DTD/entidades/red/ZIP. XML original y normalización cifrados. Versión del parser y hash del original. Factura, nota crédito/débito; documentos fuera del subconjunto soportado fallan cerrados.
5. Worker PostgreSQL con `SKIP LOCKED`, transacción, reintentos acotados y estados internos; revalida autorización, identidad y consentimiento al asignar. La falta de consentimiento no genera una búsqueda de usuarios para el partner.
6. Bandeja Customer: detalle, XML original como descarga, lectura de conceptos/impuestos/descuentos y categorías existentes; facturado y pagado separados. Vinculación explícita a gasto propio sin crear un nuevo gasto.
7. Qori Developers: consola sandbox con sesión existente, registro, apps, claves, emisor sintético, prueba de envío y métricas técnicas sin datos de receptor; documentación y soporte por referencia técnica.

## Bloqueos para producción

- No se encontró proveedor de verificación documental/KYC ni evidencia de titularidad suficiente. Se necesita decidir proveedor, contrato, finalidades, minimización, vigencia y manejo de disputas. Nunca elevar automáticamente la cédula declarada a verificada.
- Falta verificación empresarial y mandato del emisor, incluyendo NIT/DV, vencimiento y revocación; sandbox permite únicamente un emisor sintético explícito.
- No hay verificador criptográfico de firmas UBL, XSD/Schematron DIAN completo ni comprobación confiable de ApplicationResponse. Siempre `DIAN_NOT_VERIFIED`; parsear XML no valida ante DIAN. No efectuar consultas a URLs suministradas en documentos.
- Retención, supresión/exportación integrada, rotación KMS, observabilidad externa, colas a escala, soporte con permisos mínimos y revisión legal requieren cierre antes de admitir documentos personales reales.
- El acceso Developers reutiliza el onboarding completo de Customer (incluido bolsillo); es una limitación explícita del incremento. Separar onboarding del rol futuro no justifica duplicar autenticación ahora.
- UI móvil nativa Expo no cambia en este incremento; bandeja web accesible desde Customer. Publicación y habilitación real requieren aprobación explícita.

## Referencias verificadas durante la auditoría

- [Documentación técnica DIAN](https://www.dian.gov.co/impuestos/factura-electronica/documentacion/Paginas/documentacion-tecnica.aspx) y [compilación de Resolución 165/2023](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm): referencia para formatos y entrega; no se afirma certificación ni cumplimiento integral. Qori es receptor complementario, no emisor ni proveedor tecnológico DIAN.
- [Ley 1581/2012, SIC](https://sedeelectronica.sic.gov.co/sites/default/files/normatividad/Ley_1581_2012.pdf): sustenta autorización específica y derechos del titular. Textos sandbox no sustituyen revisión jurídica para producción.
- [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [changelog](https://supabase.com/changelog.md): tablas del módulo sin acceso Data API; no se cambia Auth ni se actualiza CLI global.

Estado inicial de esta auditoría: escrito antes de modificar código de aplicación. La evidencia de ejecución y el alcance final se registran en `03-validacion.md`.
