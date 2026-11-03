# Contrato inicial de Qori Customer

El cliente principal es el portal `customer-web/`, con sesión web HttpOnly. Las rutas Bearer de la implementación nativa se conservan por compatibilidad; el desarrollo de esa app queda en pausa.

`GET /api/customer/explore/directory?search=&city=&offset=0` es público. Devuelve `{businesses,next_offset}` con un máximo de 48 negocios publicados por página; cada negocio expone únicamente `id`, `name`, `slug`, `category`, `city`, `address`, `latitude` y `longitude`. Excluye negocios inactivos o sin acceso al portal. No recibe la ubicación del comprador.

El portal usa los contratos existentes `PATCH /me` para nombre, moneda, zona horaria y preferencias de avisos; `GET/POST /place-requests` para sugerencias propias de negocios; y `GET /dashboard` para su resumen de inicio. Las sugerencias no crean una afiliación empresarial.

Los tickets asociables mediante `/api/business/customer/catalog/:public_id` y `/invitations` incluyen activaciones y posventa personales ya asignadas al destinatario. Los de posventa exigen invitación aceptada para consultarlos en `/wallet/tickets/:id`. Los tickets de reclamación, sellos y productos regalados mantienen sus flujos específicos.

`POST /api/customer/invitations/:id/participants` y `POST /api/customer/invitations/:id/complete` reutilizan los contratos de participación pública, con sesión Customer y propiedad de una invitación ACTIVITY aceptada. Validan negocio habilitado y actividad vigente; comparten la deduplicación por cuenta/actividad con las publicaciones. El enlace devuelto en `activity_url` lleva `customer_invitation` para preservar este contexto en la experiencia pública. Los premios usan el QR canónico y la participación puede tener `publication_id=null`.

Implementación de referencia: `backend/src/routes/customerRoutes.js`. Todas las peticiones y respuestas son JSON. Los importes de escritura son cadenas decimales, nunca floats. Los importes calculados con sufijo `_minor` son enteros en centésimas de la moneda indicada. No sumar monedas diferentes.

## Sesión e identidad

### Red de invitaciones

Empresa, bajo `/api/business/customer`, con sesión empresarial y portal habilitado:

- `POST /lookup {query}`: correo exacto o identificación Qori. Devuelve `{buyer:{public_id,full_name,relationship_state}}`; no expone email, documento, finanzas ni otros negocios. Máximo 30 consultas/minuto por negocio en cada proceso.
- `GET /catalog/:public_id`: programas propios activos, actividades propias disponibles y tickets ya asignados al destinatario.
- `POST /invitations`: `{request_id,public_id,kind,resource_id?,document_id?,identity_checked?,amount?,terms?,message?}`. Tipos STAMP, AFFILIATION, GIFT, ACTIVITY, TICKET. Sellos/afiliación requieren documento verificado; regalos requieren importe y condiciones; programa/actividad/ticket requieren resource_id. Propietarios y administradores empresariales pueden enviar; validadores solo buscan/proponen conexión. Máximo diez envíos al mismo comprador por negocio/día.
- `GET /invitations/:public_id`: últimos 100 envíos propios a esa cuenta.
- `POST /invitations/:id/cancel`: cancela únicamente un envío propio pendiente.

Customer, bajo `/api/customer`, con sesión personal:

- `GET /invitations`: últimos 200 envíos propios y negocios silenciados; solo las actividades aceptadas vigentes incluyen enlace de participación.
- `POST /invitations/:id/decision {action,terms_accepted?,include_history?,document_id?}`: ACCEPT exige terms_accepted; regalos exigen documento para su uso. REJECT no activa recursos. Incluye result_id al aceptar; los reintentos no vuelven a emitir.
- `PUT /business-blocks/:business_id {blocked}`: silencia futuros envíos y rechaza los pendientes; conserva beneficios ya aceptados.
- `GET /wallet/tickets/:id`: detalle y QR solo del ticket propio, activo y vigente. El resumen añade kind TICKET.

