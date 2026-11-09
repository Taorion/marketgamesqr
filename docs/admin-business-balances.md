# Saldos por negocio en Admin

Admin → Cuentas Qori → Empresas y empresarios muestra tickets disponibles,
capacidad de emisión de giftcards y saldo vigente por canjear en COP.
Administrar abre el desglose; Actualizar cuentas vuelve a consultar los saldos.

La pestaña comercial Clientes muestra también el saldo restante real en todas
las versiones, con consumo acumulado y fecha de consulta. Actualizar saldos vuelve
a consultar la API. Ver saldos y acceso separa el remanente de los límites del plan.
La capacidad inicial de Descubre ya no aparece como saldo en las filas de clientes.
Los saldos se calculan solo para los negocios de la página previamente autorizada
(cartera del vendedor o alcance del superadmin).

- Tickets: `qr_balance` ya incluye `included_balance`. El saldo adicional es la
  diferencia e incluye compras y ajustes. `qr_purchased_total` históricamente
  también contiene abonos de cortesía; por eso se presenta como recargas y abonos.
- Giftcards: en Pensé en ti se usa el saldo real de emisiones. En Freemium/Descubre
  y planes pagos se respetan los límites efectivos de `planFromBusiness`, el uso
  mensual/total de `reward_passes` y el costo de tickets vigente por emisión.
  Un límite nulo significa sin límite; no equivale a cero. Los saldos conservados
  tras un cambio de plan se muestran sin atribuirles capacidad adicional.
- Dinero: reutiliza la definición de estado efectivo de Reward Pass. Pendiente
  incluye tarjetas por reclamar; vencidas y canceladas se presentan por separado.
  No representa un saldo monetario de la cuenta empresarial en Qori.
- El acceso restringido se indica sin borrar u ocultar créditos conservados.

Las rutas existentes exigen superadmin. La consulta adicional se limita a los
50 negocios de la página o al ID de la ficha, usa índices por negocio y no crea
cuentas, recargas, ventas ni movimientos. No requiere migraciones.

Pruebas: `node --test test/adminBusinessBalances.integration.test.js
test/adminAccounts.integration.test.js test/adminAccountsUI.test.js
test/adminAccountsBoot.integration.test.js`. Integraciones exclusivamente contra
PostgreSQL local `qori_customer_qa`. Las pruebas DOM verifican navegación y contenido,
no sustituyen una comprobación visual en navegador.
