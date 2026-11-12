// Native learning resources. Customer responses include PROSPECT entries only.
const guides=[
 {id:'empieza-aqui',title:'Empieza aquí · Guía de todos tus recursos',audience:'SELLER',stage:'START',description:'El documento líder: qué usar, para quién y en qué momento.',usage:'Léelo antes de tu primera conversación. Vuelve a él para escoger el siguiente material.',sections:[
  ['Tu biblioteca','“Para mí” contiene capacitación y operación de Seller. “Para mis clientes” reúne lo que puedes compartir. Cada recurso indica su propósito, etapa y versión. Los archivos aparecen cuando Qori los publica; una guía web está disponible para leer sin descargar nada.'],
  ['La ruta completa','1. Lee Bienvenida y entiende tu enlace.\n2. Usa el diagnóstico para reconocer la necesidad.\n3. Presenta una solución concreta con la presentación web.\n4. Consulta los escenarios y objeciones.\n5. Comparte la opción adecuada desde Mi CRM cuando ya exista un prospecto.\n6. El cliente crea su contraseña, elige el plan y realiza el pago.\n7. Revisa el estado de la cuenta y acompaña la primera acción.'],
  ['Qué enviar','Primer contacto: mensaje breve y presentación web. Interés: ficha de la solución y planes vigentes. Decisión: guía de registro y pago. Cuenta activa: primeros pasos. Comparte una o dos piezas relevantes por etapa; evita enviar toda la biblioteca de una vez.'],
  ['Cómo conservar tu atribución','“Copiar para cliente” genera una página con tu enlace personal. Si el contacto ya está en Mi CRM, usa “Compartir suscripción” y copia su presentación: conserva también el token de ese prospecto. Un archivo descargado no incorpora automáticamente tu identidad ni sustituye el enlace personal. Acompáñalo siempre de ese enlace.'],
  ['Archivos y enlaces','PDF: lectura y envío. PPTX: presentación editable; no envíes notas internas. PNG/JPG: una idea y llamada a la acción. DOCX: originales editables. Enlaces: información actualizada y contratación. Verifica siempre los precios y capacidades en la página de planes antes de presentar una propuesta.'],
  ['Lista antes de compartir','¿Es “Para mis clientes”? ¿Corresponde a su necesidad? ¿La versión sigue publicada? ¿El enlace conserva mi embajador? ¿Uso el enlace de Mi CRM si ya existe el contacto? ¿El mensaje describe el siguiente paso sin prometer resultados?'],
  ['Después de cada conversación','Registra la necesidad, el plan considerado y el próximo contacto autorizado. Distingue cuenta creada, pago confirmado, cierre revisado y comisión pagada. Los documentos internos y las comisiones se quedan en Seller.']
 ]},
 {id:'bienvenida',title:'Bienvenida · Tu primera recomendación',audience:'SELLER',stage:'START',description:'Una ruta breve para empezar con claridad.',usage:'Primer ingreso o repaso antes de mostrar Qori.',sections:[
  ['Tu objetivo','Ayuda al negocio a elegir una herramienta que pueda usar. Empieza por una necesidad concreta: regresar, regalar, activar una experiencia o gestionar mejor su crecimiento.'],
  ['Prepara tu espacio','Comprueba que tu cuenta esté aprobada. Revisa tus enlaces personales y practica en Demo Qori con datos ficticios. Conoce el estado de tu documentación antes de consultar pagos.'],
  ['Tu primera conversación','Pregunta qué desea mejorar, cómo lo hace hoy y quién tomará la decisión. Muestra un solo recorrido. Comparte la presentación personal y acuerda un próximo paso.'],
  ['Cómo se registra el resultado','La cuenta y las compras elegibles quedan atribuidas mediante tu enlace. Una apertura gratuita no genera comisión. Las suscripciones y tickets requieren pago confirmado y las condiciones vigentes. Consulta la tabla actual en Mi espacio; no prometas ingresos garantizados.']
 ]},
 {id:'diagnostico',title:'Diagnóstico · Encuentra un buen encaje',audience:'SELLER',stage:'DISCOVER',description:'Preguntas para recomendar desde una necesidad real.',usage:'Antes de mostrar planes o mencionar un precio.',sections:[
  ['Cinco preguntas','¿Qué te gustaría que hiciera más un cliente: volver, regalar, participar o comprar?\n¿Qué proceso usas hoy?\n¿Cuántos productos, usuarios y sedes necesitas?\n¿Quién operará la herramienta y quién decide la compra?\n¿Qué primera acción podríamos poner en marcha esta semana?'],
  ['Punto de partida','Visitas recurrentes: revisa Una razón para volver. Regalos de productos: Pensé en ti. Experiencias: Crea activaciones. Necesidades de mayor capacidad o módulos adicionales: compara las suscripciones con la matriz vigente.'],
  ['Lo que debes confirmar','Los gratuitos son separados y tienen cinco productos. Sellos permite un programa; activaciones permite dos activas a la vez. Los premios consumen tickets comprados. Identifica estas condiciones antes de proponer el programa.']
 ]},
 {id:'escenarios',title:'Guía de venta · Escenarios reales de conversación',audience:'SELLER',stage:'PRESENT',description:'Cafeterías, veterinarias, comercios, servicios y negocios con equipo.',usage:'Elige un escenario parecido al del prospecto y adapta la pregunta.',sections:[
  ['Cafetería: que vuelvan','Pregunta: “¿Cómo recuerdas a quien ya te visitó que tiene una razón para regresar?”. Muestra un programa de sellos y su premio. Explica cinco productos, un programa y el uso de tickets comprados para premios. Siguiente paso: crear una cuenta con el enlace de sellos, sin prometer un aumento de ventas.'],
  ['Establecimiento veterinario: visitas y detalles','Pregunta: “¿Quieres reconocer las visitas o facilitar un regalo de un producto?”. Muestra solo la ruta elegida. No presentes Qori como sistema clínico, historia médica o facturación veterinaria. Siguiente paso: acordar un beneficio adecuado y revisar el plan.'],
  ['Comercio: regalos','Pregunta: “¿Qué producto sería fácil regalar a otra persona?”. Muestra el regalo, la confirmación del pago recibido y la validación. Aclara que el negocio cobra su producto y que confirmar un pago significa que realmente lo recibió.'],
  ['Evento o experiencia','Pregunta: “¿Qué quieres que haga la persona después de participar?”. Muestra una activación, su enlace y el premio. Dos activas a la vez en el gratuito; pausar libera un cupo. Si necesita otras herramientas o capacidades, compara el plan correspondiente.'],
  ['Negocio con equipo','Pregunta por usuarios, sedes, productos, contactos y seguimiento. Contrasta cada requisito con los límites publicados. No elijas un plan solo por su nombre; usa el comparador y confirma los requisitos que no estén documentados.'],
  ['Una recomendación de pocos minutos','Abre con una necesidad que observaste, comparte un solo enlace y acuerda cuándo retomarlo. El prospecto puede revisar la presentación y elegir por sí mismo; no necesita que completes sus datos o manejes su contraseña.']
 ]},
 {id:'objeciones',title:'Objeciones · Responder con claridad',audience:'SELLER',stage:'CLOSE',description:'Respuestas breves, una pregunta y un siguiente paso.',usage:'Cuando exista una duda real; evita presionar una decisión.',sections:[
  ['“No tengo tiempo”','Respuesta: “Podemos empezar por una sola acción”. Pregunta: “¿Cuál sería útil ahora?”. Paso: mostrar un recorrido corto y acordar otro momento si no hay disponibilidad.'],
  ['“Es costoso”','Respuesta: “Revisemos qué capacidad necesitas y cuánto cuesta la opción adecuada”. Pregunta: “¿Qué parte usarías desde el inicio?”. Paso: comparar precios vigentes y límites; no inventar descuentos ni prometer retorno.'],
  ['“Ya tengo otro sistema”','Respuesta: “Veamos si hay una necesidad que todavía no cubre”. Pregunta: “¿Cómo gestionas regalos, visitas o activaciones hoy?”. Paso: confirmar el alcance; no afirmar integraciones que no estén documentadas.'],
  ['“¿Por qué comprar tickets si es gratis?”','Respuesta: “La herramienta gratuita y sus límites no tienen mensualidad; emitir premios utiliza tickets comprados. Pensé en ti trae 20 tickets iniciales una sola vez”. Paso: mostrar el programa y separar el precio del producto del costo de emisión.'],
  ['“¿Me garantizas ventas?”','Respuesta: “No. Qori aporta herramientas y seguimiento; el resultado depende también de tu oferta y operación”. Paso: definir una primera acción y una señal observable, sin convertirla en garantía.'],
  ['“Lo voy a pensar”','Respuesta: “Te comparto la información concreta para que lo revises”. Pregunta: “¿Qué te falta aclarar?”. Paso: un recurso y una fecha de seguimiento, con su acuerdo.'],
  ['“Paga tú y luego te doy el dinero”','Respuesta: “El negocio contrata y paga directamente a Qori desde su cuenta”. Paso: compartir el enlace; no pedir contraseñas, códigos bancarios o datos de tarjeta.'],
  ['“Pagué pero no aparece activo”','Respuesta: “Revisemos el estado de la orden”. Paso: conservar la referencia y solicitar revisión. Una captura o volver de la pasarela no demuestra pago aprobado. No crear otra cuenta ni repetir el cobro sin revisar.']
 ]},
 {id:'cierre',title:'Cierre tecnológico · Del contacto a la cuenta activa',audience:'SELLER',stage:'CLOSE',description:'Los pasos que preservan atribución, CRM y pago.',usage:'Antes de enviar el enlace final y al comprobar el resultado.',sections:[
  ['1 · Confirma al contacto','Si existe en Mi CRM, abre ese contacto. Verifica su correo y actualízalo antes de generar el enlace si cambió. Usa Compartir suscripción. El cliente debe registrarse con el correo de ese prospecto.'],
  ['2 · Comparte su presentación o plan','La presentación conserva el embajador y el contexto del prospecto. Sus botones abren el registro gratuito o el checkout del plan elegido. No sustituyas ese enlace por una dirección genérica.'],
  ['3 · El cliente controla su registro','El titular diligencia sus datos, acepta las condiciones y crea su contraseña. El gratuito queda activo sin pago; el plan pago requiere completar el checkout.'],
  ['4 · Confirma el estado correcto','Distingue inscripción y pago confirmado. Si abandonó el checkout, usa la recuperación disponible para continuar con su cuenta y orden. No inscribas de nuevo al mismo negocio.'],
  ['5 · Revisa la atribución','Consulta Mis negocios. Si hay un vínculo histórico faltante, solicita revisión a Admin y conserva el contacto. El cierre validado corresponde a Admin después de revisar pago y suscripción.'],
  ['6 · Acompaña y consulta','Ayuda al cliente con su primera acción incluida. Consulta Mis comisiones y Mis pagos. Un estado futuro programado no es un pago recibido.']
 ]},
 {id:'seguimiento',title:'Mensajes y seguimiento',audience:'SELLER',stage:'FOLLOW_UP',description:'Textos breves para acompañar cada etapa.',usage:'Personaliza el mensaje y compártelo tú con el contacto que lo espera.',sections:[
  ['Primer contacto','Hola, [nombre]. Pensé en tu negocio por [necesidad concreta]. Qori tiene una herramienta para [acción]. Te comparto una presentación con las opciones para que la revises: [enlace personal].'],
  ['Después de una demostración','Como vimos, empezaríamos por [acción]. Aquí puedes revisar el plan, sus límites y crear tu cuenta: [enlace del contacto en Mi CRM]. Si tienes una duda sobre [tema], la revisamos antes de que decidas.'],
  ['Cuando está decidiendo','Hola, [nombre]. ¿Pudiste revisar [opción]? ¿Qué información necesitas para decidir si te sirve? Te dejo el recurso sobre [tema] y el enlace personal.'],
  ['Después del registro','Tu siguiente paso es [primera acción incluida]. Para el plan pago, comprueba que el pago figure confirmado. En el gratuito, revisa la herramienta y el saldo de tickets antes de emitir beneficios.'],
  ['Si no desea continuar','Gracias por revisarlo. Dejo cerrado el seguimiento. Si más adelante quieres retomarlo, puedes escribirme.']
 ]},
 {id:'conoce-qori',title:'Conoce Qori · Una herramienta para tu siguiente paso',audience:'PROSPECT',stage:'PRESENT',description:'Empresa y Customer conectados alrededor de beneficios y visitas.',usage:'Para presentar Qori en una primera conversación.',sections:[
  ['Qori Empresa','El espacio del negocio para usar las herramientas incluidas en su plan: productos, beneficios, activaciones, validación y, según la suscripción, gestión comercial y seguimiento.'],
  ['Qori Customer','El espacio del cliente para reunir regalos, tarjetas y beneficios de los negocios. Una visita puede empezar con un enlace y continuar en el establecimiento.'],
  ['Empieza por una necesidad','Regalar un producto, premiar visitas o crear una experiencia. Los programas gratuitos son separados. Si necesitas más capacidades o herramientas, compara los planes de pago de esta página.'],
  ['Elige con información vigente','Consulta el precio, las herramientas y los límites de cada opción. El registro y el pago se realizan directamente en Qori; tu embajador puede orientarte durante la elección.']
 ]},
 {id:'ficha-tecnica',title:'Ficha funcional · Cómo opera tu negocio con Qori',audience:'PROSPECT',stage:'PRESENT',description:'Roles, inventario, emisión, validación y límites.',usage:'Para quien necesita entender la operación antes de contratar.',sections:[
  ['Acceso y herramientas','El titular crea su propia cuenta y contraseña. Los permisos y capacidades dependen del plan. Qori controla los límites en el servidor, además de mostrar las opciones disponibles en el portal.'],
  ['Inventario y beneficios','Los programas gratuitos permiten hasta cinco productos registrados. Un regalo o premio se emite mediante su flujo correspondiente. El validador comprueba el beneficio antes de su entrega y conserva el registro.'],
  ['Saldo de tickets','Pensé en ti incluye 20 tickets iniciales de entrega única. Los premios de sellos y activaciones consumen tickets comprados. Recargar tickets conserva el programa y sus permisos; no agrega módulos de otra suscripción.'],
  ['Suscripción y pago','Elige una opción vigente y completa el checkout de Qori. La activación del plan pago depende de la confirmación del pago. Guardar una referencia o regresar de la pasarela no equivale a esa confirmación.'],
  ['Alcance que debes comprobar','Antes de comprar, revisa productos, usuarios, sedes y demás límites publicados. No asumas integración con un sistema externo, facturación electrónica, una certificación o un nivel de servicio que no esté expresamente documentado.']
 ]},
 {id:'registro-y-pago',title:'Elige, regístrate y empieza',audience:'PROSPECT',stage:'CLOSE',description:'La ruta del cliente hasta la suscripción.',usage:'Cuando el negocio ya está listo para elegir.',sections:[
  ['Elige una opción','Compara las alternativas vigentes aquí. Abre el plan desde el enlace que te compartió tu embajador. Si te indicó un correo de registro, úsalo para conservar el seguimiento.'],
  ['Crea tu cuenta','Diligencia los datos reales del negocio y crea tu contraseña. Revisa y acepta las condiciones aplicables. No compartas tu contraseña con el embajador.'],
  ['Completa el pago si corresponde','Los programas gratuitos no tienen mensualidad. Para una suscripción paga, sigue el checkout y revisa su resultado confirmado. No envíes al embajador datos de tarjeta ni códigos de autenticación.'],
  ['Si ya tienes cuenta','Inicia sesión en tu cuenta existente para consultar el plan y su estado. No crees otro registro del mismo negocio. Si un pago está pendiente, conserva la referencia y solicita revisión antes de intentar cobrar de nuevo.'],
  ['Empieza con una acción','Carga tus productos y configura tu programa. Prueba la validación antes de ofrecer beneficios a clientes. Si vas a emitir premios de sellos o activaciones, compra los tickets necesarios.']
 ]},
 {id:'preguntas-frecuentes',title:'Antes de elegir · Preguntas frecuentes',audience:'PROSPECT',stage:'CLOSE',description:'Gratuidad, tickets, programas separados y planes de pago.',usage:'Para resolver dudas antes del registro.',sections:[
  ['¿Los gratuitos incluyen todas las herramientas?','No. Elige Pensé en ti, Una razón para volver o Crea activaciones. Cada uno incluye su herramienta, cinco productos y validador gratuito. Los demás módulos corresponden a la suscripción que los incluya.'],
  ['¿Cuántas activaciones puedo crear?','En Crea activaciones puedes mantener dos activas al mismo tiempo. Puedes guardar borradores y pausar una para activar otra.'],
  ['¿Los premios son gratis?','La herramienta puede ser gratuita, pero emitir el QR del premio en sellos y activaciones consume tickets comprados. El negocio define y respalda el beneficio que entrega.'],
  ['¿Qué pasa al comprar más tickets?','Aumenta el saldo para emitir beneficios. El programa y sus límites permanecen; para más módulos o capacidades, revisa una suscripción.'],
  ['¿Dónde veo el precio vigente?','En las opciones de esta página y en el checkout del plan. Si tienes un PDF anterior, confirma aquí la información antes de contratar.']
 ]}
].map(g=>({...g,kind:'GUIDE',state:'PUBLISHED',version_label:'2026-11-12',builtin:true}));
const productionAssets=[
 ['b01_oportunidad','CANDIDATE','START','Tu oportunidad con Qori','PDF','Producto, plataforma, formas de participar y condiciones para empezar.'],
 ['b02_rutas','CANDIDATE','START','Elige cómo desarrollar tu actividad','PDF','Recomendar, desarrollar una cartera y especializarte por sector.'],
 ['b03_primeros_negocios','CANDIDATE','START','Tu recorrido hacia los primeros negocios','PDF','Preparación, aprendizaje y seguimiento sin plazo ni ingreso prometido.'],
 ['a00_guia_maestra','SELLER','START','Guía líder de todos los activos','PDF + DOCX','Mapa de archivos, destinatario, cuándo usar, contenido y siguiente acción.'],
 ['a01_bienvenida','SELLER','START','Bienvenida al embajador','PDF + DOCX','Primeros pasos, preparación, enlaces, Demo, CRM y resultados.'],
 ['a02_manual_venta','SELLER','PRESENT','Manual de venta con escenarios','PDF + DOCX','Diagnóstico, demostración, encaje y cierre con ejemplos.'],
 ['a03_objeciones','SELLER','CLOSE','Manejo de objeciones','PDF + DOCX','Al menos 15 objeciones con respuesta, pregunta y siguiente paso.'],
 ['a04_tutorial_cierre','SELLER','CLOSE','Tutorial tecnológico del cierre','PDF + DOCX','CRM, enlace, correo, cuenta, pago confirmado, Admin y comisiones.'],
 ['a05_capacitacion','SELLER','START','Presentación para capacitar embajadores','PPTX + PDF','18 a 24 diapositivas, notas del facilitador y ejercicios.'],
 ['a06_mensajes','SELLER','FOLLOW_UP','Mensajes de conversación y seguimiento','PDF + DOCX','WhatsApp y correo por etapa, para envío manual personalizado.'],
 ['a07_practica','SELLER','START','Ejercicios y lista de verificación','PDF + DOCX','Roleplays, criterios de buena demostración y evaluación.'],
 ['c01_presentacion','PROSPECT','PRESENT','Presentación comercial para el negocio','PPTX + PDF','10 a 14 diapositivas orientadas a necesidad, beneficio y siguiente paso.'],
 ['c02_brochure','PROSPECT','PRESENT','Brochure del ecosistema Qori','PDF','Empresa y Customer, recorridos y alcance según el plan.'],
 ['c03_flyer','PROSPECT','DISCOVER','Flyer general de Qori','PNG + PDF','Versiones vertical 1080x1920 y cuadrada 1080x1080.'],
 ['c04_planes','PROSPECT','CLOSE','Guía comparativa de planes','PDF + DOCX','Tres gratuitos y cuatro suscripciones; precio y límites verificados, fecha y fuente.'],
 ['c05_ficha_tecnica','PROSPECT','PRESENT','Ficha técnica funcional','PDF + DOCX','Operación, permisos, límites, tickets y validación; sin inventar integraciones.'],
 ['c06_registro_pago','PROSPECT','CLOSE','Guía de elección, registro y pago','PDF','Pasos del titular; recuperación y errores; pago confirmado.'],
 ['c07_primeros_pasos','PROSPECT','ACTIVATE','Bienvenida al negocio','PDF','Primera acción por programa y comprobación de la operación.'],
 ['c08_flyers_programas','PROSPECT','DISCOVER','Flyers por programa','PNG + PDF','Una pieza para cada gratuito y cada suscripción pagada.'],
 ['c09_escenarios','PROSPECT','PRESENT','Fichas por tipo de negocio','PDF','Cafetería, veterinaria, comercio, servicios y eventos; ejemplos ilustrativos.'],
 ['c10_preguntas','PROSPECT','CLOSE','Preguntas frecuentes del cliente','PDF','Condiciones claras, objeciones informativas y ruta de decisión.']
].map(([key,audience,stage,title,formats,purpose])=>({key,audience,stage,title,formats,purpose}));
guides.find(g=>g.id==='bienvenida').sections.unshift(
 ['Construye tu oportunidad','Qori aporta producto, plataforma, demostraciones y materiales. Tú identificas necesidades, presentas soluciones y acompañas decisiones de negocios. Puedes recomendar ocasionalmente, desarrollar una cartera o especializarte en un sector. Las rutas no cambian la política económica ni conceden servicios adicionales.'],
 ['Tu espacio para empezar','Abre Mi oportunidad para explorar las rutas y una calculadora de referencia con la política vigente. Después consulta esta biblioteca, practica en Demo y registra tu primera conversación autorizada en Mi CRM.']
);
guides.find(g=>g.id==='empieza-aqui').sections.unshift(['Tres destinatarios','Para mí: formación y operación interna. Para mis clientes: herramientas para que un negocio elija su programa. Para futuros embajadores: explicación pública de la oportunidad Qori Seller. Compartir esta oportunidad no genera comisión por incorporar embajadores. La remuneración corresponde a compras elegibles de negocios.']);
guides.find(g=>g.id==='bienvenida').sections.push(['Tus primeros tres negocios','Trabaja con un objetivo orientativo, sin plazo ni ingreso prometido. Primer negocio: comprender una necesidad y practicar una demostración. Segundo: repetir el proceso con un contacto autorizado y corregir lo que no fue claro. Tercero: comprobar que sabes conservar atribución, distinguir inscripción de pago y acompañar una primera acción. Registra el aprendizaje de cada conversación aunque no termine en compra.']);
module.exports={guides,productionAssets};
