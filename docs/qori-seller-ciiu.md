# CIIU definido para Qori Seller

Fecha de revisión: 7 de noviembre de 2026.
Política: 2026-11-07-ciiu7310.

## Decisión del programa

7310 — Publicidad, para el trabajo de promoción y mercadeo de Qori orientado a atraer negocios interesados. Se define a partir de la actividad descrita para el Embajador: presentar Qori, explicar la oferta y promover el registro por su enlace; Qori contrata y cobra directamente.

Esta correspondencia es una interpretación de las notas oficiales aplicada al alcance del programa, no un concepto particular emitido por DIAN para Qori. Recibir una comisión, por sí solo, no determina un CIIU. Si la actividad efectivamente realizada cambia, debe revisarse la correspondencia antes de usar esta política.

El RUT debe incluir 7310 como principal, secundaria u otra actividad según corresponda. La actividad principal depende de los mayores ingresos; no se exige que 7310 sea principal para todo Embajador. Mostrar el requisito en Qori no actualiza el RUT ni acredita su contenido.

## Fundamento oficial consultado

- DIAN, Abecé de servicios publicitarios: 7310 comprende promoción de productos y servicios de mercadeo para atraer y retener clientes.
  https://www.dian.gov.co/Prensa/Aprendelo-en-un-DIAN-X3/Paginas/Abece-Actividad-Servicios-Publicitarios.aspx
- Resolución DIAN 000227 de 2025, artículos 1.1.5.1 a 1.1.5.4: clasificación tributaria, actividad principal por ingresos y actualización del RUT.
  https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm
- Concepto DIAN 014298 de 2026, 14 de agosto: la clasificación debe corresponder al hecho económico; remite a las disposiciones anteriores. No decide un caso particular de Qori.
  https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_14298_2026.htm
- DANE publica CIIU Rev. 5 A.C. mediante Resolución 0992 de 2026. Se distinguió ese cambio estadístico de la normativa tributaria consultada; no se sustituyó automáticamente el requisito de RUT por un código nuevo de intermediación.
  https://www.dane.gov.co/index.php/sistema-estadistico-nacional-sen/normas-y-estandares/nomenclaturas-y-clasificaciones/clasificaciones/clasificacion-industrial-internacional-uniforme-de-todas-las-actividades-economicas-ciiu

## Implementación y revisión

qoriSellerPolicy.js centraliza el código, nombre, versión y fuente. El alta y la apertura de expedientes existentes asignan 7310 en servidor; un código diferente enviado por el cliente se rechaza. El portal presenta texto informativo, sin campo CIIU editable.

Para enviar documentos, el postulante acepta expresamente el requisito y confirma el RUT y contrato actualizados. El administrador debe comprobar 7310 en el documento, además de la identidad, titularidad bancaria y contrato firmado/autenticado.

No se modifican automáticamente expedientes históricos ni aprobaciones. Para nuevas aprobaciones de expedientes anteriores se solicitan correcciones; la nueva aceptación guarda el código y la versión previos en auditoría. La verificación documental sigue siendo humana: el sistema no afirma haber leído o validado automáticamente el RUT.

Validación local: 14 pruebas de integración y DOM aprobadas; incluyen código fijo sin entrada manual, rechazo de un código alterado, bloqueo de nueva aprobación con condiciones antiguas y conservación de la declaración anterior hasta aceptación explícita.
