# Qori Seller — comisiones VF1

Implementación de `Qori_Comisiones_2026_VF1.pdf` (páginas 2–5) y decisiones del propietario: tickets 10%, bases fijas y únicamente clientes nuevos. El 13 de noviembre de 2026 se verificó que producción sirve el commit `9b4aa0274da9818d90ce6de557015500fcf7f065`, que incluye esta implementación. La comprobación de versión no equivale a validar un cobro real.

| Plan | Código de cobro | Base mensual COP | Mes 1 | Mes 2 | Mes 3 | Mes 4 | Mes 5 | Mes 6 | Total COP |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Despega | DESPEGA | 75.000 | 100% | 10% | 10% | 10% | 10% | 10% | 112.500 |
| Crece | STARTER | 229.000 | 50% | 25% | 25% | 20% | 15% | 10% | 332.050 |
| Escala | GROWTH | 999.000 | 50% | 25% | 25% | 20% | 15% | 10% | 1.448.550 |
| Expande | PRO | 1.999.000 | 50% | 25% | 25% | 20% | 15% | 10% | 2.898.550 |

## Aplicación y conservación de historia

- La fecha de corte se fija al instalar la migración `20261111211048_qori_seller_commissions_vf1.sql`, en `qori_seller_commission_policy.effective_at`. Se compara con `businesses.created_at`; una cuenta existente, aunque convierta de gratuito a pago después, conserva el esquema anterior.
- Los clientes anteriores mantienen 10% sobre el pago real del plan, sin límite nuevo de seis meses. Los registros históricos y comprobantes no se recalculan.
- Para clientes nuevos el plazo empieza en la primera cobertura paga de uno de los cuatro planes. No empieza por registro gratuito o prueba. Se registra incluso si aún no hay vendedor; reasignar o cambiar de plan no reinicia el plazo. Los planes no incluidos en el PDF no generan comisión VF1.
- Las bases fijas aplican también a descuentos y anualidades. Se requiere una orden de pago aprobada, acreditada y de importe positivo. Las emisiones gratuitas y Gift Cards no generan comisión. Todos los paquetes de tickets QR mantienen 10% de su precio cobrado.
- Una anualidad programa hasta seis cuotas. El finalizador del pago guarda el periodo real y habilita la cuota actual después de activar la suscripción. El trabajador revisa cada minuto las demás cuotas. Solo libera con negocio activo, suscripción ACTIVE, vigencia futura y orden aprobada. Las cuotas cuya cobertura expire sin poder habilitarse quedan VOID; una reactivación no las recupera automáticamente.
- Una sola comisión positiva por negocio y mes, incluso ante pagos concurrentes o cambios de vendedor. El vendedor queda fijado en cada orden. El calendario usa meses consecutivos, ajustados al fin de mes cuando corresponde; las interrupciones no reinician ni extienden el plazo.
- Las futuras cuotas SCHEDULED están separadas del saldo PENDING. Los pagos siguen exigiendo expediente aprobado documentalmente, transferencia verificada y jueves de pago. El tiempo nunca marca una comisión PAID.
- Un reembolso anula cuotas pendientes/futuras y crea ajustes negativos por cada cuota pagada, conservando el original y su comprobante. Repetir el evento no duplica el ajuste.

## Puesta en servicio

La migración está espejada en `database/migrations` y `supabase/migrations`. Aplicarla una sola vez por el mecanismo habitual, antes de iniciar el backend nuevo; no ejecutar ambas copias en la misma base. No retroceder `effective_at` ni recalcular histórico.

Las tablas nuevas usan RLS y no están expuestas a anon/authenticated. Las funciones son invoker con search_path fijo. El backend usa la conexión de servicio existente. La versión del contrato pasa a `2026-11-11-comisiones-vf1`; los nuevos postulantes aceptan esa versión. Los expedientes ya aprobados conservan su aceptación histórica; solicitar actualización documental explícita cuando corresponda, sin editarla silenciosamente.

Pruebas sobre PostgreSQL aislado en `127.0.0.1:55441/qori_customer_qa`: `sellerCommissionPolicy.test.js`, `sellerCommissionVF1.integration.test.js`, `sellerCommissionUI.test.js` y regresiones de Seller/documentación/Admin. El navegador automatizado no estuvo disponible; las pruebas DOM no certifican apariencia visual ni funcionamiento en un teléfono físico.

Para iniciar el portal normal desde PowerShell, con la configuración `.env` existente:

```powershell
& "D:\Documentos\Orbital Innovation SAS\Orbital_Innovation\GOSQori\Portal GOS Qori\.local-tools\INICIAR-PORTAL.cmd"
```

El lanzador normal usa la base configurada en `.env`. Las pruebas automatizadas usan exclusivamente la base local de pruebas y pagos simulados. Esta guía no debe utilizarse para volver a aplicar una migración ya instalada; comprobar primero el registro de migraciones del entorno.
