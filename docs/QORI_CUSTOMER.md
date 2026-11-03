# Qori Customer — portal web

## Diseño alineado con Empresa · 2026-11-03

Customer adopta la filosofía visual de `empresa/css/portal-clean-v39.css`: azul profundo #012268, azul principal #0341b3, acento cian #07cefb, lienzo claro, superficies blancas, líneas suaves y controles compactos. Manrope se usa para lectura y controles; Plus Jakarta Sans para títulos. Se reutiliza el logo oficial de Empresa.

`customer-web/qori-theme.css` es la capa visual final, cargada después de los estilos de las secciones. Unifica inicio, registro, catálogo, tarjetero, finanzas, cuenta, formularios, diálogos y privacidad. Mantiene la jerarquía de acciones y los estados semánticos; las fotografías de negocios conservan su identidad. Los iconos de navegación son SVG de trazo y no dependen de una fuente externa. Los nuevos componentes deben consumir estos tokens para mantener la coherencia con Empresa.

En celular se conserva la navegación inferior de cinco accesos, controles táctiles y desplazamiento interior de los diálogos. El manifiesto y la pantalla sin conexión usan la misma paleta; el caché público pasa a v2 para actualizar esa pantalla, sin incorporar información privada.

Validación del cambio visual: **26 pruebas existentes aprobadas**, parseo del CSS, tokens de marca y ocho rutas/recursos locales comprobados. Chrome no pudo conectarse por el error CUA `timeoutMs`; la revisión visual real de escritorio y móvil sigue pendiente. No se ha desplegado esta actualización.

## Canal principal: portal · 2026-11-03

Qori Customer se entrega ahora como **portal web gratuito**, accesible desde computador y celular en `/customer/`. La aplicación nativa queda en pausa y se conserva en `apps/customer/`. No se necesita Expo ni una descarga de tienda para usar Customer. Las secciones posteriores registran entregas anteriores; este apartado define el canal vigente.

Al abrir el portal con sesión, **Inicio** reúne el tarjetero, los beneficios disponibles, las invitaciones y el gasto registrado del mes en la moneda principal. Da acceso a todos los módulos: explorar, directorio, escáner, identificación, tarjetas y tickets, conexiones, giftcards, regalos enviados, actividades, guardados, seguidos, solicitudes, historial, presupuestos, metas, recurrentes y cuenta. Sin sesión, la entrada sigue siendo el catálogo público. El acceso opcional desde la pantalla de inicio usa el mismo portal.

Se trasladaron a la web las preferencias de moneda, zona horaria y avisos, junto con la propuesta de negocios **Quiero Qori aquí**. Los avisos son preferencias guardadas; no hay push de navegador activo. El directorio permite buscar negocio/categoría y ciudad sin exigir que el establecimiento tenga todos los programas de fidelización. La ubicación se solicita exclusivamente al pulsar “Ordenar por cercanía”, se procesa en el navegador y no se transmite a la API. La distancia ordena los negocios cargados (48 por página), no promete un ranking global. Si no hay permiso, permanece la búsqueda por ciudad.

Empresa encuentra la misma cuenta por correo exacto o identificación Qori y envía invitaciones para sellos, afiliaciones, giftcards, actividades y tickets. También puede remitir una compra canónica al historial financiero mediante el flujo de entrega de ventas. El comprador acepta o rechaza; un envío no registra una compra ni duplica un beneficio.

Las activaciones aceptadas abren con el contexto de la invitación. Su participación usa la sesión Customer, se registra una sola vez por cuenta/actividad y coloca el premio original en Mis tarjetas y Mis actividades, incluso si la actividad no está publicada en el catálogo. La invitación debe estar aceptada y pertenecer a la cuenta; no permite apropiarse de una participación histórica por coincidencia de datos.

El catálogo de tickets ahora incluye los personales de activación y posventa ya asignados a ese comprador. Los de posventa aparecen en el portal únicamente después de aceptar la invitación. Se conserva el mismo QR y su estado vigente. Se excluyen tickets de reclamación, recompensas de sellos y regalos pagados del flujo genérico: cada uno conserva su proceso original, incluyendo confirmación de pago del negocio para regalar un producto. La API comprueba pertenencia al negocio y al destinatario tanto al enviar como al aceptar.

Código de entrada: `customer-web/index.html`, `app.js` y `portal.js`; servicios compartidos, sin migración adicional de base de datos en este cambio. Inicio permite registrar un gasto y actualiza el resumen tras guardarlo. La configuración de cuenta conserva el consentimiento existente.

