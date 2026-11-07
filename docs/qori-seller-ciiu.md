# CIIU de Qori Seller: 4610

Fecha: 7 de noviembre de 2026. Política: 2026-11-07-ciiu4610.

## Decisión de Qori

El responsable de Qori indicó expresamente el código 4610 para sus vendedores después de precisar que comercializan suscripciones SaaS por comisión. Se implementa como requisito definido por Qori, sin atribuir a DIAN una validación particular del modelo ni una revisión tributaria externa que no se haya realizado.

Denominación: Comercio al por mayor a cambio de una retribución o por contrata. La Resolución DIAN 227 de 2025 incluye esta denominación en su clasificación: https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm

Actividad del programa: gestión comercial para vender suscripciones SaaS a negocios. Qori contrata, factura, cobra y presta el servicio. El vendedor recibe 10% de cada pago de plan y cada compra de paquetes de tickets de negocios atribuidos, según el contrato.

## Funcionamiento

- El registro y los expedientes de cuentas Seller existentes asignan 4610 en el servidor. No existe campo editable de CIIU; un código distinto enviado directamente a la API se rechaza.
- El portal, el contrato y la lista administrativa muestran 4610 y su denominación. El RUT debe incluirlo como principal, secundaria u otra actividad, según corresponda a la actividad real y los ingresos.
- Se reactivan postulaciones, apertura de expedientes, envío documental y aprobación administrativa. La aprobación exige revisión de los cuatro documentos, RUT, cuenta bancaria, firma autenticada y condiciones.
- El contrato vuelve a estar disponible para descarga, firma manuscrita y autenticación notarial. La aprobación sigue siendo manual.
- La pantalla no modifica el RUT ni certifica su contenido. El administrador debe comprobar el documento.

## Expedientes anteriores

No se reescriben silenciosamente códigos ni aceptaciones históricos. Para aprobar un expediente con otro código o versión anterior, el administrador solicita correcciones. El postulante acepta el requisito 4610, aporta RUT y contrato actualizados y reenvía. El servidor guarda la versión nueva y conserva la anterior en auditoría. Las aprobaciones existentes, comisiones y pagos mantienen su historial.

Esta decisión reemplaza el requisito anterior de publicidad y resuelve la pausa operativa por clasificación pendiente. No requiere migración ni modificaciones directas de datos de producción.

## Verificación

15 pruebas de integración y DOM aprobadas: registro nuevo, apertura de expediente de Seller existente, rechazo de código distinto, requisito fijo sin campo editable, reaceptación histórica, aprobación documental, aislamiento de documentos, atribución, compras, comisiones y pagos.
