# Clientes de sellos en Ventas

Ventas consulta GET /api/business/sales/customers/search al escribir y antes de guardar una búsqueda sin selección. El endpoint conserva la respuesta del buscador de clientes del validador, usa el CRM canónico y exige el permiso sales_tracker del negocio. No depende de filtros ni páginas previamente cargadas del Directorio. Respuestas de búsquedas anteriores o de otro negocio se descartan; un fallo no se presenta como cliente inexistente.

La vinculación de sellos ya existe mediante qori_stamp_contact_sync y qori_ensure_stamp_contact(uuid), con bloqueo por negocio/documento, reutilización de identidades y creación sin consentimiento comercial ni ventas. La auditoría previa del 26 de noviembre encontró ambas funciones/trigger instalados y cero tarjetas sin contacto. Por ello no se ejecutó ninguna reparación de datos ni migración.

La clienta reportada tenía un contacto PLAYER y dos ciclos con 3 y 6 sellos. El CRM devolvía una sola clienta; la causa era la búsqueda de Ventas limitada al estado cargado en el navegador.

Verificación: integración CRM/sellos y endpoint de Ventas, búsqueda remota y respuestas tardías, selección canónica, ventas de sellos idempotentes y aislamiento entre negocios. No registrar ventas de prueba en producción.