Prueba local: `node scripts/customer-local-server.js`, con base aislada `qori_customer_qa`; entrada `http://127.0.0.1:3051/customer/`. No ejecutar los scripts de fixtures contra producción. La publicación productiva no está incluida en este cambio.

Validación de esta entrega: **88 pruebas aprobadas, cero fallos**, con integración sobre QA y pruebas de interacción DOM. Portal, archivos nuevos, manifiesto y directorio sirven HTTP 200; la cuenta sin sesión devuelve 401. La conexión CUA con Chrome falló con `Cannot read properties of undefined (reading 'timeoutMs')`: no hay nueva evidencia visual de escritorio/celular ni instalación física para este cambio. Las pruebas DOM no sustituyen esa revisión. [Evidencia del portal](evidence/customer-portal-qa-20261103.json).

## Ecosistema público web · 2026-11-03

La entrada pública de /customer/ es **Explorar**; con sesión abre Inicio. Cualquier visitante puede buscar publicaciones por texto, ciudad y tipo y abrir perfiles de negocios; entrar o registrarse es necesario para guardar, seguir, solicitar programas o participar con beneficios vinculados a su cuenta. La navegación autenticada reúne Inicio, Explorar, Finanzas, Mis tarjetas e Invitaciones; Mi cuenta está en el encabezado y el escáner es accesible desde Inicio y Explorar.

Empresa incorpora **Publicar en Qori**: perfil público, publicación/edición/borrador/pausa por activación, tarjeta de sellos, afiliados o giftcards, métricas agregadas y solicitudes de compradores. Solo propietarios y gerentes del negocio pueden publicar. Cada oferta referencia el programa original y comprueba negocio, suscripción, estado y vigencia. El perfil ya no exige ofrecer los tres tipos de fidelización: el estándar completo Somos Qori continúa siendo una evaluación separada.

El comprador puede compartir enlaces y QRs públicos, guardar ofertas y seguir negocios. **Quiero este programa** envía nombre, correo y documento al negocio con autorización explícita. El negocio verifica la identidad y remite una invitación; únicamente al aceptarla se crea o vincula la tarjeta canónica. No se inventan ventas ni se vinculan historiales por coincidencia de datos.

Las activaciones abiertas desde Customer reutilizan la experiencia pública y su motor de premios. La API autenticada registra la procedencia de la participación en la misma transacción, impide apropiarse de participaciones antiguas y conserva la idempotencia por cuenta/actividad. Los tickets obtenidos aparecen en el tarjetero, con estado vigente leído del QR original; **Mis actividades** conserva participaciones y descargas digitales disponibles. El enlace al beneficio original conserva la entrega de códigos ecommerce y sus condiciones.

Las giftcards publicadas pueden solicitarse sin que el negocio tenga sellos o puntos. Continúan en PENDING_PAYMENT hasta la confirmación empresarial; la emisión usa el servicio de giftcards existente. Las invitaciones de obsequios conservan su flujo separado.

**Escanear** incluye cámara a petición del usuario, lectura local con jsQR, imagen y enlace pegado. Resuelve publicaciones y QRs públicos de activación/inscripción; rechaza orígenes externos y QRs privados de canje. La cámara se detiene al salir. El manifiesto PWA incluye iconos oficiales 192/512 y acceso desde inicio; el service worker guarda solo una pantalla sin conexión y un recurso público, nunca APIs, sesiones, tarjetas ni QRs privados.

Migración adicional 20261103185938_qori_customer_ecosystem_publications.sql, idéntica en database/supabase, aplicada únicamente a QA. Cinco tablas nuevas con RLS y sin permisos públicos: publicaciones, guardados, solicitudes, eventos y participaciones. El catálogo usa páginas de 24 registros; historial de participaciones/solicitudes y seguidos tienen límite de 100. Las métricas contabilizan acciones autenticadas, con deduplicación breve; no representan ventas ni todo el tráfico anónimo.

Validación final: **53 pruebas aprobadas**, incluyendo premios históricos, giftcard independiente, aislamiento de seguidos e iconos/PWA/lector. Inspección en Chrome del catálogo y el editor de Empresa; publicación de una activación ficticia confirmada en la base QA. La conexión de Chrome se interrumpió antes de completar la nueva revisión móvil, cámara e instalación. Las pruebas visuales móviles de las secciones anteriores corresponden al tarjetero y a invitaciones, no a esta ampliación.

Estado: implementación local, sin despliegue ni migración productiva. Para probar la activación de demostración, ejecutar scripts/customer-ecosystem-local-setup.js después del setup anterior. No hay evidencia de instalación en dispositivo físico, cámara real ni envío de OTP mediante proveedor productivo en esta entrega. Push, comentarios públicos, ranking/recomendaciones y moderación editorial avanzada siguen fuera de esta versión; interacción disponible significa guardar, seguir, compartir, solicitar y participar.

