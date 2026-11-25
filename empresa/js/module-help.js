/* Practical module guides for Qori Empresa. No account data or network requests. */
(() => {
  'use strict';
  const help = document.getElementById('portalModuleHelp');
  if (!help) return;
  const guides = {
    "rms-machine": [
      "Máquina GOS",
      "Organiza el seguimiento de las personas interesadas en tu negocio, desde el primer contacto hasta la compra y la atención posterior. Te ayuda a ver qué necesita cada persona, quién la atiende y cuál es el siguiente paso. Así puedes retomar una conversación con contexto y atender los pendientes a tiempo.",
      "Una mueblería registra a quien pregunta por un sofá, prepara su oferta y programa una llamada para continuar la conversación.",
      [
        "Revisa las oportunidades abiertas y entra en la ficha de la persona que vas a atender.",
        "Anota su necesidad, el avance de la conversación y la propuesta que le presentaste.",
        "Deja una próxima acción con responsable y fecha para continuar el seguimiento."
      ]
    ],
    "courtesies": [
      "Cortesías",
      "Permite comprar cortesías de otros negocios, regalar productos propios y atender pedidos de tickets vendidos. Una cortesía es un producto o beneficio que preparas para entregar a alguien. Revisa las unidades disponibles y sus destinatarios; las compras quedan pendientes hasta que el negocio confirma el pago.",
      "Una inmobiliaria reserva una cortesía y se la entrega a un cliente como agradecimiento al finalizar su proceso.",
      [
        "Elige si vas a comprar cortesías, regalar productos propios o atender un pedido recibido.",
        "Revisa el producto, la cantidad y las condiciones antes de confirmar la operación.",
        "Asigna cada unidad disponible a su destinatario y comparte el enlace para que acepte el beneficio."
      ]
    ],
    "alliances": [
      "Alianzas",
      "Acuerda beneficios con otro negocio, comparte tickets y consulta las comisiones de las compras confirmadas que llegan por su recomendación. Cada negocio tiene un papel: uno ofrece el beneficio y el otro lo recomienda a sus clientes. Ambos acuerdan las condiciones y consultan los resultados de esa colaboración.",
      "Una naturista recomienda una panadería y comparte su QR. El cliente registra nombre, apellidos, documento, teléfono y correo para recibir el ticket. Al comprar y canjearlo obtiene un pan adicional; la naturista gana la comisión pactada por esa compra confirmada.",
      [
        "Define con el aliado el beneficio, la vigencia y la comisión; envía la propuesta para su aceptación.",
        "Asigna tickets y comparte el enlace o QR del aliado para que el cliente registre sus datos.",
        "Confirma la compra y el canje en el Validador. Después consulta la comisión y registra su pago cuando se realice."
      ]
    ],
    "strategic-qr": [
      "Activaciones",
      "Crea experiencias como encuestas, juegos o formularios para que las personas participen y reciban el beneficio que hayas configurado. Tú eliges la dinámica, los datos que solicitas y las condiciones del beneficio. Después compartes un enlace o QR para que el cliente participe desde su celular.",
      "Una cafetería invita a responder una encuesta por QR y ofrece un descuento para la próxima visita.",
      [
        "Elige una experiencia que tenga sentido para tu objetivo: conocer al cliente, invitarlo a visitar o presentar una oferta.",
        "Completa las preguntas, el contenido y las condiciones; revisa la experiencia antes de publicarla.",
        "Comparte el enlace o QR y consulta las participaciones y los resultados registrados."
      ]
    ],
    "communications": [
      "Comunicaciones",
      "Prepara mensajes y publicaciones para tus clientes y revisa los envíos por los canales que tengas habilitados. Aquí organizas a quién le escribes, qué quieres contarle y por qué medio. Los canales disponibles dependen de la configuración de tu cuenta y de las autorizaciones de tus clientes.",
      "Una peluquería avisa a sus clientes autorizados que tiene horarios disponibles esta semana.",
      [
        "Selecciona los destinatarios y el canal que tengas habilitado para comunicarte con ellos.",
        "Escribe un mensaje claro, revisa sus enlaces y comprueba qué acción le propones al cliente.",
        "Confirma el envío o la publicación y revisa su estado en el historial."
      ]
    ],
    "catalog-orders": [
      "Pedidos a domicilio",
      "Reúne los pedidos de tu vitrina y permite revisar su preparación, entrega y estado de pago. Cada pedido conserva la información que necesitas para atenderlo y hacer seguimiento. La preparación, la entrega y el pago son estados distintos: actualiza cada uno cuando realmente corresponda.",
      "Un restaurante recibe un pedido, confirma la dirección y registra el pago cuando lo recibe.",
      [
        "Abre el pedido y revisa los productos, las cantidades, los datos del cliente y la dirección.",
        "Actualiza su estado conforme avances con la preparación y la entrega.",
        "Registra el pago cuando lo recibas y comprueba que el pedido conserve el estado correcto."
      ]
    ],
    "smart-catalogs": [
      "Vitrina web",
      "Publica una página con tus productos, precios y opciones de contacto o pedido para compartirla con tus clientes. Es el escaparate digital de tu negocio: permite mostrar lo que vendes sin enviar fotos y precios uno por uno. Las opciones para consultar o pedir dependen de cómo configures la vitrina.",
      "Una tienda de ropa comparte su vitrina por WhatsApp para que el cliente vea las prendas antes de consultar o pedir.",
      [
        "Selecciona los productos que quieres mostrar y revisa sus fotos, descripciones y precios.",
        "Configura la presentación de tu negocio y las opciones de contacto o pedido disponibles.",
        "Revisa la página, publícala y comparte su enlace con tus clientes."
      ]
    ],
    "inventory": [
      "Productos",
      "Organiza los productos y servicios que vendes, sus precios, costos y existencias cuando corresponda. Esta información se reutiliza en otras herramientas de Qori. Mantenerla actualizada facilita preparar cotizaciones, mostrar tu catálogo y registrar compras con el producto correcto.",
      "Una panadería registra el precio y las unidades disponibles de cada pan para usarlos al vender o preparar una oferta.",
      [
        "Crea o busca el producto o servicio y completa su nombre, descripción y precio.",
        "Revisa el costo y las existencias si corresponde llevar inventario de ese producto.",
        "Actualiza los datos cuando cambien y comprueba que estén correctos antes de usarlos en una oferta."
      ]
    ],
    "reward-passes": [
      "Tarjeta regalo",
      "Crea y administra tarjetas digitales con el beneficio y las condiciones que tu negocio quiera ofrecer. La tarjeta permite presentar un beneficio con sus reglas: qué incluye, hasta cuándo sirve y cómo se utiliza. Revisa esas condiciones para que el destinatario sepa qué puede recibir al mostrarla.",
      "Un spa prepara una tarjeta para regalar una sesión y comprueba su vigencia cuando la persona la presenta.",
      [
        "Define el beneficio que representa la tarjeta y las condiciones para usarlo.",
        "Revisa la vigencia y la presentación antes de emitirla o compartirla.",
        "Consulta su estado y utiliza el Validador para comprobarla cuando el cliente la presente."
      ]
    ],
    "leads": [
      "Contactos",
      "Reúne clientes y personas interesadas con sus datos, historial y responsable de atención. La ficha del contacto reúne información para atenderlo con continuidad, aunque cambie la persona del equipo que lo atiende. Usa sus datos e historial para decidir el siguiente paso.",
      "Una óptica guarda a quien preguntó por unas gafas y asigna a un vendedor para atenderlo sin perder la conversación.",
      [
        "Busca a la persona antes de crear un contacto nuevo para evitar registros repetidos.",
        "Revisa sus datos, las interacciones registradas y quién tiene a cargo su atención.",
        "Actualiza la información y programa el seguimiento que corresponda desde la agenda."
      ]
    ],
    "leads:agenda": [
      "Agenda comercial",
      "Organiza llamadas, citas y tareas pendientes relacionadas con tus contactos y oportunidades de venta. Cada pendiente debe ayudarte a saber a quién contactar, para qué y cuándo. Al completar una tarea, deja el resultado y define si hace falta volver a hablar con esa persona.",
      "Un taller programa llamar mañana a quien recibió una cotización para resolver sus dudas.",
      [
        "Revisa las tareas de hoy y los pendientes que todavía no has atendido.",
        "Programa la llamada, cita o actividad con el contacto, la fecha y el responsable.",
        "Cuando la realices, registra el resultado y crea el próximo seguimiento si hace falta."
      ]
    ],
    "leads:tickets": [
      "Tickets de contactos",
      "Consulta los tickets de tus contactos y distingue cuáles están disponibles, vencidos o ya utilizados. Un ticket representa un beneficio con condiciones y vigencia. Consultar su estado te ayuda a orientar al cliente; el canje se confirma desde el Validador cuando corresponde.",
      "Una cafetería revisa qué clientes todavía tienen un beneficio vigente antes de preparar un recordatorio.",
      [
        "Busca al contacto y revisa los tickets relacionados con él.",
        "Comprueba el beneficio, la fecha de vencimiento y si el ticket ya fue utilizado.",
        "Indica al cliente cómo aprovecharlo o revisa el canje en el Validador cuando lo presente."
      ]
    ],
    "leads:captures": [
      "Capturas de contactos",
      "Consulta las experiencias y formularios por los que las personas llegan a tu negocio y dejan sus datos. Te ayuda a identificar qué puerta de entrada está usando el cliente: una experiencia, un formulario o un contenido compartido. Esa información permite continuar la atención según lo que le interesó.",
      "Una academia revisa las inscripciones que llegaron desde el formulario de una clase de muestra.",
      [
        "Localiza la captura o el formulario que quieres revisar.",
        "Consulta su contenido y los registros de personas que llegaron por ese medio.",
        "Revisa los contactos resultantes y define cómo continuar su atención."
      ]
    ],
    "leads:manual": [
      "Prospectos agregados",
      "Registra personas interesadas que conociste fuera de los formularios de Qori y organiza su atención. Sirve para llevar a Qori las conversaciones que comienzan en una feria, una visita o una llamada. Guarda información suficiente para recordar qué pidió la persona y cómo continuar.",
      "Una empresa de eventos agrega a un contacto que pidió información durante una feria.",
      [
        "Comprueba si la persona ya está registrada antes de agregarla.",
        "Completa sus datos disponibles y anota qué le interesa y de dónde viene el contacto.",
        "Define quién lo atenderá y programa el siguiente contacto."
      ]
    ],
    "leads:sales": [
      "Compras de contactos",
      "Consulta las compras registradas de tus contactos para entender qué han adquirido y darles seguimiento. Relaciona la atención comercial con lo que el cliente realmente compró. Revisa productos, fechas e importes para preparar una conversación útil basada en su historial.",
      "Una tienda revisa la última compra de un cliente antes de ofrecerle un producto complementario.",
      [
        "Busca al contacto del que necesitas consultar el historial.",
        "Revisa las compras registradas y abre el detalle que necesites comprobar.",
        "Usa esa información para dar atención posterior o preparar una oferta relacionada con su compra."
      ]
    ],
    "customer-network": [
      "Qori Customer",
      "Busca compradores en Qori Customer y gestiona el envío de beneficios o invitaciones para vincularlos con tu negocio. Es una forma de acercar tu negocio a personas que usan Qori Customer. El cliente revisa la invitación desde su cuenta y decide si acepta el beneficio que le compartes.",
      "Una librería invita a un comprador a recibir un beneficio. El cliente lo acepta desde su cuenta de Qori Customer.",
      [
        "Revisa los compradores y las opciones de vinculación disponibles para tu negocio.",
        "Prepara el beneficio o la invitación con condiciones claras para el destinatario.",
        "Comparte la propuesta y consulta su estado para continuar la atención cuando corresponda."
      ]
    ],
    "quotes": [
      "Cotizaciones",
      "Prepara propuestas con productos, fotos y precios para que el cliente pueda revisarlas antes de comprar. La cotización explica qué estás ofreciendo y cuánto cuesta. Puedes apoyarte en ella para resolver dudas y acordar la compra; la aceptación del cliente y la recepción del pago son pasos distintos.",
      "Una carpintería envía la propuesta de un escritorio a medida. Cuando recibe el pago, registra la venta por separado.",
      [
        "Selecciona al cliente y agrega los productos o servicios con sus cantidades y precios.",
        "Revisa las fotos, el total, la vigencia y las condiciones antes de compartir la propuesta.",
        "Da seguimiento a la respuesta del cliente y registra la venta cuando se confirme el pago."
      ]
    ],
    "sales": [
      "Ventas atribuidas",
      "Registra compras confirmadas y relaciona cada venta con su cliente, vendedor y origen cuando se conocen. La atribución indica de dónde vino la compra, por ejemplo una campaña o una recomendación. Completar esa información ayuda a reconocer qué esfuerzos comerciales están dando resultados.",
      "Una zapatería registra una compra pagada y señala que el cliente llegó por una campaña de WhatsApp.",
      [
        "Busca si la compra ya está registrada antes de agregar una venta nueva.",
        "Registra el cliente, los productos, el importe pagado y el vendedor u origen cuando los conozcas.",
        "Comprueba el registro y consulta su aporte en los resultados del negocio."
      ]
    ],
    "validator": [
      "Validador QR",
      "Comprueba si un ticket puede utilizarse y permite confirmar el canje y la compra cuando el beneficio la requiere. Primero puedes revisar el titular, la vigencia y las condiciones del beneficio. El escaneo permite consultar esa información; la confirmación del canje ocurre cuando realizas la acción correspondiente.",
      "Una panadería escanea el ticket del cliente, revisa las condiciones y confirma la compra pagada antes de entregar el beneficio.",
      [
        "Escanea o carga el QR del cliente y revisa el beneficio y su estado.",
        "Comprueba que se cumplan las condiciones; si exige compra, revisa los productos y el importe pagado.",
        "Confirma el canje una sola vez y entrega el beneficio que corresponde."
      ]
    ],
    "branches": [
      "Sedes",
      "Organiza los establecimientos de tu negocio y los puntos donde se atienden clientes o se validan beneficios. Una sede identifica el lugar físico donde opera tu negocio. Sus datos ayudan a orientar a los clientes y a distinguir la actividad de cada local cuando el registro incluye esa información.",
      "Una cafetería con dos locales registra sus sedes para saber dónde puede usarse una promoción.",
      [
        "Agrega o selecciona el establecimiento que quieres administrar.",
        "Revisa su nombre, dirección y los datos de atención disponibles.",
        "Comprueba qué sedes aplican al configurar tus promociones y al revisar la actividad del negocio."
      ]
    ],
    "redemptions": [
      "Redenciones",
      "Muestra el historial de los beneficios que ya se utilizaron, para consultar cuándo y dónde se confirmaron. Una redención es el uso confirmado de un beneficio. Este historial te ayuda a resolver consultas sobre tickets ya utilizados y a revisar la actividad de tus promociones.",
      "Un restaurante revisa los descuentos canjeados durante el fin de semana.",
      [
        "Busca el canje que necesitas revisar o consulta el periodo que te interesa.",
        "Abre el detalle para comprobar el beneficio, la fecha y los datos registrados de la operación.",
        "Usa ese historial para atender una consulta o contrastar los resultados de una promoción."
      ]
    ],
    "stamp-cards": [
      "Tarjeta de sellos",
      "Configura tarjetas para acumular sellos y recibir un beneficio al cumplir las condiciones de tu programa. Cada tarjeta muestra el progreso del cliente hacia un premio. Al confirmar un sello, revisas el producto y el importe de la compra; Qori registra esa venta o vincula una que ya exista.",
      "Una cafetería ofrece un café al completar seis sellos. En cada visita, la persona de caja revisa la tarjeta, el producto y el valor pagado antes de confirmar el sello. Si la venta ya está registrada, la vincula para evitar duplicarla.",
      [
        "Define cuántos sellos se necesitan, qué compras cuentan y cuál será el premio; entrega o comparte la tarjeta.",
        "Escanea o carga el QR, revisa la tarjeta y confirma el producto y el valor pagado antes de poner el sello.",
        "Al completar la meta, el cliente genera su beneficio y lo presenta para canjearlo."
      ]
    ],
    "affiliates": [
      "Afiliados",
      "Administra personas inscritas en tu programa, sus carnets, compras y puntos según las reglas que configures. El carnet identifica al cliente dentro del programa de tu negocio. Su historial permite consultar las compras, los puntos y los beneficios que le corresponden según las reglas vigentes.",
      "Una tienda inscribe a sus clientes frecuentes y consulta los puntos que han acumulado con sus compras.",
      [
        "Revisa las reglas de tu programa e inscribe al cliente con sus datos.",
        "Entrega o comparte su carnet y registra las compras por el flujo correspondiente.",
        "Consulta el saldo de puntos y las condiciones antes de confirmar un beneficio."
      ]
    ],
    "missions": [
      "Ranking",
      "Organiza retos y clasificaciones de clientes con puntos y premios definidos por tu negocio. El ranking muestra cómo avanzan los participantes durante un periodo. Define con claridad qué acciones suman puntos y qué condiciones se deben cumplir para obtener un premio.",
      "Una tienda propone un reto mensual y revisa quiénes cumplen las condiciones para obtener el premio.",
      [
        "Elige el tipo de reto, las acciones que cuentan y el periodo de participación.",
        "Revisa las reglas y los premios antes de invitar a tus clientes.",
        "Consulta la clasificación y comprueba los resultados antes de gestionar la entrega de premios."
      ]
    ],
    "recycling": [
      "Reciclaje",
      "Retoma oportunidades comerciales que quedaron detenidas y prepara una nueva forma de contactar a esas personas. Úsalo cuando una conversación se enfrió o una propuesta no avanzó. Revisar el motivo te ayuda a decidir si hay una nueva oferta, fecha o solución que pueda interesarle al cliente.",
      "Una academia vuelve a atender a quienes preguntaron por un curso cuando se abre un horario que les conviene.",
      [
        "Revisa las oportunidades detenidas y la información de su último contacto.",
        "Identifica qué cambió y prepara una razón concreta para retomar la conversación.",
        "Registra la nueva gestión y acuerda un siguiente paso si la persona sigue interesada."
      ]
    ],
    "dashboard": [
      "Centro de Revenue",
      "Reúne los ingresos y resultados registrados para entender qué acciones, campañas o vendedores generan compras. Revenue significa ingresos. Aquí puedes revisar cuánto se ha vendido y cómo se relaciona con las acciones del negocio; la lectura depende de las ventas, costos y orígenes que estén registrados.",
      "Un restaurante compara las ventas de dos promociones y revisa cuál aportó más ingresos frente al gasto registrado.",
      [
        "Selecciona el periodo que quieres analizar y revisa sus ingresos y compras registradas.",
        "Compara los resultados por campaña, vendedor u origen según la información disponible.",
        "Revisa los costos registrados antes de decidir qué acción mantener, ajustar o repetir."
      ]
    ],
    "channels": [
      "Medios de adquisición",
      "Compara de dónde llegan las personas interesadas y qué resultados produce cada medio con la inversión que registres. Un medio de adquisición es una fuente de nuevos contactos, como Instagram, una feria o una recomendación. Relaciona cada esfuerzo con su origen para comparar su costo y sus resultados.",
      "Un gimnasio compara los contactos y compras que llegaron desde Instagram y desde una feria del barrio.",
      [
        "Identifica el medio que vas a medir y registra la inversión o esfuerzo correspondiente.",
        "Relaciona las capturas, campañas o fuentes disponibles con ese medio.",
        "Compara los contactos y las compras atribuidas durante el mismo periodo."
      ]
    ],
    "competition": [
      "Radar Competitivo",
      "Organiza información sobre competidores, precios y ofertas para apoyar tus decisiones comerciales. Funciona como un registro de observaciones de tu mercado. Mantén la información al día para comparar propuestas con contexto: precio, producto, condiciones y fecha de la observación.",
      "Una tienda compara los precios que ha registrado de productos similares antes de ajustar su propia oferta.",
      [
        "Registra el competidor y la información que hayas comprobado sobre su oferta.",
        "Compara productos o servicios similares teniendo en cuenta sus condiciones.",
        "Usa la comparación para revisar tu propuesta y actualiza los datos cuando cambien."
      ]
    ],
    "campaigns": [
      "Campañas",
      "Planea una acción comercial con su público, oferta y objetivos, y reúne los resultados que se le atribuyen. Una campaña reúne acciones que buscan un resultado concreto, como atraer consultas o promover un producto. Definir a quién va dirigida y cómo medirla facilita revisar qué funcionó.",
      "Una pastelería prepara una campaña para el Día de la Madre y revisa las consultas y ventas relacionadas.",
      [
        "Define el objetivo, el público, la oferta y el periodo de la campaña.",
        "Prepara los materiales y relaciona las acciones o medios que vas a utilizar.",
        "Consulta los contactos y ventas atribuidos para decidir los siguientes ajustes."
      ]
    ],
    "sellers": [
      "Vendedores",
      "Organiza a tu equipo comercial y consulta sus contactos asignados, metas y resultados registrados. Te ayuda a distribuir la atención y revisar el trabajo registrado por cada persona del equipo. Las asignaciones y metas facilitan saber quién debe continuar una conversación y dónde hace falta apoyo.",
      "Una distribuidora asigna clientes a cada vendedor y revisa sus ventas para decidir dónde necesita apoyo.",
      [
        "Revisa los vendedores disponibles y sus responsabilidades dentro del negocio.",
        "Organiza los contactos asignados y las metas que utilizarás para dar seguimiento.",
        "Consulta los avances y las ventas registradas para acompañar al equipo."
      ]
    ],
    "account": [
      "Cuenta",
      "Mantén actualizados los datos de tu empresa y consulta las opciones de administración de tu cuenta. Es el punto de partida para administrar tu negocio dentro del portal. Desde sus secciones puedes revisar la información de la empresa, los recursos disponibles y las opciones de acceso.",
      "Una tienda cambia su dirección y revisa los datos de contacto que usa en Qori.",
      [
        "Revisa el nombre, los datos de contacto y la información de tu empresa.",
        "Abre la sección que necesitas: recargas, activos digitales, canales, seguridad o usuarios, según tus permisos.",
        "Guarda los cambios y comprueba que los datos queden actualizados."
      ]
    ],
    "account:channels": [
      "Canales de comunicación",
      "Configura los canales disponibles para que tu negocio pueda comunicarse con sus clientes desde Qori. Un canal es el medio que utilizarás para enviar mensajes, por ejemplo el correo del negocio. Tenerlo configurado permite usar las opciones de comunicación que estén habilitadas en tu cuenta.",
      "Una clínica conecta su correo comercial antes de enviar mensajes a los clientes que lo autorizaron.",
      [
        "Selecciona el canal disponible que quieras configurar.",
        "Completa los datos solicitados y revisa el estado de la conexión.",
        "Cuando esté listo, úsalo en Comunicaciones con los destinatarios que hayan autorizado el contacto."
      ]
    ],
    "account:billing": [
      "Recargas",
      "Consulta tu saldo de tickets, compra recargas y revisa las opciones de tu plan. Los tickets son unidades disponibles para las operaciones de Qori que los requieren. Revisa el saldo y las condiciones de la recarga antes de comprar para elegir la cantidad adecuada.",
      "Una panadería revisa cuántos tickets le quedan antes de emitir un nuevo lote para una promoción.",
      [
        "Consulta tu saldo disponible y las condiciones del plan que tienes activo.",
        "Elige la recarga que necesitas y revisa su cantidad, precio y condiciones.",
        "Completa el proceso de pago y comprueba que la aprobación y el nuevo saldo aparezcan en tu cuenta."
      ]
    ],
    "account:assets": [
      "Activos digitales",
      "Guarda el logo, los marcos QR y los archivos que usas al presentar tu negocio o entregar contenido. Son los materiales que reutilizas al crear experiencias y presentar tu marca. Mantenerlos organizados te evita cargar el mismo archivo cada vez y facilita elegir la versión correcta.",
      "Una academia carga su logo y una guía en PDF para utilizarlos en una experiencia para nuevos interesados.",
      [
        "Carga el logo, la imagen o el documento que necesitas utilizar.",
        "Revisa que el archivo sea legible, esté actualizado y corresponda a tu negocio.",
        "Selecciónalo al preparar las experiencias o materiales que admitan ese recurso."
      ]
    ],
    "account:security": [
      "Seguridad",
      "Permite actualizar la contraseña con la que entras a tu cuenta de Qori. Usa esta sección cuando necesites renovar tu acceso. Elige una contraseña que puedas conservar de forma segura y que sea diferente de la que usas en otros servicios.",
      "El dueño de una tienda cambia su contraseña cuando necesita renovar sus datos de acceso.",
      [
        "Abre el formulario de cambio de contraseña.",
        "Completa los datos que solicita y confirma la nueva contraseña.",
        "Guarda el cambio y conserva la nueva clave para tus próximos ingresos."
      ]
    ],
    "account:admin": [
      "Usuarios y permisos",
      "Administra las personas que pueden entrar al portal y los permisos de su trabajo. Cada usuario debe tener el acceso que necesita para realizar sus tareas. Revisa el rol antes de guardar para distinguir, por ejemplo, la administración del negocio y la validación en caja.",
      "Un restaurante da acceso de validador a quien atiende la caja para comprobar tickets.",
      [
        "Busca al integrante del equipo o prepara su acceso si todavía no está registrado.",
        "Asigna el rol y las opciones disponibles que correspondan a su trabajo.",
        "Guarda y revisa los permisos cuando cambien sus responsabilidades."
      ]
    ],
    "admin": [
      "Administración interna",
      "Reúne herramientas del equipo autorizado de Qori para preparar campañas y revisar lo que se entrega a cada negocio. Las opciones de esta sección dependen del rol autorizado. Antes de trabajar, comprueba a qué negocio y campaña corresponde la información para mantener cada entrega en su cuenta correcta.",
      "El equipo de Qori revisa los materiales de una campaña antes de entregarlos a la empresa que la solicitó.",
      [
        "Identifica el negocio y la campaña o solicitud que debes atender.",
        "Revisa la información y prepara los recursos que correspondan a esa entrega.",
        "Comprueba el destinatario y el estado de lo preparado antes de completar la gestión."
      ]
    ]
  };
  const title = help.querySelector('[data-module-help-title]');
  const description = help.querySelector('[data-module-help-description]');
  const example = help.querySelector('[data-module-help-example]');
  const steps = help.querySelector('[data-module-help-steps]');
  const openByModule = new Map();
  let currentKey = '';
  function currentGuide() {
    const view = document.body.dataset.currentView;
    if (view === 'account') {
      const section = document.querySelector('.view-section[data-view="account"]');
      const screen = ['channels','billing','assets','security','admin'].find(s => section?.classList.contains('account-screen-'+s));
      return screen ? 'account:'+screen : 'account';
    }
    if (view === 'leads') {
      const tab = document.getElementById('contactCenterShell')?.dataset.contactStage;
      if (guides['leads:'+tab]) return 'leads:'+tab;
    }
    return view;
  }
  function render() {
    const key = currentGuide(), guide = guides[key];
    help.hidden = document.body.dataset.authState !== 'authenticated' || !guide;
    if (help.hidden || key === currentKey) return;
    if (currentKey) openByModule.set(currentKey,help.open);
    currentKey = key;
    help.dataset.moduleHelpKey = key;
    title.textContent = guide[0];
    description.textContent = guide[1];
    example.textContent = guide[2];
    steps.replaceChildren(...guide[3].map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    help.open = openByModule.get(key) === true;
  }
  help.addEventListener('toggle', () => { if(currentKey) openByModule.set(currentKey,help.open); });
  new MutationObserver(render).observe(document.body,{attributes:true,attributeFilter:['data-current-view','data-auth-state']});
  const account = document.querySelector('.view-section[data-view="account"]');
  if(account) new MutationObserver(render).observe(account,{attributes:true,attributeFilter:['class']});
  const contacts = document.getElementById('contactCenterShell');
  if(contacts) new MutationObserver(render).observe(contacts,{attributes:true,attributeFilter:['data-contact-stage']});
  render();
})();