El correo conocido permite dirigir una invitación, nunca conectar automáticamente historiales. Una relación nueva no exige una venta previa. Los regalos promocionales no alteran business_sales ni el gasto del comprador.

Base personal: `/api/customer`. Los clientes nativos envían `Authorization: Bearer <token>` con la sesión opaca Customer. La web `/customer/` usa la cookie `qori_customer_session` HttpOnly, SameSite=Strict, Secure en producción, Path=/api/customer; sus mutaciones exigen `X-Qori-Web: 1` y Origin coincidente. No acepta JWT empresarial. Las respuestas privadas llevan `Cache-Control: private, no-store`.

### Acceso y resumen web

| Método y ruta | Entrada / resultado |
| --- | --- |
| POST /auth/web/code | `{email}` y origen/cabecera web → `{challenge_id,message}` |
| POST /auth/web/verify | `{challenge_id,code,consent:true}` → cookie, `{account,session:{expires_at}}`; no devuelve token |
| GET /wallet/overview | `{cards,purchased_gifts,updated_at,free_for_buyers:true}`; tarjetas STAMP/POINTS/GIFT con business_id; sin QR ni documento |
| GET /wallet/cards/:id | Detalle canónico con identificación/beneficio QR de tarjeta propia mediante relación aceptada; 404 para otra cuenta |

Logout revoca la sesión y borra la cookie. PATCH /me conserva las preferencias previas, incluido el registro de aceptación del aviso, al actualizar las opciones editables. La cuenta gratuita no crea cobros ni una suscripción empresarial.

| Método y ruta | Entrada / resultado |
| --- | --- |
| POST /auth/code | `{email}` → `{challenge_id,message}`; código por correo o buzón local QA explícito |
| POST /auth/verify | `{challenge_id,code,device_name?}` → `{token,session,account}` |
| GET /me | `{account,categories}` |
| PATCH /me | `{full_name,currency,timezone,preferences:{notifications:{purchases,benefits,budget,summary}}}`; cuatro booleanos |
| GET /sessions | Sesiones propias y sesión actual |
| DELETE /sessions/:id | Revoca únicamente una sesión propia |
| POST /logout | Revoca sesión actual |
| GET /identification | Identificación pública y QR; no es un token de acceso |
| GET /relationships | Relaciones propias pendientes o aceptadas |
| POST /relationships/:id/decision | `{action:"ACCEPT"|"REJECT"|"REVOKE",include_history:false}` |
| GET /export | Exportación personal, incluyendo recibos; contiene información privada |
| DELETE /me | `{confirmation:"ELIMINAR MI CUENTA"}`; elimina datos Customer, conserva registros originales empresariales |

Las sesiones duran 30 días. Un código dura 10 minutos, admite 5 intentos y se consume al entrar. Pedir otro código invalida el anterior. No almacenar códigos ni tokens en logs.

## Movimientos y métricas

| Método y ruta | Entrada / resultado |
| --- | --- |
| GET /dashboard | Query `period=day|week|month|year|custom`, `anchor=YYYY-MM-DD`, `currency=COP|USD|EUR`; custom requiere `from` y `to` |
| POST /entries | Crea un movimiento personal; ejemplo abajo |
| GET /entries/:id | `{entry,receipts}` propio |
| PUT /entries/:id | Mismo contrato de creación; solo registros personales sin vincular |
| DELETE /entries/:id | Eliminación lógica personal, elimina sus adjuntos |
| GET /sales/:id | `{movement,adjustments,receipts}` de una venta accesible por relación aceptada |
| PATCH /sales/:id/note | `{category,priority,note}`; rechaza campos adicionales como importe |
| POST /sales/:id/report | `{reason}`, mínimo cinco caracteres |
| GET /entries/:id/matches | `{candidates,requires_confirmation:true}`; candidatos no constituyen prueba de identidad |
| POST /entries/:id/link | `{sale_id,confirmed:true}`; conserva notas y referencia oficial sin doble conteo |
| POST /entries/:id/receipts | `{filename,mime_type,base64}`; JPG, PNG o PDF, máximo 5 MB y cinco adjuntos |
| GET /receipts/:id | `{receipt:{id,filename,mime_type,base64}}` solo propietario |
| DELETE /receipts/:id | Solo propietario |