Actualización del 30 de octubre: [tarjetero y estándar Somos Qori](QORI_TARJETERO.md). Allí se documentan los flujos y límites nuevos. Las capturas y evidencia de 33 pruebas de este documento corresponden a la entrega anterior.

Trabajo aislado: rama `feat/qori-customer`, creada desde `c8caef7`. El checkout principal tiene cambios previos y no se modificó. Esta entrega implementa la primera etapa y una base funcional de las etapas siguientes. No es una publicación en tiendas ni un cierre de todo el alcance.

Contratos y ejemplos: [QORI_CUSTOMER_API.md](QORI_CUSTOMER_API.md). Código móvil: `apps/customer/src`. Capturas reales de la base QA: [inicio](evidence/customer-home-390.jpg), [tarjeta](evidence/customer-wallet-390.jpg) y [formulario](evidence/customer-form-360x500.jpg).

## Primera versión web de fidelización · 2026-11-03

La entrada web es `/customer/`, servida por el mismo backend desde `customer-web/`, sin compilación ni instalación. Registro e ingreso gratuitos mediante correo y código de seis dígitos; no requiere suscripción ni tarjeta bancaria del comprador. El código de Expo se conserva para una etapa posterior; el portal es la entrega activa.

El tarjetero reúne sellos, puntos y giftcards, agrupados por ID de negocio y conservando cada programa. Incluye búsqueda, filtros, beneficios disponibles, historial, detalle y QR bajo demanda. Una conexión confirmada con cada negocio incorpora sus programas compatibles; la opción visible de incluir historial está marcada inicialmente en esta web y puede desmarcarse antes de confirmar. Nunca se vincula por coincidencia de correo, nombre o teléfono. El negocio propone la conexión verificando el documento; el comprador acepta desde **Mis negocios**. **Mi Qori** presenta su identificación. La tarjeta pública de sellos ofrece un acceso a esta cuenta.

La web usa una cookie HttpOnly, SameSite=Strict, Secure en producción, limitada a `/api/customer`. Las mutaciones exigen origen permitido y `X-Qori-Web: 1`; el token no se devuelve al JavaScript del navegador. La aceptación del aviso se conserva en las preferencias aun después de editar el perfil. Se pueden consultar y cerrar sesiones, exportar datos, desconectar negocios y eliminar la cuenta personal. La sesión nativa Bearer sigue siendo compatible.

La consulta de resumen evita generar QRs de todas las tarjetas. Se actualiza al recuperar el foco, manualmente y cada 60 segundos mientras la página está visible, sin interrumpir formularios ni detalles abiertos. No es una suscripción en tiempo real. El resumen todavía no está paginado; medir volumen antes de ampliar a cuentas con grandes historiales.

Validación local: 34 pruebas aprobadas entre Customer web, agrupación/filtros, integración existente y finanzas. Incluyen dos negocios con el mismo nombre, varios programas, aceptación explícita, aislamiento entre compradores, ventas canónicas, anulación de sellos, saldo y agotamiento de giftcards, origen de solicitudes y revocación. Chrome permitió revisar acceso por código, tarjetero, filtros y detalles a 390 px, con modal desplazable sin desbordamiento horizontal. Esto no constituye una prueba en dispositivo físico ni un despliegue de producción. El correo local se entrega al buzón QA, no a un proveedor real.

Para revisar: ejecutar `node scripts/customer-local-server.js` con la base aislada `qori_customer_qa` disponible en el puerto 55441, y abrir `http://127.0.0.1:3051/customer/`. El comprador ficticio es `comprador-customer@example.test`; el código solicitado se guarda en `.local-customer/mailbox`. Este helper nunca debe usarse en producción. La publicación necesita ambas migraciones Customer, `PUBLIC_APP_URL` HTTPS y correo Resend configurado y verificado.

## Red Empresa–Customer e invitaciones · 2026-11-03

Qori Empresa puede localizar una cuenta personal por correo exacto o identificación Qori, aunque no exista contacto, afiliación ni compra previa en ese negocio. La respuesta solo entrega nombre, identificación pública y estado de la relación propia. No hay listado de todas las cuentas ni búsqueda parcial por nombre; se limitan las consultas por negocio.

