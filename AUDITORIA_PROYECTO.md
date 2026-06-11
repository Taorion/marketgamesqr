# Auditoria general del proyecto

Fecha: 2026-06-11

## Resumen

El proyecto ya tiene una base funcional: API Express, Postgres, autenticacion JWT,
portal empresa, admin, validador QR, pagina publica, flujo de paquetes prepago y
webhook de Mercado Pago para activar usuarios prepago despues del pago.

La revision encontro una falla critica de permisos en rutas admin, ya corregida,
y varios puntos que deben ordenarse antes de produccion: seguridad de headers/CORS,
flujo de pago mensual para portal, gestion de migraciones, limpieza de documentos
con codificacion rota y separacion entre demo/prototipos/producto.

## Reparado en esta revision

1. Proteccion global de rutas admin.
   - Archivo: `backend/src/routes/adminRoutes.js`
   - Antes: `/api/admin/*` usaba solo `authRequired`.
   - Ahora: exige rol `ADMIN` o `ADMIN_MARKET_GAMES` para toda la ruta.
   - Impacto: evita que usuarios autenticados no admin accedan a endpoints sensibles.

2. Higiene inicial de versionamiento.
   - Archivo: `.gitignore`
   - Agregado para evitar subir `.env`, `node_modules/` y artefactos QR generados.

## Validaciones ejecutadas

- Sintaxis JS propia: OK.
- `npm run demo:check`: OK.
- `npm run subscriptions:probe`: OK.
- HTTP 200 confirmado en:
  - `/`
  - `/empresa/`
  - `/admin/`
  - `/validador/`
  - `/paquetes/`
  - `/api/health`
- Prueba de acceso owner a admin: responde `403`.

## Critico antes de produccion

1. CORS esta abierto.
   - Archivo: `backend/src/app.js`
   - Riesgo: cualquier origen puede llamar la API si obtiene un token.
   - Crear: `CORS_ORIGINS` en `.env` y limitar origenes permitidos.

2. CSP esta desactivado.
   - Archivo: `backend/src/app.js`
   - Riesgo: la app usa mucho `innerHTML`; sin CSP aumenta el impacto de XSS.
   - Reparar: activar `helmet` con una CSP compatible con scripts, estilos, imagenes y iframes reales.

3. Sesion guardada en `localStorage`.
   - Archivos: `empresa/js/app.js`, `admin/js/app.js`
   - Riesgo: si hay XSS, el token queda expuesto.
   - Mejorar: migrar a cookie `HttpOnly` o, como minimo, reducir vida del token y endurecer CSP.

4. Admin HTML trae credenciales precargadas.
   - Archivo: `admin/index.html`
   - Riesgo: mala practica si llega a produccion.
   - Reparar: quitar valores default de email/password del formulario.

5. Credenciales demo por defecto en seed/scripts.
   - Archivos: `backend/src/seed.js`, `scripts/*.js`, `.env.example`
   - Riesgo: entorno real mal configurado podria crear usuarios conocidos.
   - Reparar: exigir variables explicitas cuando `NODE_ENV=production`.

## Debe complementarse

1. Pago mensual real para portal.
   - Estado actual: registro portal queda en `PENDING_SETUP` y requiere activacion manual.
   - Crear: checkout o suscripcion recurrente para planes `STARTER`, `GROWTH`, `PRO`.
   - Resultado esperado: usuario crea cuenta, paga mensualidad, webhook activa negocio y usuario.

2. Pantalla post-pago.
   - Estado actual: Mercado Pago vuelve a `/paquetes/?signup=success`.
   - Crear: vista de confirmacion que explique si el pago esta aprobado, pendiente o fallido.
   - Debe tener CTA claro: "Ingresar al validador" o "Ingresar al portal".

3. Recuperacion y cambio de password.
   - Falta: forgot password, reset por token, cambio de password desde perfil.
   - Es clave para clientes reales.

4. Perfil de usuario mas completo.
   - Ya existe base de perfil negocio/usuario.
   - Complementar: cambio de datos personales, cambio de telefono, usuario actual, empresa actual, rol, plan, QR disponibles, historial de compras y estado de cuenta.