```json
{
  "request_id": "c1cb1a17-5b8c-4f59-99ac-028dffdb42f0",
  "kind": "EXPENSE",
  "amount": "6500",
  "currency": "COP",
  "occurred_at": "2026-10-28",
  "merchant": "Transporte",
  "category": "transporte",
  "priority": "ESSENTIAL",
  "note": "Trayecto personal",
  "payment_method": "efectivo",
  "products": [],
  "splits": [],
  "tags": []
}
```

Reutilizar `request_id` al reintentar una creación; otro gasto lleva otro UUID. `kind` admite EXPENSE e INCOME. Fecha admite día local o ISO con offset. Prioridad: UNSET, ESSENTIAL, FLEXIBLE. Productos opcionales: `{name,quantity,amount}`, donde amount es el importe de la línea. Distribuciones: `{category,amount}`; deben sumar el total. El tablero expone movimientos, totales, comparaciones, categorías, establecimientos, productos, hábitos e insights calculados por el mismo motor.

## Beneficios, planificación y lugares

- `GET /wallet`: tarjetas reales y resumen de afiliaciones. `POST /wallet/cards/:id/claim` recibe `{cycle_id}`; `POST /wallet/cards/:id/renew` renueva según reglas existentes. No son endpoints de sellado ni sustituyen al Validador.
- `GET /planning`: presupuestos, metas y obligaciones. `POST /budgets`: `{category:"ALL"|categoria,period:"week"|"month",currency,amount,threshold}`. Umbral entero 1–100; actualiza el mismo presupuesto por categoría/periodo/moneda.
- `POST /goals`: `{name,currency,target}`. `PUT /goals/:id/progress`: `{recorded_amount}`, declaración personal; no transferencia financiera.
- `POST /recurring`: `{name,currency,amount,kind,category,next_date,frequency:"week"|"month"|"year"}`. No genera automáticamente pagos.
- `DELETE /budgets/:id`, `/goals/:id`, `/recurring/:id`: solo propietario.
- `POST /insights/dismiss`: `{id}`.
- `GET /places?search=&city=`: directorio publicado. `GET /favorites`, `POST /favorites/:businessId`, `DELETE /favorites/:businessId`.
- `GET /place-requests`, `POST /place-requests` con `{name,city,address?}`. En esta entrega aún no hay avisos de incorporación.

## Integración del portal

Base `/api/business/customer`: requiere sesión empresarial existente, acceso al portal y rol owner/manager/validator. El servidor obtiene el negocio de la sesión, nunca del cuerpo.

- `POST /relationships`: `{public_id,document_id,identity_checked:true}`. Crea propuesta pendiente; exige verificación presencial y aceptación posterior del comprador.
- `GET /relationships`: listado del negocio con sufijo del documento.
- `GET /reports`: compras reportadas de ese negocio, sin finanzas personales.
- `GET /directory`, `PUT /directory` (solo owner/manager): `{published,category,city,address,description,latitude?,longitude?}`. Publicar habilita la ficha y programas activos en Descubrir.

Registrar/anular ventas por los endpoints existentes del portal. No existe un endpoint Customer para escribir ventas oficiales. El historial vuelve a consultarlas al abrir, recuperar foco y durante el refresco activo; el canal push no es necesario para recuperar datos.

## Errores y límites

### Ampliación Tarjetero (30 de octubre de 2026)

Base comprador `/api/customer`, sesión personal requerida:

| Método y ruta | Contrato |
| --- | --- |
| `GET /wallet` | Añade `giftcards: {received:[], purchased:[]}` a sellos y afiliaciones. |
| `GET /wallet/affiliations/:id` | Tarjeta propia, QR, reglas, condiciones, últimos 100 movimientos y premios. |
| `POST /wallet/affiliations/:id/claim` | `{reward_rule_id}`; una emisión canónica por afiliación/premio. |
| `POST /gift-orders` | `{request_id,business_id,buyer_name,recipient_name,recipient_email,amount,message?,terms_accepted:true}`. UUID estable, COP, rango del negocio. Devuelve `{order}` pendiente, sin cobro. |
| `GET /gift-orders/:id` | Solicitud del comprador o destinatario verificado de una ya emitida; nunca PIN/QR. |
| `POST /gift-orders/:id/cancel` | Solo comprador y solicitud pendiente; no reembolsa pagos externos. |
| `GET /wallet/gifts/:id` | Solo destinatario: saldo y canjes; QR cuando puede usarse. |
| `POST /wallet/gifts/:id/accept` | `{full_name,document_id,terms_accepted:true}`. Reintentar no cambia identidad. |
| `GET /places` | Solo negocios publicados que cumplen el estándar; añade `qori_standard`, `programs_config`, `point_rules`. |

Base empresarial `/api/business/customer`, exclusivamente owner/manager:

| Método y ruta | Contrato |
| --- | --- |
| `GET /standard` | `{ready,checks,programs,point_rules,business_name}`. |
| `PUT /standard` | `{points_terms,accumulation_terms,gift_enabled,gift_min,gift_max,gift_terms,gift_payment_instructions}`; decimales positivos, máximo >= mínimo. No altera fórmula ni saldo de puntos. |
| `PUT /directory` | Publicar exige `standard.ready`; despublicar sigue permitido. |
| `GET /gift-orders` | Últimas 100 solicitudes exclusivamente del negocio de la sesión. |
| `POST /gift-orders/:id/confirm-payment` | `{amount,payment_reference,payment_method,payment_received:true}`; importe exacto, emisión atómica única. Devuelve `{ok,reward_pass_id,idempotent}`. |

No se acepta `business_id` del cliente para operaciones empresariales. Reintentar confirmación devuelve la emisión existente. El canje usa los endpoints existentes del Validador. La exportación personal incorpora las giftcards accesibles a la cuenta. Arquitectura y límites: [QORI_TARJETERO.md](QORI_TARJETERO.md).

### Respuestas de error

Formato: `{error:{message}}`. Validación 400, sesión ausente/vencida 401, operación prohibida 403, recurso ajeno o ausente 404, límite 429 y fallo interno 500 con mensaje saneado. El envío de correo puede devolver 503. Los reintentos automáticos solo son seguros donde se documenta idempotencia; no repetir silenciosamente creación de metas/recibos.

Esta versión no promete paginación, servicio offline, devoluciones parciales ni notificaciones push. Revisar también `QORI_CUSTOMER.md` para límites y ejecución.
# Publicaciones y descubrimiento web · 2026-11-03

Catálogo público sin sesión: GET /api/customer/explore (search, city, kind, category, offset); GET /explore/publications/:id, /explore/publications/:id/qr y /explore/businesses/:slug; POST /explore/resolve con url. Solo se muestran publicaciones explícitas y disponibles de negocios activos.

Con sesión Customer: GET /discovery/me, /discovery/saved, /discovery/following, /discovery/earned; PUT /explore/publications/:id/save (saved); POST .../events (OPEN o SHARE), .../request (document_id, message, consent:true), .../launch, .../participants, .../complete y .../gift-order. Los esquemas de participación son los originales de activaciones; no se acepta un participant_id ajeno. Los tokens de juego no sustituyen la sesión Customer.

Empresa (prefijo /api/business/customer, propietario/gerente): GET/POST /publications, PATCH /publications/:id (DRAFT o PAUSED), GET /program-requests, POST /program-requests/:id/decision (INVITE con identity_checked:true, o REJECT). Publicar/republicar se hace mediante POST con kind, resource_id, title, description, cover_url, category, status. ACTIVITY y STAMP requieren recurso propio; AFFILIATION y GIFT publican la configuración del negocio.