Desde **Conectar Qori Customer** se envían invitaciones de tarjeta de sellos, afiliación, giftcard de regalo, actividad interactiva o ticket de activación. **Mis invitaciones** permite aceptar/rechazar y silenciar futuros envíos de un negocio. El remitente ve únicamente sus propios envíos y puede cancelar los pendientes. La compra previa dejó de ser condición para proponer una relación. Para sellos y afiliaciones el operador todavía verifica el documento; el comprador confirma la conexión al aceptar y el historial anterior es opcional, desmarcado inicialmente en este flujo.

Aceptar crea o reutiliza las tarjetas canónicas. Las actividades abren su experiencia pública y conservan sus reglas de participación; aceptar una invitación no equivale a completar la actividad ni ganar un premio. Los tickets seleccionables ya deben estar emitidos para el comprador, pertenecer al negocio y ser de origen INTERACTIVE_ACTIVATION; enviar no emite un ticket adicional. Se consultan su estado y vigencia al mostrarlos. Los tickets de activaciones asociados a una relación documental aceptada también aparecen en el tarjetero.

Las giftcards enviadas como regalo son obsequios del negocio: no crean una venta ni registran un pago. Al aceptar se emiten mediante rewardPassService, con cupos/créditos/sedes y vigencia canónicos. La compra de una giftcard conserva el flujo distinto PENDING_PAYMENT y confirmación empresarial del pago. Se validan nuevamente permisos del emisor y disponibilidad al aceptar. La transacción y la clave de idempotencia impiden emisión doble o estados parciales.

Migración adicional: `20261103170919_qori_customer_network_invitations.sql`, idéntica en database y supabase. Tablas con RLS y grants públicos revocados, acceso exclusivamente por API. El buzón muestra hasta 200 envíos y el catálogo de tickets hasta 100 candidatos; la paginación queda pendiente para mayor volumen. No se enviaron mensajes externos ni correos promocionales: son invitaciones dentro de Customer.

Validación de backend: 43 pruebas aprobadas (integración Customer, web, red, filtros y finanzas), incluyendo comprador sin ventas previas, concurrencia de aceptación, aislamiento, tickets consumidos, rechazo/cancelación/bloqueo, emisor inactivo y falta de créditos. Trabajo local; sin publicación ni migración de producción.

Validación visual: Chrome, con negocio y comprador ficticios en QA: búsqueda de identidad en Empresa, envío de regalo, recepción en Mis invitaciones, aceptación y apertura del QR emitido. Bandeja a 390 px con scrollWidth 375, sin desbordamiento horizontal. Se corrigió una colisión de nombres con el módulo previo Somos Qori; ambos accesos conservan funciones distintas. La bandeja y el contador se actualizan al recuperar foco y cada 60 segundos, sin interrumpir formularios ni diálogos abiertos. Sin prueba en dispositivo físico.

## Arquitectura y decisiones

- App Expo SDK 58 / React Native 0.88, TypeScript y Expo Router, en `apps/customer`.
- API Express existente: `/api/customer` para compradores; `/api/business/customer` para operadores del portal.
- Postgres conserva `business_sales` como registro de ventas. El historial del comprador consulta esas filas; no copia las ventas a una segunda contabilidad. Su propia organización se guarda en tablas separadas.
- Las identidades personales (`customer_accounts`) están separadas de `app_users`. Ningún token del comprador sirve como sesión empresarial, ni a la inversa.
- Acceso por código de correo, HMAC, caducidad, límite persistente de intentos y sesiones opacas revocables. No hay contraseña que recuperar: solicitar otro código recupera el acceso al correo verificado.
- Sesión en SecureStore en dispositivos; el export web de Expo usa sessionStorage por pestaña. La nueva entrada `/customer/` utiliza la cookie protegida descrita arriba. Nunca se envían claves privadas a la app.
- RLS activado y grants públicos revocados en las tablas nuevas. El acceso pasa por el backend y consultas con propietario explícito.
- Paleta y logotipo de los recursos oficiales del repositorio. La aplicación usa la tipografía del sistema disponible en cada plataforma; no incluye aún una fuente Inter local.

## Vinculación empresa/comprador

1. El comprador entra con su correo y abre **Mi QR**.
2. El operador abre el QR con la cámara del dispositivo o con el Validador del portal. También puede usar **Conectar Qori Customer** y pegar la identificación.
3. Verifica presencialmente el documento. Puede conectar a una persona que todavía no figure en los registros del negocio.
4. Envía una solicitud. Esta acción sola no da acceso al historial.
5. El comprador confirma desde Inicio. Puede incluir expresamente compras y tarjetas anteriores; el valor predeterminado es no incluirlas.
6. Las ventas nuevas registradas con ese documento en ese negocio aparecen en la app. No se vincula por similitud de nombres, correo o teléfono.

