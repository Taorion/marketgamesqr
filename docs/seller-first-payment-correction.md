# Corrección explícita de la primera comisión pendiente

`sellerCommissionCorrection.correctFirstPaidPeriod(actor, payload, {apply})` permite corregir un negocio creado durante la prueba que recibió LEGACY_10, cuando Admin confirma que su primer pago debe seguir la tabla QORI_2026_VF1.

- Solo superadmin; requiere negocio, orden exacta y motivo de auditoría.
- Por defecto devuelve vista previa. `apply: true` aplica el cambio en una transacción.
- Exige una única mensualidad aprobada y acreditada y una sola comisión pendiente, sin liquidación ni reversión. Rechaza periodos adicionales y atribuciones diferentes a la orden.
- Conserva la identidad de la comisión, embajador, vencimiento de liquidación, inicio del programa, pago, renovación y créditos. Guarda el registro anterior y la corrección en auditoría.
- Cambia el programa de ese negocio a VF1 para que las siguientes mensualidades sigan la tabla. No modifica automáticamente otros negocios antiguos.
- Bloquea orden, negocio, programa y comisión; las solicitudes simultáneas se serializan y una repetición inmediata no duplica la corrección.

Para Crece: base COP229.000; meses 1–6: COP114.500, 57.250, 57.250, 45.800, 34.350 y 22.900. Cada importe depende del pago y cobertura correspondiente; esta corrección no registra un desembolso al embajador.

Las renovaciones contiguas conservan el límite calendario de la comisión anterior cuando la fecha de cobro guardada a medianoche UTC cae el día anterior en Colombia. El finalizador verifica el fin exacto de la cobertura pagada anterior y tolera únicamente un día de diferencia calendario; no reinicia el programa ni cubre periodos impagados. La fecha real de renovación queda intacta y se conserva también como `commission_period.billing_starts_at`.

`sellerRenewalCommission.integration.test.js` reproduce este caso usando el finalizador real: pagos pendientes/rechazados no crean comisión, cada pago aprobado sigue su porcentaje, repetirlo no duplica y desde el mes 7 no se genera comisión de suscripción.

Verificación local: `sellerCommissionCorrection.integration.test.js`, `sellerCommissionPolicy.test.js`, `sellerCommissionVF1.integration.test.js`. Cubre la reparación concurrente, conservación de identidad/renovación, auditoría única, rechazo de comisiones liquidadas y siguiente mensualidad al 25 %.