Las rutas privadas mantienen protección de sesión, origen y X-Qori-Web. Todas estas respuestas usan no-store. Los eventos son métricas de interacción autenticada, no transacciones comerciales.



## Regalos de productos · 2026-11-03

Publicaciones PRODUCT referencian un producto de inventario propio, activo y en COP. POST empresarial /publications admite product_price, product_terms, payment_instructions y product_valid_days (1–365). El catálogo empresarial incluye products. Las publicaciones disponibles requieren existencias; cada pedido conserva un snapshot del precio y condiciones.

Customer, prefijo /api/customer:

| Método y ruta | Contrato |
| --- | --- |
| POST /product-gifts | {publication_id,request_id,recipient,message?,terms_accepted:true}; recipient es correo exacto o public_id. Precio siempre del servidor. Devuelve order en PENDING_PAYMENT. |
| GET /product-gifts | Últimos 100 pedidos del comprador, sin QR ni datos privados de la cuenta destinataria. |
| GET /product-gifts/:id | Recibo del comprador o del destinatario de un pedido ya emitido. |
| POST /product-gifts/:id/cancel | Solo comprador y estado pendiente. No realiza reembolsos. |

Empresa, prefijo /api/business/customer, propietario o gerente:

| Método y ruta | Contrato |
| --- | --- |
| GET /product-gifts | Pedidos del negocio de la sesión. |
| POST /product-gifts/:id/confirm-payment | {amount,payment_reference,payment_method,payment_received:true,branch_id?}; importe exacto, sede propia activa, existencias y crédito QR. Devuelve {ok,order_id,sale_id,existing?}. |

La invitación TICKET incluye purchased_product:true en el inbox. Se acepta/rechaza mediante /invitations/:id/decision; se consulta luego mediante /wallet/tickets/:id. Los tickets de regalo muestran sender_name/gift_message; nunca se entrega el QR al comprador. La consulta del Validador incluye qr_code.customer_product_gift:true y el canje usa STANDALONE, identidad del destinatario y una clave idempotente.

La entrega no procesa dinero ni añade una segunda venta. Cancelación de pedido, rechazo de invitación, anulación de venta y reembolso externo son eventos diferentes. Los reembolsos del dinero pagado directamente se resuelven con el negocio.

## Recepción financiera y recurrencias web · 2026-11-03

Empresa, propietario/gerente, prefijo /api/business/customer:

| Método y ruta | Contrato |
| --- | --- |
| GET /sale-deliveries | search y offset; últimas 50 ventas del negocio por página, receptor y estado de entrega. |
| POST /sale-deliveries | {sale_id,public_id,request_id,identity_checked:true}. Venta canónica propia, identidad explícita, sin crear pago ni venta nuevos. Devuelve invitation y existing cuando ya se había enviado. |

Customer, prefijo /api/customer:

| Método y ruta | Contrato |
| --- | --- |
| GET /finance-connections | Negocios con preferencias de recepción de compras. |
| PUT /finance-connections/:business_id | {auto_receive:boolean}; solo una preferencia propia ya existente. No elimina el historial recibido. |
| POST /invitations/:id/decision | SALE admite auto_receive:boolean al aceptar. Las invitaciones aceptadas conceden acceso a /sales/:id, que también alimenta /dashboard. |
| POST /recurring/:id/record | {expected_date,paid_on,confirmed:true}. Vencimiento bloqueado en transacción; idempotencia por recurrencia/fecha; importe del servidor, fecha de pago no futura. |

Se reutilizan /dashboard, /entries, /entries/:id/matches, /entries/:id/link, /entries/:id/receipts, /sales/:id/note, /sales/:id/report, /planning, /budgets, /goals, /recurring y /insights/dismiss. La asociación explícita de una venta está incluida tanto en la consulta financiera como en la deduplicación de registros manuales vinculados. Las respuestas privadas siguen usando no-store y la sesión Customer no concede acceso empresarial.