Un documento normalizado solo puede tener una relación aceptada por negocio. El comprador puede desconectarlo. Las compras sin identificación compatible quedan fuera hasta resolver la vinculación. No se verifican documentos gubernamentales automáticamente: el control presencial del operador y el consentimiento del comprador son parte del flujo.

La app consulta al entrar, al recuperar el foco y cada 15 segundos mientras la pantalla correspondiente está activa. Recupera el estado de la base al reconectar. Esta versión no usa push ni una réplica offline del historial.

## Modelo financiero

- Totales en unidades menores enteras; almacenamiento monetario `numeric(14,2)`.
- Monedas COP, USD y EUR separadas; no hay conversión implícita.
- `PAID` cuenta como gasto pagado; otras situaciones se muestran por separado. `VOIDED` permanece visible y no suma gasto.
- Para ventas históricas `PAID` sin `paid_at`, se usa `created_at`, según el contrato actual del portal. No se vuelve a contar un pago como compra.
- El estado actual de la venta se atribuye al periodo de su fecha original. No hay un estado de flujo bancario por fecha de devolución.
- Una anulación total del portal se refleja automáticamente y el servicio existente revierte los sellos correspondientes.
- Aún falta el flujo comercial completo de devoluciones parciales y cuotas. La tabla de ajustes está preparada pero no existe una interfaz que invente ajustes ni cambie los saldos comerciales sin ese flujo. No considerar el indicador de devoluciones un historial completo mientras esto esté pendiente.
- El usuario puede cambiar categoría, prioridad y nota de una compra oficial, nunca su importe.
- Gastos manuales e ingresos son independientes. Un gasto puede distribuirse entre categorías; los importes deben sumar su total.
- Los productos solo se analizan cuando existen líneas reales. No se reparten descuentos globales entre productos sin evidencia. Productos sin un ID estable no se agrupan entre transacciones.
- Semana desde lunes, cortes según zona horaria personal y periodos incompletos comparados con un intervalo equivalente anterior.
- Los presupuestos y el asistente usan el mismo cálculo que el tablero. No configurar presupuesto no equivale a tener presupuesto cero.
- Una meta registra lo que la persona declara haber apartado: no reserva ni transfiere dinero. Los recurrentes son recordatorios previstos, no movimientos ya pagados.
- El asistente actual usa reglas verificables: variación de gasto, comercios frecuentes, presupuesto y gastos marcados flexibles. No requiere proveedor de IA.

## Ejecución

Requisitos: Node compatible con Expo 58 (22.13+ de la rama 22 o versiones indicadas por Expo), npm y PostgreSQL 18 para las pruebas locales. Backend y app tienen lockfiles independientes.

```powershell
# En la raíz del worktree
npm ci
cd apps/customer
npm ci
# Copiar .env.example a .env.local y configurar EXPO_PUBLIC_API_URL
npm run web
```

La API se configura con las variables existentes `DATABASE_URL`, `DB_SSL`, `JWT_SECRET`, `PUBLIC_APP_URL`, `CORS_ORIGINS`, `RESEND_API_KEY` y `CONTACT_MAIL_FROM`. Debe aplicarse primero la migración `20261028202855_qori_customer.sql` con el procedimiento normal del proyecto. Los archivos de `database/migrations` y `supabase/migrations` deben conservarse idénticos; son dos ubicaciones del mismo cambio, no dos migraciones a ejecutar sucesivamente.

No ejecutar los comandos de QA contra producción.

```powershell
# PostgreSQL local dedicado: 127.0.0.1:55441. Crear una base vacía una sola vez:
psql -h 127.0.0.1 -p 55441 -U postgres -d postgres -c "create database qori_customer_qa"
node scripts/customer-local-setup.js
# Opcional: datos de prueba explícitos
node scripts/customer-local-preview.js
node scripts/customer-local-server.js
```

En este equipo existe un cluster aislado en `.local-customer-pg`, con puerto 55441, y un Node 22 local en `.local-customer/tools/node_modules/node/bin/node.exe`. Esos directorios están ignorados y no se incluyen en la entrega versionada.

`customer-local-server.js` escucha solo en loopback, puerto 3051. Activa un buzón OTP local exclusivamente cuando la base es `qori_customer_qa` en loopback y no es producción. No envía correos reales. Cada código se escribe en `.local-customer/mailbox/<challenge_id>.json`.

Cuenta de vista previa: `comprador-customer@example.test`. Negocio: `negocio-customer@example.test`. Las credenciales empresariales de QA se encuentran en `.local-customer/preview.json`. Los comercios y gastos de prueba están marcados como tales; no son métricas de usuarios reales.

