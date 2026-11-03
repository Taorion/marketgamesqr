# Tarjetero y estándar Somos Qori

Implementación de desarrollo del 30 de octubre de 2026, rama aislada `feat/qori-customer`. No desplegada en producción ni publicada en tiendas.

## Experiencia

Inicio presenta «Aquí tus compras cuentan» y acceso al tarjetero. Sus secciones Sellos, Afiliaciones y Giftcards permiten buscar por establecimiento y conservan saldos y condiciones independientes.

- Sellos: tarjeta existente, progreso, condiciones, identificación y beneficio generado por el servicio del portal.
- Afiliaciones: QR personal del establecimiento, saldo real, fórmula vigente, movimientos y premios. El comprador genera el beneficio elegible; el Validador autoriza su canje.
- Giftcards: solicitudes compradas y regalos recibidos, con dedicatoria, condiciones, vigencia, saldo, QR e historial según propiedad y estado.

La inscripción inicial en sellos/afiliación continúa mediante los módulos existentes del negocio. Customer reclama esas relaciones con documento verificado presencialmente y aceptación separada en la app. No se crean afiliaciones automáticamente al abrir una ficha. Las marcas mencionadas durante la ideación no se presentan como participantes reales.

## Estándar Somos Qori

El portal incorpora «Somos Qori · Tarjetero» para owner/manager: configuración de condiciones y operación de solicitudes. Para publicar en Customer, el servidor comprueba negocio/suscripción activos; programa de sellos activo; afiliaciones habilitadas con premio activo y condiciones; giftcards habilitadas con sede, condiciones e instrucciones; créditos/cupos disponibles; condiciones de acumulación.

Descubrir vuelve a comprobarlo al consultar. Si falta un requisito, el negocio deja de ofrecer nuevas solicitudes en ese directorio; sus tarjetas ya emitidas siguen accesibles a sus propietarios. No se modifican planes comerciales ni se activan campañas productivas.

## Giftcards: flujo real

1. El comprador escoge negocio e importe COP dentro del rango publicado, indica remitente, destinatario, correo y dedicatoria y acepta condiciones.
2. Se crea `customer_gift_orders` en `PENDING_PAYMENT`, sin saldo, cobro ni beneficios. Un UUID del comprador devuelve siempre la misma solicitud.
3. El comprador paga directamente al establecimiento. Qori no procesa ese pago.
4. Owner/manager verifica lo recibido y confirma importe exacto, referencia y medio. La transacción bloquea la solicitud y llama a `rewardPassService.createRewardPass` con el mismo cliente SQL: emisión, consumo de crédito y estado `ISSUED` se confirman juntos. Confirmaciones simultáneas producen una sola tarjeta.
5. El destinatario entra con el correo verificado y acepta indicando nombre/documento. La activación canónica y su vinculación a la cuenta son atómicas. Reintentar no cambia su identidad.
6. El comprador puede compartir voluntariamente un aviso desde el dispositivo. No hay correo automático de regalo ni push en esta entrega.
7. El Validador comprueba negocio, sede, documento y saldo. Customer consulta el saldo y los usos canónicos. Incluso después de consumir todo el saldo, un reintento devuelve el canje existente sin otro descuento.

Esta modalidad permite usos parciales, todas las sedes activas del emisor, vigencia de 12 meses desde emisión y no permite transferir posteriormente el destinatario. Se explican antes de solicitar. El PIN interno nunca se devuelve en Customer. El remitente que regala a otra persona consulta su solicitud, pero no su QR de uso ni historial de canjes.

Solo se cancelan solicitudes pendientes. Cancelar no devuelve pagos externos. Reembolsos, corrección del destinatario después de emitir y controversias requieren atención del negocio. Cancelar administrativamente una tarjeta tampoco se interpreta como reembolso.

## Arquitectura y finanzas

