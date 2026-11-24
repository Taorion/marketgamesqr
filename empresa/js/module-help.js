/* Short, contextual help for Qori Empresa. No account data or network requests. */
(() => {
  'use strict';
  const help = document.getElementById('portalModuleHelp');
  if (!help) return;
  const guides = {
    'rms-machine': ['Máquina GOS',
      'Organiza el seguimiento de las personas interesadas en tu negocio, desde el primer contacto hasta la compra y la atención posterior.',
      'Una mueblería registra a quien pregunta por un sofá, prepara su oferta y programa una llamada para continuar la conversación.'],
    courtesies: ['Cortesías',
      'Permite comprar o reservar regalos disponibles para entregarlos después a los clientes que elijas.',
      'Una inmobiliaria reserva una cortesía y se la entrega a un cliente como agradecimiento al finalizar su proceso.'],
    alliances: ['Alianzas',
      'Acuerda beneficios con otro negocio, comparte tickets y consulta las comisiones de las compras confirmadas que llegan por su recomendación.',
      'Una naturista entrega tickets de una panadería. El cliente obtiene un pan adicional y la naturista gana la comisión pactada cuando se confirma la compra.'],
    'strategic-qr': ['Activaciones',
      'Crea experiencias como encuestas, juegos o formularios para que las personas participen y reciban el beneficio que hayas configurado.',
      'Una cafetería invita a responder una encuesta por QR y ofrece un descuento para la próxima visita.'],
    communications: ['Comunicaciones',
      'Prepara mensajes y publicaciones para tus clientes y revisa los envíos por los canales que tengas habilitados.',
      'Una peluquería avisa a sus clientes autorizados que tiene horarios disponibles esta semana.'],
    'catalog-orders': ['Pedidos a domicilio',
      'Reúne los pedidos de tu vitrina y permite revisar su preparación, entrega y estado de pago.',
      'Un restaurante recibe un pedido, confirma la dirección y registra el pago cuando lo recibe.'],
    'smart-catalogs': ['Vitrina web',
      'Publica una página con tus productos, precios y opciones de contacto o pedido para compartirla con tus clientes.',
      'Una tienda de ropa comparte su vitrina por WhatsApp para que el cliente vea las prendas antes de consultar o pedir.'],
    inventory: ['Productos',
      'Organiza los productos y servicios que vendes, sus precios, costos y existencias cuando corresponda.',
      'Una panadería registra el precio y las unidades disponibles de cada pan para usarlos al vender o preparar una oferta.'],
    'reward-passes': ['Tarjeta regalo',
      'Crea y administra tarjetas digitales con el beneficio y las condiciones que tu negocio quiera ofrecer.',
      'Un spa prepara una tarjeta para regalar una sesión y comprueba su vigencia cuando la persona la presenta.'],
    leads: ['Contactos',
      'Reúne clientes y personas interesadas con sus datos, historial y responsable de atención.',
      'Una óptica guarda a quien preguntó por unas gafas y asigna a un vendedor para atenderlo sin perder la conversación.'],
    'leads:agenda': ['Agenda comercial',
      'Organiza llamadas, citas y tareas pendientes relacionadas con tus contactos y oportunidades de venta.',
      'Un taller programa llamar mañana a quien recibió una cotización para resolver sus dudas.'],
    'leads:tickets': ['Tickets de contactos',
      'Consulta los tickets de tus contactos y distingue cuáles están disponibles, vencidos o ya utilizados.',
      'Una cafetería revisa qué clientes todavía tienen un beneficio vigente antes de preparar un recordatorio.'],
    'leads:captures': ['Capturas de contactos',
      'Consulta las experiencias y formularios por los que las personas llegan a tu negocio y dejan sus datos.',
      'Una academia revisa las inscripciones que llegaron desde el formulario de una clase de muestra.'],
    'leads:manual': ['Prospectos agregados',
      'Registra personas interesadas que conociste fuera de los formularios de Qori y organiza su atención.',
      'Una empresa de eventos agrega a un contacto que pidió información durante una feria.'],
    'leads:sales': ['Compras de contactos',
      'Consulta las compras registradas de tus contactos para entender qué han adquirido y darles seguimiento.',
      'Una tienda revisa la última compra de un cliente antes de ofrecerle un producto complementario.'],
    'customer-network': ['Qori Customer',
      'Busca compradores en Qori Customer y gestiona el envío de beneficios o invitaciones para vincularlos con tu negocio.',
      'Una librería invita a un comprador a recibir un beneficio. El cliente lo acepta desde su cuenta de Qori Customer.'],
    quotes: ['Cotizaciones',
      'Prepara propuestas con productos, fotos y precios para que el cliente pueda revisarlas antes de comprar.',
      'Una carpintería envía la propuesta de un escritorio a medida. Cuando recibe el pago, registra la venta por separado.'],
    sales: ['Ventas atribuidas',
      'Registra compras confirmadas y relaciona cada venta con su cliente, vendedor y origen cuando se conocen.',
      'Una zapatería registra una compra pagada y señala que el cliente llegó por una campaña de WhatsApp.'],
    validator: ['Validador QR',
      'Comprueba si un ticket puede utilizarse y permite confirmar el canje y la compra cuando el beneficio la requiere.',
      'Una panadería escanea el ticket del cliente, revisa las condiciones y confirma la compra pagada antes de entregar el beneficio.'],
    branches: ['Sedes',
      'Organiza los establecimientos de tu negocio y los puntos donde se atienden clientes o se validan beneficios.',
      'Una cafetería con dos locales registra sus sedes para saber dónde puede usarse una promoción.'],
    redemptions: ['Redenciones',
      'Muestra el historial de los beneficios que ya se utilizaron, para consultar cuándo y dónde se confirmaron.',
      'Un restaurante revisa los descuentos canjeados durante el fin de semana.'],
    'stamp-cards': ['Tarjeta de sellos',
      'Configura tarjetas para acumular sellos y recibir un beneficio al cumplir las condiciones de tu programa.',
      'Una cafetería ofrece un café al completar seis sellos y confirma cada sello cuando corresponde.'],
    affiliates: ['Afiliados',
      'Administra personas inscritas en tu programa, sus carnets, compras y puntos según las reglas que configures.',
      'Una tienda inscribe a sus clientes frecuentes y consulta los puntos que han acumulado con sus compras.'],
    missions: ['Ranking',
      'Organiza retos y clasificaciones de clientes con puntos y premios definidos por tu negocio.',
      'Una tienda propone un reto mensual y revisa quiénes cumplen las condiciones para obtener el premio.'],
    recycling: ['Reciclaje',
      'Retoma oportunidades comerciales que quedaron detenidas y prepara una nueva forma de contactar a esas personas.',
      'Una academia vuelve a atender a quienes preguntaron por un curso cuando se abre un horario que les conviene.'],
    dashboard: ['Centro de Revenue',
      'Reúne los ingresos y resultados registrados para entender qué acciones, campañas o vendedores generan compras.',
      'Un restaurante compara las ventas de dos promociones y revisa cuál aportó más ingresos frente al gasto registrado.'],
    channels: ['Medios de adquisición',
      'Compara de dónde llegan las personas interesadas y qué resultados produce cada medio con la inversión que registres.',
      'Un gimnasio compara los contactos y compras que llegaron desde Instagram y desde una feria del barrio.'],
    competition: ['Radar Competitivo',
      'Organiza información sobre competidores, precios y ofertas para apoyar tus decisiones comerciales.',
      'Una tienda compara los precios que ha registrado de productos similares antes de ajustar su propia oferta.'],
    campaigns: ['Campañas',
      'Planea una acción comercial con su público, oferta y objetivos, y reúne los resultados que se le atribuyen.',
      'Una pastelería prepara una campaña para el Día de la Madre y revisa las consultas y ventas relacionadas.'],
    sellers: ['Vendedores',
      'Organiza a tu equipo comercial y consulta sus contactos asignados, metas y resultados registrados.',
      'Una distribuidora asigna clientes a cada vendedor y revisa sus ventas para decidir dónde necesita apoyo.'],
    account: ['Cuenta',
      'Mantén actualizados los datos de tu empresa y consulta las opciones de administración de tu cuenta.',
      'Una tienda cambia su dirección y revisa los datos de contacto que usa en Qori.'],
    'account:channels': ['Canales de comunicación',
      'Configura los canales disponibles para que tu negocio pueda comunicarse con sus clientes desde Qori.',
      'Una clínica conecta su correo comercial antes de enviar mensajes a los clientes que lo autorizaron.'],
    'account:billing': ['Recargas',
      'Consulta tu saldo de tickets, compra recargas y revisa las opciones de tu plan.',
      'Una panadería revisa cuántos tickets le quedan antes de emitir un nuevo lote para una promoción.'],
    'account:assets': ['Activos digitales',
      'Guarda el logo, los marcos QR y los archivos que usas al presentar tu negocio o entregar contenido.',
      'Una academia carga su logo y una guía en PDF para utilizarlos en una experiencia para nuevos interesados.'],
    'account:security': ['Seguridad',
      'Permite actualizar la contraseña con la que entras a tu cuenta de Qori.',
      'El dueño de una tienda cambia su contraseña cuando necesita renovar sus datos de acceso.'],
    'account:admin': ['Usuarios y permisos',
      'Administra las personas que pueden entrar al portal y los permisos de su trabajo.',
      'Un restaurante da acceso de validador a quien atiende la caja para comprobar tickets.'],
    admin: ['Administración interna',
      'Reúne herramientas del equipo autorizado de Qori para preparar campañas y revisar lo que se entrega a cada negocio.',
      'El equipo de Qori revisa los materiales de una campaña antes de entregarlos a la empresa que la solicitó.'],
  };
  const title = help.querySelector('[data-module-help-title]');
  const description = help.querySelector('[data-module-help-description]');
  const example = help.querySelector('[data-module-help-example]');
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