```powershell
# En apps/customer, con EXPO_PUBLIC_API_URL=http://127.0.0.1:3051
npm run build:web
# En otra terminal, en la raíz
node scripts/customer-web-preview.js
# Abrir http://127.0.0.1:8081
```

Para un dispositivo físico debe utilizarse una API HTTPS de staging accesible desde ese dispositivo; 127.0.0.1 apunta al propio teléfono.

### Vista web temporal desde Android en la misma red

Se añadió `scripts/customer-mobile-preview.js`, exclusivamente para la base QA local. Exportar web con `EXPO_PUBLIC_API_URL=http://<IP-LAN>:8082` y `--output-dir ../../.local-customer/mobile-dist` desde apps/customer; iniciar el helper desde la raíz con `CUSTOMER_PREVIEW_HOST=<IP-LAN>`. Requiere la API QA en 127.0.0.1:3051.

El helper escucha solo en la IP privada seleccionada, requiere un enlace aleatorio de acceso con vigencia de cuatro horas y publica únicamente la app y las APIs Customer. Guarda enlace y QR en `.local-customer/mobile-access.json` y `.local-customer/mobile-qr.png`. No compartir este enlace: permite acceder a la prueba y al código de la cuenta ficticia. No desplegar este helper ni usar datos reales. No configura el firewall ni un túnel público.

En Android: abrir el enlace en Chrome, solicitar código para `comprador-customer@example.test`, consultar `/_qa-code` en otra pestaña del mismo navegador y escribirlo en Qori. La página de códigos está protegida por el mismo acceso temporal y solo muestra el último código de esa cuenta ficticia. No envía correo real.

Si el navegador pierde la clave del enlace, la dirección base muestra un formulario «Clave de prueba». Usar `preview_code` de `mobile-access.json`; hay un límite de diez intentos por minuto por IP. La clave temporal no sustituye el acceso personal. El helper inyecta una cabecera de acceso en las peticiones de esta vista para que las APIs no dependan de cookies del navegador integrado. Los assets compilados son públicos, pero las APIs y el buzón siguen protegidos. Se comprobaron formulario, clave válida, carga del documento con cabecera, buzón con enlace completo, 403 sin acceso temporal y 401 sin sesión personal.

Corrección del formulario móvil: `no-referrer` producía `Origin: null` en envíos HTML, que el helper rechazaba. Se cambió a `strict-origin`, conservando la exclusión de rutas y claves del Referer. Se admite además el formulario anterior con Origin null únicamente si Sec-Fetch-Site indica same-origin, siempre validando clave y límite de intentos. Reproducción HTTP antes: 403; después: 200 para origen local y formulario anterior, 403 para origen externo y clave incorrecta. Referencia: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy#effect_on_the_origin_header.

Es una vista web HTTP para revisar gastos y tarjetas; cámara, ubicación y otras funciones que requieren HTTPS pueden no estar disponibles. No sustituye la compilación nativa. Verificados HTTP 200, acceso por código y consulta del dashboard a través del gateway, además de TypeScript/ESLint. La comprobación automática del navegador de esta variante se bloqueó; falta confirmar acceso desde un Android físico y posibles restricciones del firewall/router.

## Pruebas

```powershell
node --test test/customerFinance.test.js test/customer.integration.test.js test/validatorScannedCart.test.js test/validatorBeneficiary.test.js test/stampCardQr.test.js
cd apps/customer
npm run typecheck
npm run lint
npx expo export --platform all
```

Las pruebas Customer fuerzan la conexión a la base local indicada; no leen credenciales productivas. La integración crea registros QA únicos, usa los endpoints existentes de venta y anulación, y no elimina datos externos.

Evidencia observada en esta entrega:

- Suite final: 33 pruebas aprobadas, incluidos aislamiento de identidad, OTP consumible, vinculación explícita, venta empresarial, sello, reintento, gasto manual, recibos, deduplicación, anulación y QR Customer sin autorización implícita de canje.
- TypeScript y ESLint sin errores tras correcciones.
- Exportación web y bytecode Hermes Android/iOS generados correctamente. Esto no equivale a APK/AAB/IPA firmados.
- Prueba en Chrome a 390 × 844: acceso con OTP local, gasto manual de $6.500 persistido, total de QA actualizado de $75.000 a $81.500 y navegación desde categoría al movimiento. Ancho del documento: 390 px.
- Revisión a 360 × 800 sin desbordamiento horizontal; formulario a 360 × 500 con campo enfocado y botón Guardar alcanzable mediante scroll. Esta reducción de altura no sustituye una prueba del teclado nativo.
- Recarga directa de /finances comprobada tras corregir el fallback de la vista previa dentro del worktree. No se ha usado emulador ni dispositivo físico.