5. Email transaccional.
   - Falta: enviar correo al crear cuenta, pago aprobado, pago pendiente, activacion manual y reset password.

6. Terminos, privacidad y consentimiento de datos.
   - Falta para captura de leads y uso comercial de datos personales.

## Debe mejorarse

1. Migraciones.
   - Estado actual: `database/schema.sql` acumula muchas alteraciones.
   - Mejorar: crear carpeta `database/migrations/` con archivos numerados y tabla de control de migraciones.

2. Documentacion.
   - `README.md` y `DOCUMENTO_UNIVERSAL_QR.md` tienen texto con codificacion rota.
   - Mejorar: normalizar UTF-8 y actualizar la documentacion al nuevo flujo comercial:
     venta -> registro -> pago -> activacion -> uso.

3. Separacion de producto, demo y prototipos.
   - Hay carpetas de presentaciones, dashboard prototipo, assets y demos dentro del mismo root.
   - Mejorar: organizar `apps/`, `backend/`, `docs/`, `assets/`, `prototype/`, `generated/`.

4. Frontend sin build ni lint.
   - Estado actual: JS plano grande, especialmente `empresa/js/app.js`.
   - Mejorar: agregar ESLint/Prettier o separar por modulos.
   - A mediano plazo: mover portal/admin a una app frontend modular.

5. Sanitizacion en frontend.
   - Hay mucho uso de `innerHTML`.
   - Parte ya usa `escapeHtml`, pero debe auditarse cada render con datos de API.
   - Crear regla interna: todo dato de usuario debe pasar por `escapeHtml` antes de llegar a HTML.

6. Observabilidad.
   - Estado actual: errores 500 salen por `console.error`.
   - Mejorar: request id, logs estructurados, auditoria de acciones admin y pagos.

## Debe repararse o revisar con prioridad media

1. Endpoint demo de compra QR.
   - Archivo: `backend/src/controllers/paymentController.js`
   - Solo se habilita si `PUBLIC_APP_URL` es localhost.
   - Revisar: tambien bloquear con `NODE_ENV !== "production"` para evitar errores de configuracion.

2. Webhook Mercado Pago.
   - Bien: verifica firma si existe `MERCADO_PAGO_WEBHOOK_SECRET`.
   - Mejorar: exigir secret en produccion y guardar eventos webhook crudos para auditoria/reintentos.

3. `jwtSecret` fallback.
   - Archivo: `backend/src/config/env.js`
   - Hoy solo advierte si usa fallback.
   - Reparar: en produccion debe fallar si no hay `JWT_SECRET` fuerte.

4. Rutas publicas.
   - Revisar rate limiting en login, registro publico, generacion QR publica y validacion.
   - Crear: middleware de rate limit por IP y por email.

5. Assets y archivos pesados.
   - Hay `.pptx`, `.zip`, `.pdf`, imagenes generadas y archivos de presentacion en root.
   - Mover a `docs/` o `generated/` y excluir outputs regenerables.

## Backlog recomendado

### Sprint 1: produccion segura

- Activar roles admin globales en rutas sensibles. Hecho.
- CORS por allowlist.
- CSP con Helmet.
- Quitar credenciales precargadas del admin.
- Bloquear defaults inseguros en produccion.
- Rate limit para login, signup y webhook.

### Sprint 2: venta y pago completo

- Checkout mensual para portal.
- Pagina de resultado post-pago.
- Email de confirmacion y activacion.
- Historial de pagos/compras en perfil.
- Estado visual claro: pendiente, activo, vencido, pago rechazado.

### Sprint 3: mantenimiento

- Migraciones versionadas.
- Tests de permisos por rol.
- Tests de webhook aprobado/rechazado/duplicado.
- Tests de registro prepago y portal.
- Limpieza de docs UTF-8 y estructura de carpetas.

### Sprint 4: UX cliente

- Recuperar password.
- Perfil de usuario editable.
- Configuracion de empresa con NIT bloqueado.
- Pantalla de onboarding despues de primer pago.
- Acceso directo al validador o portal segun tipo de cuenta.