Migración `20261030202949_qori_customer_wallet_network.sql`, idéntica en `supabase/migrations` y `database/migrations`: configuración y solicitudes con RLS y grants públicos revocados. No reemplaza las ventas, afiliaciones, puntos, premios ni giftcards existentes. Endpoints con propiedad explícita o negocio de la sesión. El contexto empresarial interno para emitir premios se obtiene únicamente tras verificar la propiedad del comprador.

Una solicitud confirmada aporta un movimiento de gasto al comprador con importe y fecha de pago confirmados. Una pendiente no suma gasto. Recibir/canjear una giftcard no genera por sí solo otro gasto. El servicio actual de canjes de giftcards no genera `business_sales`; si el operador registra además una venta de productos, falta conciliar la financiación con giftcard y otras formas de pago. Esa conciliación y los reembolsos de adquisiciones quedan pendientes: el tablero no equivale a saldo bancario ni contabilidad completa. No registrar manualmente otra vez la misma adquisición incorporada como giftcard.

Al eliminar la cuenta se eliminan accesos y datos personales propios; las referencias de cuenta en solicitudes quedan nulas. Los registros comerciales de giftcards mantienen datos necesarios bajo responsabilidad del negocio. El perfil aclara que eliminar la cuenta no cancela ni reembolsa la tarjeta. Falta definir la política operativa de retención y atención para distribución pública.

## Ejecución y evidencia

Seguir [QORI_CUSTOMER.md](QORI_CUSTOMER.md) para API, Expo y PostgreSQL local. `customer-local-setup.js` aplica la migración en la base aislada. `customer-local-preview.js` prepara exclusivamente `qori_customer_qa` con sede, afiliación, premio, configuración y giftcard ficticia de 50.000 COP. Usa emisión real con confirmación QA explícita, sin pago ni mensajes externos. Reejecutar no duplica ni repone saldo.

Para probar el negocio: `http://127.0.0.1:3051/empresa/`, credenciales QA en `.local-customer/preview.json`, abrir «Somos Qori · Tarjetero» y confirmar una solicitud ficticia. El teléfono accede a Customer por el enlace temporal LAN.

Evidencia de esta iteración:

- 38 pruebas aprobadas: integración Customer, cálculos financieros, QR de sellos y regresiones del Validador. Incluyen publicación condicionada, puntos únicos por venta, premio único, confirmación concurrente, propiedad del regalo, aceptación y canjes parciales/totales idempotentes.
- 49 comprobaciones adicionales de Gift Cards/afiliados aprobadas. Dos comprobaciones heredadas fallan por exigir las etiquetas antiguas `reward-pass-detail-actions=v501-20260916` y `validator-reward-branch=v504-20260916` en el HTML. Se verificó que ambas ya faltan en el commit base `c8caef76cbeda771be71973535e3405c7e0bfd17`; no se cambiaron los tests para ocultarlo. Resultado conjunto: 87 aprobadas, 2 fallos heredados de etiquetas de caché.
- TypeScript y ESLint sin errores; exportación web actualizada y bytecode Hermes para Android/iOS generados. El primer intento nativo fue bloqueado por permisos de ejecución del sandbox; la repetición autorizada completó ambos. No son APK/AAB/IPA firmados.
- Prueba HTTP a través del gateway móvil: cuatro bundles nuevos servidos con 200, login QA, tarjeta de sellos, afiliación, regalo y directorio reales; 401 sin sesión y 404 para acceso empresarial por LAN. Login empresarial local y estándar `ready:true` comprobados. Esto no sustituye la revisión visual ni una prueba física.
- Migración aplicada solo en `127.0.0.1:55441/qori_customer_qa`.
- La herramienta del navegador agotó dos intentos de 10 segundos. La nueva interfaz no tiene validación visual automatizada; las capturas anteriores no son evidencia de estas pantallas.

Pendientes: revisión móvil y teclado real; compilaciones instalables/firma; notificaciones; conciliación financiera de canjes; devoluciones; autoservicio de inscripción; optimización de listas/cupos y retención para distribución pública. No se ha usado emulador ni Android/iOS físico en esta iteración. Contratos en [QORI_CUSTOMER_API.md](QORI_CUSTOMER_API.md).