## Distribución

`eas.json` incluye perfiles development, preview y production. `app.config.js` exige una API HTTPS en EAS. Los identificadores propuestos son `com.gosqori.customer`; confirmar su disponibilidad antes del registro definitivo.

```powershell
cd apps/customer
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile production --platform all
```

Pendientes para distribución: proyecto/cuenta EAS, variable HTTPS de staging/producción, cuenta de desarrollador Apple y Google Play, certificados y firma, revisión de permisos y privacidad, pruebas físicas con teclado/cámara/archivos y entrega a revisión de tiendas. No se han realizado envíos, compras de servicios ni publicación.

## Alcance pendiente

La primera etapa tiene flujo real ejecutable. El alcance total aún requiere:

- Devoluciones parciales y cuotas integradas coherentemente con el registro comercial y los beneficios.
- Notificaciones push y avisos programados; hoy las preferencias se guardan y la app consulta al abrirse.
- Completar canjes, referidos, cupones y todos los estados históricos de afiliados más allá de la consulta de afiliaciones y tarjetas de sellos.
- Tramitación comercial y aviso automático de los negocios solicitados que se incorporan.
- Mejores reglas de clasificación recordadas, categorías personalizadas, agrupación segura de productos manuales y evolución histórica por producto.
- Límites/paginación y optimización para historiales de gran volumen; el MVP consulta el rango financiero completo.
- Carga visual de recibos y comportamiento nativo en dispositivos físicos; el backend de recibos privados sí está probado.
- Remediación de dependencias antes de distribución. Se ejecutó npm audit: backend existente con 5 avisos (1 crítico, 3 altos, 1 moderado: proxy-addr, body-parser, nodemailer, zod y qs); aplicación con 8 (3 altos y 5 bajos, incluyendo zod/deepmerge y sus dependientes Expo). No se aplicó el downgrade incompatible de Expo sugerido por npm ni una actualización mayor indiscriminada del portal. Estos avisos requieren resolución y regresión antes de un lanzamiento.
- OCR, conexiones bancarias, IA conversacional y Apple/Google Wallet son ampliaciones posteriores, según el alcance acordado.

Referencias de plataforma consultadas: https://docs.expo.dev/versions/v58.0.0/, https://docs.expo.dev/router/installation/, https://supabase.com/docs/guides/database/postgres/row-level-security.


## Regalar productos con tickets de Empresa · 2026-11-03

Decisión del usuario: pago directo al negocio; el negocio confirma y Qori entrega el ticket.

- Empresa → Publicar en Qori → Producto para regalar: referencia propia del inventario, precio COP, condiciones, instrucciones de pago y vigencia.
- Customer → Explorar → Regalos → Regalar este producto: correo completo o identificación Qori del destinatario existente y mensaje opcional. La solicitud guarda precio y condiciones; no cobra, no crea una venta ni emite un QR.
- Customer → Mis regalos enviados: referencia, destinatario, instrucciones y seguimiento del pedido. Puede cancelar una solicitud todavía pendiente; no hay reembolso automático de pagos externos.
- Empresa → Publicar en Qori → Regalos comprados: confirma importe exacto, medio y referencia del pago recibido. En una transacción se descuentan una unidad y un crédito QR, se registra la venta PAID al comprador, se crea el ticket existente de Empresa y la invitación para el destinatario. Reintentos y confirmaciones simultáneas conservan una única emisión.
- Destinatario → Invitaciones: acepta o rechaza. Aceptar incorpora el ticket al tarjetero con remitente y mensaje. Solo el destinatario obtiene el QR; el comprador conserva su recibo y su compra, sin acceso al QR ajeno.
- El Validador reconoce el producto ya pagado y ofrece entregarlo. Verifica el correo del destinatario y aceptación, pago y vigencia; no registra otra venta ni descuenta de nuevo inventario. Una venta anulada bloquea la entrega y oculta el QR en Customer.

Reutiliza createPostSaleQr, business_sales, qr_codes, customer_invitations y el canje existente. La emisión acepta una transacción compartida y distingue comprador de destinatario. Se corrigió además la desestructuración que confundía la sede con el afiliado al generar tickets.

Migración nueva: 20261103195525_qori_customer_product_gifts.sql (copias idénticas en database y supabase). Ambas tablas nuevas tienen RLS y permisos públicos revocados. El entorno QA no contiene roles anon/authenticated; la migración revoca sus permisos cuando existen.

