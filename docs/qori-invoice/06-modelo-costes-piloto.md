# Modelo de datos, costes y piloto

## Modelo ajustado al repositorio

18 tablas de módulo; no tablas duplicadas de usuarios, gastos, ventas ni catálogo financiero. Las líneas, impuestos, partes y ajustes se guardan en snapshot canónico cifrado junto al XML con parser_version/hash; no se crean tablas de renglones paralelas para esta escala.

| Tablas | Propósito |
| --- | --- |
| invoice_partners, invoice_members | Organización independiente de Empresa, roles sobre customer_accounts |
| invoice_apps, invoice_keys, invoice_access_tokens | Aplicación sandbox, credencial hash y tokens efímeros |
| invoice_merchants, invoice_authorizations | Emisor separado y autorización app/emisor |
| invoice_identity_attestations, invoice_consents | Titularidad y autorización específica vigente |
| invoice_submissions | Inbox y colas técnica/privada, idempotencia, reintentos, DLQ |
| invoice_documents | Compra fiscal, original/snapshot cifrados, huellas, bolsillo, nota relacionada |
| invoice_reconciliations | Vínculo único con customer_entries existente; no genera pago |
| invoice_overrides, invoice_notices, invoice_requests | Organización personal, aviso interno y derechos |
| invoice_homologations, invoice_member_invites, invoice_events | Operación de partners y auditoría |

Unicidad app/idempotency_key y merchant/document_type/document_key. FK compuesta customer/book y customer/consent. Consulta de documentos siempre por titular; filtros cifrados se evalúan después de acotar propietario/fechas/bolsillo, máximo 5.000 documentos por consulta. Esta estrategia deliberadamente limitada debe reemplazarse por índices/rollups personales antes de gran escala, sin exponer historial a partners.

Compra = total facturado; pago = movimiento existente vinculado por titular y confirmación, mismo bolsillo/moneda/importe. Crédito/débito ajustan compras únicamente al encontrar factura original del mismo titular, emisor, moneda y bolsillo. No crean devoluciones de dinero ni puntos. IVA/otros tributos documentados no se suman dos veces; distribución global analítica conserva XML jurídico. Precio comparable requiere SKU/emisor/unidad/base_quantity, no coincidencia de texto libre.

Capturas manuales/OCR/email previas permanecen intactas. Un envío API no añade gastos, por lo que no duplica el egreso ya registrado. Conciliación actual vincula una entrada manual existente; deduplicación automática entre todas las fuentes y asociación a business_sales requieren un adaptador adicional antes de afirmar un registro fiscal unificado completo.

## Coste sin tarifas inventadas

No hay precios activos ni llamadas de IA. Usar examples/cost.mjs con un archivo de parámetros propios:
facturas mensuales, bytes XML/snapshot por factura, meses conservados, factor de réplica/backups, segundos CPU por factura, precio CPU/hora, almacenamiento GB/mes, egreso GB y coste fijo mensual. Coste unitario = (CPU + almacenamiento + egreso + fijo)/facturas. Excluye soporte, KYC, impuestos y revisión legal, que se deben incorporar con cotizaciones reales. El estimador no contiene tarifas de proveedor.

Instrumentación actual: payload_bytes, processed_ms, estados, intentos, eventos y avisos. processing_ms solo mide normalización/transición técnica, no asignación, soporte ni latencia extremo a extremo. Antes de decidir rentabilidad, medir aceptadas, entregadas internas consentidas, baja confianza, coste de almacenamiento/retención y atención por partner. Evitar publicar tasa de entregas por identidad al integrador.

Futuro comercial: contrato independiente de Qori Empresa, prueba sin producción automática, posibles cuotas por volumen/integración y costes reales. No cobrar por marketing para habilitar emisores. No activar recompensas ni monetización de datos de compradores.

## Piloto por cerrar con personas reales

1. Elegir un proveedor de facturación con responsable técnico y jurídico; no se ha contactado ni comprometido a ninguno.
2. Revisar contrato, autorización específica de uno de sus comercios y evidencia NIT/representación; registrar vigencia/revocación.
3. Reunir corpus sintético representativo UBL/AttachedDocument y notas; validar adaptadores contra anexo vigente, XSD/Schematron y evidencia criptográfica que se decida soportar.
4. Habilitar proveedor real de titularidad y revisión de colisiones sin repositorio innecesario de copias; probar revocación y cambios.
5. Consumidores voluntarios con textos aprobados, autorización separada de marketing y entrenamiento de soporte. La entrega legal del facturador continúa por sus canales.
6. Aislar entorno de piloto, secretos, datos y colas de sandbox; exigir MFA privilegiado, backup restaurado, pentest, carga/latencias y observabilidad.
7. Obtener aprobación explícita de despliegue y tráfico. Solo después habilitar credenciales productivas mediante implementación revisada: el código actual no tiene modo producción.
8. Medir aceptación técnica, clasificación contrastada por humano, entrega consentida, duplicados, errores, latencia y coste real/factura. Acordar umbrales/SLO antes del inicio; no inventar métricas conseguidas.
9. Criterio de parada: cruce de titulares, entrega sin consentimiento, filtración a partner o pérdida de trazabilidad; bloqueo inmediato y respuesta de incidentes.

Fuentes: [documentación técnica DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/), [normativa DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/normatividad/), [orientación para compradores](https://www.dian.gov.co/impuestos/factura-electronica/como-hacerlo/paginas/para-los-compradores.aspx). Se verificó la referencia a anexo 1.9 y modificaciones posteriores; no se codifica una versión normativa como inmutable. No se afirma conformidad fiscal integral ni consulta oficial.
