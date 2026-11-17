const catalog = [
  ['capacitacion-1', 'Capacitación 1', 'Primera sesión de capacitación para embajadores Qori.', 'Capacitación 1.mp4', 'VIDEO'],
  ['capacitacion-2', 'Capacitación 2', 'Continúa tu formación con la segunda sesión.', 'Capacitación 2.mp4', 'VIDEO'],
  ['capacitacion-3', 'Capacitación 3', 'Completa el recorrido de las sesiones de capacitación.', 'Capacitación 3.mp4', 'VIDEO'],
  ['tarjeta-sellos', 'Tarjeta de sellos · video corto', 'Consulta el video de tarjeta de sellos antes de preparar tu demostración.', 'Tarjeta de sellos corto (1).mp4', 'VIDEO'],
  ['marca-filosofia', 'Marca y filosofía Qori', 'Conoce la identidad y la filosofía de Qori.', 'Qori_01_Marca_y_Filosofia.pptx', 'PPTX'],
  ['buyer-persona', 'Conoce a tu cliente ideal', 'Material de capacitación sobre buyer persona.', 'Qori_02_Capacitacion_Buyer_Persona.pptx', 'PPTX'],
  ['diagnostico-comercial', 'Diagnóstico comercial', 'Prepara la conversación de diagnóstico con el negocio.', 'Qori_03_Diagnostico_comercial.pptx', 'PPTX'],
  ['elige-solucion', 'Conoce el negocio y elige la solución Qori', 'Consulta el material para relacionar las necesidades del negocio con una solución.', 'Qori_04_Conoce_ el negocio_ y_ elige_ la_ solución_Qori.pptx', 'PPTX'],
  ['apertura-comercial', 'Apertura comercial', 'Presentación breve de apertura comercial en tres diapositivas.', 'Qori_Apertura_Comercial_3_Slides (1).pdf', 'PDF'],
].map(([id, title, description, filename, format], order) => ({ id, title, description, filename, format, order: order + 1 }));
const mime = { VIDEO: 'video/mp4', PDF: 'application/pdf', PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const videos = {
  'capacitacion-1': ['1lhTGySneKzX9BkgqJYj7Wgp6juYQbDEX', 726288097],
  'capacitacion-2': ['1JcwZJ9M2hEs3MzXXDPV4JC7MCKD209bb', 401493134],
  'capacitacion-3': ['1I9pJbGFBZ3i3lIUwq9t6-ofqgkUUmegf', 261680408],
  'tarjeta-sellos': ['1Zf9PTAgNnph4jkS25REKMBJn_bEhTsle', 32891238],
};

module.exports={catalog,mime,videos};