QA local: 64 pruebas aprobadas (61 de regresión de Customer y 3 de interfaz con DOM: compra, edición/confirmación en Empresa y entrega en Validador). Registro local: .local-customer/product-gifts-regression.tap. El DOM no prueba diseño, tamaño de pantalla ni instalación. La conexión CUA con Chrome falla al seleccionar una pestaña con “Cannot read properties of undefined (reading 'timeoutMs')”; la revisión visual de este flujo sigue pendiente. No se desplegó ni se probaron cobros reales o dispositivos físicos.

Para reproducir los formularios: instalar dependencias de desarrollo y ejecutar node --test test/customerProductGiftUI.test.js. En el worktree con node_modules compartido, se usó una instalación aislada: npm install --prefix .local-customer/qa-tools jsdom@26.1.0 --no-audit --no-fund. No se agregaron dependencias de producción.

Vista previa: http://127.0.0.1:3051/customer/. scripts/customer-ecosystem-local-setup.js publica “Un café de tu parte” y prepara destinatario-customer@example.test (Camilo Demo), exclusivamente en qori_customer_qa. Las instrucciones del café aclaran que no se debe transferir dinero en esta demostración.

## Finanzas en la web y recepción de compras · 2026-11-03

Customer incorpora Finanzas en la navegación principal: resumen, historial y planificación. El resumen permite día, semana, mes, año o rango; mantiene COP, USD y EUR separados; muestra categorías, negocios, productos, compras promedio, ingresos declarados, pendientes y devoluciones. Las barras y avisos permiten abrir los movimientos que explican cada cifra. Los avisos de presupuesto abren el periodo concreto del presupuesto, incluso cuando el resumen general muestra otro rango.

El historial filtra por texto, categoría, origen, tipo, prioridad y estado; exporta CSV con protección de celdas que podrían interpretarse como fórmulas. El comprador registra y edita gastos o ingresos, productos, distribución por categorías, etiquetas y notas; adjunta JPG/PNG/PDF privados de hasta 5 MB. Las compras de Empresa permiten clasificación personal y reporte al negocio, sin modificar el importe comercial. Las coincidencias entre gasto manual y compra requieren confirmación para vincularse; quedan una sola vez en el resumen y conservan notas y comprobantes.

Planificación incluye presupuestos semanales/mensuales, avisos por porcentaje, metas con avance declarado y pagos recurrentes. Registrar un vencimiento requiere confirmar el pago o ingreso y su fecha: crear una recurrencia no genera un gasto. Dos confirmaciones simultáneas del mismo vencimiento crean una sola entrada.

Empresa incorpora “Enviar compra a Customer”: busca una venta existente, busca la cuenta por correo exacto o identificación Qori y exige verificar que corresponde al comprador. La primera recepción requiere aceptación. Al aceptar, el comprador puede autorizar próximas ventas atribuidas automáticamente y revocar esa autorización desde Finanzas. Las conexiones verificadas por documento mantienen su captura automática y su decisión sobre historial anterior. Nunca se vincula una cuenta por mera coincidencia de correo o nombre.

Una entrega referencia business_sales y conserva vendedor, sede y pago originales. No crea otro libro de ventas ni otro cobro. Las anulaciones se reflejan en Customer. La venta entregada no se reasigna silenciosamente a otra cuenta; un negocio solo consulta sus ventas y reportes recibidos, nunca gastos personales o compras ajenas del cliente.

Migración: 20261103204444_qori_customer_finance_delivery.sql. customer_sale_deliveries, customer_finance_connections y customer_recurring_posts tienen RLS, permisos públicos revocados e índices de propietario. Eliminar la cuenta elimina sus accesos y registros personales y conserva las ventas originales del negocio.

Pruebas nuevas: customerFinanceDelivery.integration.test.js y customerFinanceUI.test.js. Resultado final: 80 pruebas aprobadas, 0 fallidas. Registro de regresión: .local-customer/finance-regression.tap. Se verificó también la actualización automática de Finanzas al volver a la página y cada minuto, respetando formularios y diálogos abiertos. Las pruebas DOM verifican interacción y solicitudes, no diseño visual ni uso en un celular físico. CUA/Chrome sigue fallando con “Cannot read properties of undefined (reading 'timeoutMs')”.

Demostración local: scripts/customer-finance-local-setup.js agrega siete ejemplos ficticios, un presupuesto, una meta y una recurrencia a comprador-customer@example.test, solo en qori_customer_qa. Abrir http://127.0.0.1:3051/customer/#finances. Sin despliegue, conexión bancaria u OCR; la captura automática implementada proviene de ventas atribuidas de Empresa y conexiones autorizadas.
