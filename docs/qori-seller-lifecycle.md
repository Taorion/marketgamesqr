# Seguimiento de Freemium en Qori Seller

El dashboard muestra la fase real de los negocios de la cartera del vendedor. La misma fase aparece en los contactos del CRM que ya tienen un negocio vinculado.

Freemium corresponde a la muestra temporal `DESCUBRE` y a periodos de prueba autorizados por un acuerdo comercial. Se muestran inicio, vencimiento exacto en hora de Colombia, días restantes, acceso habilitado o restringido y el siguiente paso sugerido. Se destaca cuando quedan siete días o menos. Una fecha ausente aparece como pendiente de definir; no se inventa una fecha ni se considera una prueba ilimitada.

Al pasar a un plan pago, se conserva el historial de la prueba y se muestran el plan actual, el vencimiento del periodo, el último pago confirmado y, cuando aplica, el periodo de gracia. La conversión requiere evidencia de un pago aprobado y acreditado de suscripción posterior al inicio de la prueba. Las compras de tickets, órdenes pendientes y pagos de valor cero no acreditan conversión.

La lectura reutiliza `planFromBusiness` y las fechas canónicas de la suscripción. No modifica acceso, vencimientos, facturación ni comisiones. La consulta filtra por el vendedor autenticado, exige una postulación aprobada o el acceso comercial existente y devuelve una proyección limitada; nunca expone `settings`, claves o información de otros vendedores. El listado muestra hasta 200 cuentas recientes y dispone de búsqueda, filtros y actualización manual.

Validación: pruebas locales de API y PostgreSQL aislado para estados activos, por vencer, vencidos, suspendidos, fecha ausente, prueba comercial, renovación, pago pendiente, conversión y aislamiento entre vendedores. Pruebas DOM para filtros, fechas en Colombia y resumen dentro del CRM; no equivalen a una revisión visual en dispositivo físico.
