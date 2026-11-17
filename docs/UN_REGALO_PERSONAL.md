# Un regalo personal — preparación local

Estado al preparar la entrega del 17 de noviembre de 2026: implementado y probado localmente; despliegue completo autorizado. La comprobación de publicación se registra por separado con el SHA servido en producción.

## Oferta y recorrido

El cuarto programa gratuito, `UN_REGALO_PERSONAL`, entrega cinco emisiones de Gift Cards digitales una sola vez al registrar un negocio. El documento del negocio conserva la protección existente contra registros gratuitos duplicados. No se reinicia este saldo mensualmente ni se regalan nuevamente emisiones al iniciar sesión.

| Paquete | Precio COP | Precio por emisión COP |
| --- | ---: | ---: |
| 10 Gift Cards | 25.000 | 2.500 |
| 25 Gift Cards | 62.500 | 2.500 |
| 50 Gift Cards | 125.000 | 2.500 |
| 100 Gift Cards | 250.000 | 2.500 |

La emisión es el servicio digital de Qori. El valor monetario que el negocio asigna al regalo es independiente y lo respalda el propio negocio. Comprar emisiones no recarga tickets ni dinero en las tarjetas.

El registro público permite elegir el programa en `/pense-en-ti/?program=UN_REGALO_PERSONAL`. Conserva los parámetros de vendedor y prospecto. El negocio entra a Gift Cards, configura su publicación en Qori Customer y puede emitir sus cinco tarjetas iniciales. La tienda de emisiones está disponible desde Gift Cards, el aviso del programa gratuito y la sección de cuenta. La compra existente de tickets permanece separada.

Al agotarse las emisiones, la creación pide recargar. Solo el titular puede iniciar compras. El servidor determina precios y capacidades; el navegador no decide el importe. El saldo se suma tras verificar un pago aprobado de Mercado Pago, por el importe correcto y en COP. Volver desde la pasarela no acredita saldo. Reintentos, notificaciones repetidas y emisiones simultáneas mantienen una sola acreditación o consumo por operación.

Para planes de pago habilitados, las emisiones compradas se consumen antes de la asignación mensual y no descuentan esa asignación. Los planes de prueba con límite total finito no reciben una oferta de paquetes que no puedan utilizar. Se siguen liquidando órdenes históricas válidas de paquetes anteriores; esos paquetes no se ofrecen para compras nuevas.

En Qori Customer, solicitar una Gift Card deja una orden pendiente. El negocio confirma por separado el pago que recibió; solo entonces se emite la tarjeta y se consume una emisión. Confirmar de nuevo la misma solicitud no genera otra tarjeta.

## Instalación y publicación pendiente

### Recargas desde Admin

El acceso **Recargas** de la barra superior de Admin abre `#recargas`, visible también en el espacio comercial sin desplegar los paneles antiguos. Permite buscar un negocio, ver su saldo de emisiones y tickets, elegir Gift Cards (10, 25, 50 o 100) o tickets, preparar el pago y consultar las órdenes del negocio. El enlace de Mercado Pago vuelve a Admin con el mismo negocio seleccionado.

La orden conserva al administrador real como creador y el origen `admin_recharges`. Solo las identidades autorizadas de Admin pueden usar las rutas `/api/admin/recharges`; no se amplían permisos de vendedores ni de negocios. No se acredita saldo al preparar el enlace ni al volver del proveedor. Se reutiliza la verificación e idempotencia del flujo existente. Las cuentas inactivas y los planes que no permiten emisiones adicionales no pueden comprarlas. Este agregado no requiere otra migración.

Validación de este agregado: 10 pruebas nuevas de API/interfaz y 33 pruebas de regresión aprobadas localmente. Incluyen permisos, precios del servidor, selección del negocio, pago incorrecto, aprobación repetida, tickets separados, doble clic, cambios de negocio y cierre de sesión. La publicación y la revisión visual real siguen pendientes.

La migración `20261117143058_qori_un_regalo_personal.sql` está duplicada de forma idéntica en `database/migrations` y `supabase/migrations`. El migrador habitual del backend registra y ejecuta las migraciones pendientes. Debe aplicarse antes de servir el código actualizado: agrega la marca de emisión prepagada, ajusta las cuotas gratuitas y cambia los valores iniciales por defecto de cuentas de emisiones a cero. El alta de este programa concede explícitamente las cinco iniciales en su transacción. No cambia los saldos existentes ni convierte otros programas gratuitos.

La migración se aplicó únicamente a PostgreSQL local de QA. Se comprobó RLS en la cuenta de emisiones, ausencia de SELECT público y funciones de cuota invoker con search_path vacío, sin ejecución pública. No se ejecutaron los asesores de Supabase contra producción.

## Validación

Las pruebas cubren alta y documento duplicado, permisos por negocio, cinco emisiones concurrentes, saldo agotado, precios, órdenes idempotentes, pago incorrecto, moneda incorrecta, webhook firmado, notificaciones repetidas, paquetes históricos, compra separada de tickets, atribución del vendedor, configuración/publicación, compra desde Customer y consumo de créditos en planes de pago.

Las pruebas de interfaz con JSDOM cubren precios, saldo separado, estados pendientes, enlaces de pago, doble clic, reintentos, respuestas tardías de otra sesión y opciones del programa. No equivalen a una revisión visual en navegador o dispositivo físico. La herramienta de navegador bloqueó esa revisión porque no pudo verificar la URL de la ventana de Windows. Quedan pendientes la revisión visual de escritorio/móvil y una transacción real de Mercado Pago; no se declara validación de producción.

Para revisar manualmente con la base local `qori_customer_qa` disponible en `127.0.0.1:55441`, desde la raíz del repositorio:

```powershell
& '.\.local-tools\node-v22.23.5-win-x64\node.exe' scripts/preview-giftcards.cjs
```

Abrir `http://127.0.0.1:3141/__giftcards_qa`. El script crea una cuenta ficticia con cinco emisiones, se vincula solo a loopback y deshabilita pagos y correos reales. Requiere el esquema y las migraciones de QA previamente instalados. Detener con Ctrl+C al terminar.
