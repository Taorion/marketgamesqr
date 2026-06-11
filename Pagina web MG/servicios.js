const SERVICES = [
  {
    code: "ME",
    name: "Marketing Estrategico",
    description: "Direccion de mercado, posicionamiento y arquitectura comercial para construir una oferta con criterio.",
    items: [
      "Investigacion de mercado",
      "Segmentacion",
      "Buyer persona",
      "Posicionamiento",
      "Propuesta de valor",
      "Analisis de competencia",
      "FODA / PESTEL",
      "Customer Journey",
      "Estrategia de diferenciacion",
      "Arquitectura de oferta",
      "Go-to-market"
    ]
  },
  {
    code: "MO",
    name: "Marketing Operativo",
    description: "Planeacion tactica y control de ejecucion para convertir la estrategia en movimiento sostenido.",
    items: [
      "Planes de marketing",
      "Gestion de campanas",
      "Presupuestos",
      "KPIs y metricas de marketing",
      "Cronogramas",
      "Planificacion tactica",
      "Coordinacion de ejecucion"
    ]
  },
  {
    code: "MD",
    name: "Marketing Digital",
    description: "Canales, embudos y activos digitales articulados para captar, nutrir y convertir mejor.",
    items: [
      "Redes sociales",
      "Email marketing",
      "SEO",
      "SEM",
      "Funnels",
      "Automatizacion",
      "CRM",
      "Landing pages",
      "Analitica digital",
      "Remarketing"
    ]
  },
  {
    code: "BR",
    name: "Branding",
    description: "Identidad, tono y narrativa para que la marca se vea solida, diferenciada y memorable.",
    items: [
      "Naming",
      "Identidad visual",
      "Manual de marca",
      "Voz de marca",
      "Storytelling de marca",
      "Arquitectura de marca",
      "Rebranding"
    ]
  },
  {
    code: "CM",
    name: "Content Marketing",
    description: "Sistemas editoriales y piezas de conversion que conectan la historia de la marca con la demanda.",
    items: [
      "Copywriting",
      "Blogging",
      "Estrategia editorial",
      "Guiones para video",
      "Reels / Shorts",
      "Storytelling",
      "Contenido de autoridad",
      "Contenido de conversion",
      "Calendario de contenidos"
    ]
  },
  {
    code: "GP",
    name: "Growth / Performance",
    description: "Optimizacion continua para destrabar conversion, retencion y escalamiento con criterio experimental.",
    items: [
      "Test A/B",
      "CRO",
      "Optimizacion de embudos",
      "Growth loops",
      "Activacion",
      "Retencion",
      "Escalamiento",
      "Experimentos de conversion"
    ]
  },
  {
    code: "CX",
    name: "Customer Experience",
    description: "Experiencias y procesos que hacen mas clara, fluida y valiosa la relacion con cada cliente.",
    items: [
      "Customer Journey Mapping",
      "Fidelizacion",
      "Experiencia omnicanal",
      "Voz del cliente",
      "NPS / CSAT",
      "Customer Success",
      "Postventa"
    ]
  },
  {
    code: "GA",
    name: "Gamificacion",
    description: "Mecanicas interactivas que elevan participacion, retencion y captura de leads con valor de marca.",
    items: [
      "Mini videojuegos de marca",
      "Mecanicas de recompensa",
      "Retencion interactiva",
      "Captura gamificada de leads",
      "QR con premios",
      "Dinamicas promocionales",
      "Experiencias narrativas interactivas"
    ]
  },
  {
    code: "DT",
    name: "Data / Tecnologia",
    description: "Lectura de datos, visualizacion y trazabilidad para tomar decisiones con mas precision.",
    items: [
      "Dashboards",
      "BI",
      "Analisis de comportamiento",
      "Trazabilidad",
      "Visualizacion de datos",
      "Data mining",
      "Modelos de medicion"
    ]
  },
  {
    code: "AU",
    name: "Automatizacion",
    description: "Flujos que reducen friccion comercial y mantienen a la operacion activa con menos desgaste manual.",
    items: [
      "Workflows",
      "Automatizacion comercial",
      "Secuencias de seguimiento",
      "Automatizacion de formularios",
      "Automatizacion de respuestas",
      "Integracion CRM",
      "Flujos automatizados de conversion"
    ]
  },
  {
    code: "IA",
    name: "IA aplicada al marketing",
    description: "Sistemas inteligentes para acelerar creatividad, personalizacion y apoyo comercial con mas consistencia.",
    items: [
      "Generacion de contenido con IA",
      "Asistentes inteligentes",
      "Chatbots",
      "Personalizacion",
      "Automatizacion creativa",
      "Optimizacion predictiva",
      "Sistemas de apoyo comercial con IA"
    ]
  },
  {
    code: "PV",
    name: "Publicidad y Venta",
    description: "Mensajes, piezas y argumentos que hacen mas persuasiva la oferta en puntos clave de conversion.",
    items: [
      "Piezas publicitarias",
      "Campanas promocionales",
      "Mensajes de venta",
      "Argumentarios comerciales",
      "Creatividades de conversion",
      "Apoyo visual a ventas"
    ]
  },
  {
    code: "TM",
    name: "Trade Marketing",
    description: "Recursos de canal y punto de venta para activar presencia, visibilidad y traccion comercial.",
    items: [
      "Estrategia en punto de venta",
      "Material POP",
      "Merchandising",
      "Exhibicion",
      "Activaciones comerciales",
      "Soporte al canal"
    ]
  },
  {
    code: "PR",
    name: "PR / Comunicacion",
    description: "Narrativa reputacional e institucional para sostener confianza, legitimidad y claridad de mensaje.",
    items: [
      "Comunicacion institucional",
      "Narrativa corporativa",
      "Gestion reputacional",
      "Storytelling institucional",
      "Comunicacion de marca",
      "Manejo de mensajes clave"
    ]
  },
  {
    code: "SEO",
    name: "SEO / Posicionamiento",
    description: "Arquitectura organica para ganar visibilidad sostenible, relevancia y mejor rendimiento en busqueda.",
    items: [
      "SEO tecnico",
      "SEO de contenidos",
      "Arquitectura SEO",
      "Palabras clave",
      "Posicionamiento organico",
      "Optimizacion on-page"
    ]
  },
  {
    code: "DEV",
    name: "Desarrollo Web / Experiencias Digitales",
    description: "Interfaces y experiencias digitales con mirada de marca, conversion y narrativa visual.",
    items: [
      "Sitios web",
      "Landing pages",
      "Micrositios interactivos",
      "Experiencias inmersivas",
      "Diseno UX/UI",
      "Interfaces interactivas",
      "Integracion visual de marca"
    ]
  }
];

const PALETTE = [
  ["#7ad6cc", "#9cb8ff"],
  ["#f1ca8b", "#7ad6cc"],
  ["#9cb8ff", "#7ad6cc"],
  ["#f4d1a0", "#9cb8ff"],
  ["#7ad6cc", "#f1ca8b"],
  ["#95e0c5", "#9cb8ff"]
];

const SERVICE_CODE_META = {
  ME: {
    label: "Marketing Estrategico",
    teaching: "ME significa Marketing Estrategico: una sigla en espanol usada para resumir la capa que define hacia donde compite la marca y como se diferencia."
  },
  MO: {
    label: "Marketing Operativo",
    teaching: "MO significa Marketing Operativo: una sigla en espanol usada para resumir la parte que baja la estrategia a tareas, tiempos, responsables y control."
  },
  MD: {
    label: "Marketing Digital",
    teaching: "MD significa Marketing Digital: una sigla en espanol usada para resumir el sistema de canales, activos y recorridos online que conecta trafico con conversion."
  },
  BR: {
    label: "Branding",
    teaching: "BR resume Branding, termino en ingles que suele traducirse como gestion o construccion de marca."
  },
  CM: {
    label: "Content Marketing",
    teaching: "CM viene de Content Marketing, en ingles, y se traduce como marketing de contenidos."
  },
  GP: {
    label: "Growth / Performance",
    teaching: "GP viene de Growth / Performance, en ingles, y se entiende como crecimiento y rendimiento medidos para mejorar conversion, retencion y escala."
  },
  CX: {
    label: "Customer Experience",
    teaching: "CX viene de Customer Experience, en ingles, y se traduce como experiencia del cliente."
  },
  GA: {
    label: "Gamificacion",
    teaching: "GA significa Gamificacion: una sigla en espanol usada para resumir el uso de dinamicas de juego para activar participacion, recuerdo y conversion."
  },
  DT: {
    label: "Data / Tecnologia",
    teaching: "DT resume Data / Tecnologia: una forma corta de nombrar la capa de datos y herramientas para decidir y ejecutar con mas precision."
  },
  AU: {
    label: "Automatizacion",
    teaching: "AU significa Automatizacion: una sigla en espanol usada para resumir flujos que reducen trabajo manual y aceleran seguimiento, respuesta y conversion."
  },
  IA: {
    label: "Inteligencia Artificial aplicada al marketing",
    teaching: "IA significa Inteligencia Artificial: una sigla en espanol usada para hablar de sistemas que ayudan a crear, personalizar, analizar y responder con mas velocidad."
  },
  PV: {
    label: "Publicidad y Venta",
    teaching: "PV significa Publicidad y Venta: una sigla en espanol usada para resumir piezas y mensajes orientados a persuadir y cerrar oportunidades."
  },
  TM: {
    label: "Trade Marketing",
    teaching: "TM viene de Trade Marketing, termino en ingles usado para acciones que potencian presencia y venta en canal o punto de venta."
  },
  PR: {
    label: "PR / Comunicacion",
    teaching: "PR viene de Public Relations, en ingles, y se traduce como Relaciones Publicas."
  },
  SEO: {
    label: "SEO / Posicionamiento",
    teaching: "SEO viene de Search Engine Optimization, en ingles, y se traduce como optimizacion para motores de busqueda."
  },
  DEV: {
    label: "Desarrollo Web / Experiencias Digitales",
    teaching: "DEV viene de Development, en ingles, y aqui se usa para resumir la capa de desarrollo web y experiencias digitales."
  }
};

const TERM_GLOSSARY = [
  {
    key: "KPI",
    pattern: /\bKPIs?\b/i,
    note: "KPI viene de Key Performance Indicator, en ingles, y se traduce como indicador clave de desempeno. En plural, KPIs. Son las metricas principales que muestran si una accion de marketing esta funcionando y acercandose a su objetivo."
  },
  {
    key: "SEO",
    pattern: /\bSEO\b/i,
    note: "SEO viene de Search Engine Optimization, en ingles, y se traduce como optimizacion para motores de busqueda. Sirve para ganar visibilidad organica en buscadores."
  },
  {
    key: "SEM",
    pattern: /\bSEM\b/i,
    note: "SEM viene de Search Engine Marketing, en ingles, y se traduce como marketing en motores de busqueda. Suele referirse a publicidad pagada en buscadores para captar demanda."
  },
  {
    key: "CRM",
    pattern: /\bCRM\b/i,
    note: "CRM viene de Customer Relationship Management, en ingles, y se traduce como gestion de relaciones con clientes. Es el sistema para organizar leads, clientes y seguimiento comercial."
  },
  {
    key: "CRO",
    pattern: /\bCRO\b/i,
    note: "CRO viene de Conversion Rate Optimization, en ingles, y se traduce como optimizacion de la tasa de conversion. Se usa para mejorar paginas y embudos para convertir mas."
  },
  {
    key: "BI",
    pattern: /\bBI\b/i,
    note: "BI viene de Business Intelligence, en ingles, y se traduce como inteligencia de negocio. Se refiere a lectura y visualizacion de datos para tomar decisiones con mas claridad."
  },
  {
    key: "NPS",
    pattern: /\bNPS\b/i,
    note: "NPS viene de Net Promoter Score, en ingles, y se traduce como indice neto de promotores. Mide que tanto una persona recomendaria la marca."
  },
  {
    key: "CSAT",
    pattern: /\bCSAT\b/i,
    note: "CSAT viene de Customer Satisfaction Score, en ingles, y se traduce como puntuacion de satisfaccion del cliente. Mide el nivel de satisfaccion."
  },
  {
    key: "FODA",
    pattern: /\bFODA\b/i,
    note: "FODA es una sigla en espanol que resume Fortalezas, Oportunidades, Debilidades y Amenazas. Se usa para leer situacion interna y competitiva."
  },
  {
    key: "PESTEL",
    pattern: /\bPESTEL\b/i,
    note: "PESTEL viene de Political, Economic, Social, Technological, Environmental y Legal, en ingles. Se traduce como analisis politico, economico, social, tecnologico, ecologico y legal."
  },
  {
    key: "QR",
    pattern: /\bQR\b/i,
    note: "QR viene de Quick Response, en ingles, y se traduce como respuesta rapida. Es un codigo escaneable que activa una accion desde el celular."
  },
  {
    key: "UX",
    pattern: /\bUX\b/i,
    note: "UX viene de User Experience, en ingles, y se traduce como experiencia de usuario. Habla de la calidad de la experiencia que siente la persona al usar una interfaz."
  },
  {
    key: "UI",
    pattern: /\bUI\b/i,
    note: "UI viene de User Interface, en ingles, y se traduce como interfaz de usuario. Es la capa visual e interactiva con la que la persona navega."
  },
  {
    key: "POP",
    pattern: /\bPOP\b/i,
    note: "POP se usa para Point of Purchase o material de punto de compra. En espanol se entiende como material de punto de venta: piezas visuales usadas para destacar una marca o producto en exhibicion."
  },
  {
    key: "A/B",
    pattern: /A\/B/i,
    note: "A/B no viene de una frase larga sino de comparar una version A contra una version B. Es una prueba para descubrir cual funciona mejor."
  },
  {
    key: "IA",
    pattern: /\bIA\b/i,
    note: "IA significa Inteligencia Artificial, una sigla en espanol. Se refiere a tecnologia que ayuda a crear, analizar o automatizar tareas."
  },
  {
    key: "PR",
    pattern: /\bPR\b/i,
    note: "PR viene de Public Relations, en ingles, y se traduce como Relaciones Publicas. Se usa para gestion de imagen, reputacion y mensajes institucionales."
  },
  {
    key: "GP",
    pattern: /\bGP\b/i,
    note: "GP viene de Growth / Performance, en ingles, y se entiende como crecimiento y rendimiento. Se usa para hablar de crecimiento medible y rendimiento comercial."
  }
];

const SERVICE_INTERSTITIAL_MAP = {
  ME: {
    role: "Direccion estrategica",
    value: "Aclara decisiones antes de invertir tiempo o presupuesto.",
    application: "Se usa para leer mercado, diferenciar oferta y elegir la mejor ruta comercial.",
    summary: "ordena decisiones de mercado, posicionamiento y propuesta de valor"
  },
  MO: {
    role: "Gestion tactica",
    value: "Convierte la estrategia en accion sostenida y medible.",
    application: "Se aplica cuando hace falta coordinar tiempos, responsables, recursos y control.",
    summary: "transforma la estrategia en planes, seguimiento y ejecucion operativa"
  },
  MD: {
    role: "Activacion digital",
    value: "Conecta trafico, datos y conversion en el ecosistema online.",
    application: "Se utiliza para captar demanda, nutrir leads y optimizar embudos digitales.",
    summary: "articula canales, activos y automatizacion para crecer en digital"
  },
  BR: {
    role: "Construccion de marca",
    value: "Hace que la marca se vea mas solida, coherente y memorable.",
    application: "Sirve para definir identidad, tono, relato y percepcion competitiva.",
    summary: "define identidad, voz y consistencia de marca"
  },
  CM: {
    role: "Sistema editorial",
    value: "Convierte ideas y expertise en contenido con direccion comercial.",
    application: "Se usa para autoridad, educacion, conversion y continuidad narrativa.",
    summary: "organiza el contenido para atraer, educar y convertir mejor"
  },
  GP: {
    role: "Optimizacion de crecimiento",
    value: "Detecta palancas que mejoran conversion, retencion y escalabilidad.",
    application: "Se aplica cuando el negocio necesita experimentar, medir y optimizar con ritmo.",
    summary: "mejora el rendimiento con experimentacion y analisis continuo"
  },
  CX: {
    role: "Experiencia del cliente",
    value: "Reduce friccion y eleva la percepcion del servicio en cada punto de contacto.",
    application: "Se usa para fidelizacion, postventa y recorridos mas fluidos.",
    summary: "mejora el recorrido y la relacion del cliente con la marca"
  },
  GA: {
    role: "Interaccion gamificada",
    value: "Aumenta participacion, recuerdo y captura de leads de forma activa.",
    application: "Se aplica en activaciones, promociones y experiencias de engagement.",
    summary: "introduce mecanicas de juego con objetivo de marca y conversion"
  },
  DT: {
    role: "Lectura de datos",
    value: "Da visibilidad real sobre comportamiento, rendimiento y decisiones.",
    application: "Se utiliza para medir, visualizar y seguir la operacion con mas claridad.",
    summary: "convierte datos en lectura util para decidir mejor"
  },
  AU: {
    role: "Flujo automatizado",
    value: "Reduce trabajo manual y acelera respuestas en momentos clave.",
    application: "Se usa para seguimiento comercial, formularios, CRM y secuencias automatizadas.",
    summary: "automatiza tareas y recorridos para ganar velocidad y consistencia"
  },
  IA: {
    role: "Inteligencia aplicada",
    value: "Acelera creatividad, personalizacion y apoyo comercial con mas escala.",
    application: "Se implementa en asistentes, contenido, chatbots y sistemas predictivos.",
    summary: "aplica inteligencia artificial a marketing, ventas y experiencia"
  },
  PV: {
    role: "Conversion comercial",
    value: "Hace mas clara y persuasiva la propuesta en momentos de venta.",
    application: "Se usa en piezas publicitarias, mensajes, creatividades y soporte comercial.",
    summary: "fortalece el mensaje y la presentacion para vender mejor"
  },
  TM: {
    role: "Activacion de canal",
    value: "Mejora visibilidad y traccion comercial en el punto de venta.",
    application: "Se aplica en exhibicion, material POP, activaciones y soporte de canal.",
    summary: "ordena la presencia comercial en canal y punto de venta"
  },
  PR: {
    role: "Narrativa institucional",
    value: "Protege reputacion y refuerza claridad de mensaje ante distintos publicos.",
    application: "Se usa en comunicacion corporativa, reputacional e institucional.",
    summary: "gestiona percepcion, reputacion y mensajes institucionales"
  },
  SEO: {
    role: "Visibilidad organica",
    value: "Mejora descubrimiento, relevancia y posicionamiento sostenible.",
    application: "Se utiliza para estructura tecnica, contenidos y demanda por busqueda.",
    summary: "optimiza la presencia organica en buscadores"
  },
  DEV: {
    role: "Experiencia digital",
    value: "Convierte interfaces en herramientas de marca y conversion.",
    application: "Se aplica en sitios, landings, micrositios e interfaces inmersivas.",
    summary: "disena y construye experiencias web con criterio comercial y visual"
  }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((part) => part + part).join("")
    : value;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

class ServiceEcosystem {
  constructor(services) {
    this.services = services.map((service, index) => ({
      ...service,
      id: `service-${index}`,
      colors: PALETTE[index % PALETTE.length]
    }));

    this.stage = document.getElementById("network-stage");
    this.nodesLayer = document.getElementById("nodes-layer");
    this.subnodesLayer = document.getElementById("subnodes-layer");
    this.lines = document.getElementById("network-lines");
    this.resetButton = document.getElementById("stage-reset");
    this.hint = document.getElementById("stage-hint");
    this.status = document.getElementById("network-status");

    this.panelKicker = document.getElementById("panel-kicker");
    this.panelTitle = document.getElementById("panel-title");
    this.panelDescription = document.getElementById("panel-description");
    this.panelMetricPrimary = document.getElementById("panel-metric-primary");
    this.panelMetricPrimaryLabel = document.getElementById("panel-metric-primary-label");
    this.panelMetricSecondary = document.getElementById("panel-metric-secondary");
    this.panelMetricSecondaryLabel = document.getElementById("panel-metric-secondary-label");
    this.panelList = document.getElementById("panel-list");
    this.modal = document.getElementById("subservice-modal");
    this.modalBackdrop = document.getElementById("subservice-backdrop");
    this.modalClose = document.getElementById("subservice-close");
    this.modalDialog = this.modal ? this.modal.querySelector(".subservice-modal__dialog") : null;
    this.modalKicker = document.getElementById("subservice-modal-kicker");
    this.modalTitle = document.getElementById("subservice-modal-title");
    this.modalDescription = document.getElementById("subservice-modal-description");
    this.modalRole = document.getElementById("subservice-signal-role-text");
    this.modalValue = document.getElementById("subservice-signal-value-text");
    this.modalApplication = document.getElementById("subservice-signal-application-text");
    this.modalGlossary = document.getElementById("subservice-glossary");
    this.modalGlossaryList = document.getElementById("subservice-glossary-list");
    this.holoSystemLabel = document.getElementById("holo-system-label");
    this.holoFocusLabel = document.getElementById("holo-focus-label");
    this.holoOrbitA = document.getElementById("holo-orbit-a");
    this.holoOrbitB = document.getElementById("holo-orbit-b");
    this.holoOrbitC = document.getElementById("holo-orbit-c");
    this.holoCoreCode = document.getElementById("holo-core-code");
    this.holoCoreSubtitle = document.getElementById("holo-core-subtitle");
    this.holoAxisA = document.getElementById("holo-axis-a");
    this.holoAxisB = document.getElementById("holo-axis-b");
    this.holoBars = [
      document.getElementById("holo-bar-a"),
      document.getElementById("holo-bar-b"),
      document.getElementById("holo-bar-c"),
      document.getElementById("holo-bar-d")
    ];

    this.nodes = [];
    this.subnodes = [];
    this.activeNode = null;
    this.isClosing = false;
    this.cleanupTimer = null;
    this.openSubservice = null;
    this.lastFocusedElement = null;
    this.explainedTerms = new Set();
    this.explainedServiceCodes = new Set();
    this.width = 0;
    this.height = 0;
    this.previousWidth = 0;
    this.previousHeight = 0;
    this.lastFrame = 0;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  init() {
    if (!this.stage || !this.nodesLayer || !this.subnodesLayer || !this.lines) {
      return;
    }

    this.createNodes();
    this.bindEvents();
    this.resize();

    if (this.reducedMotion) {
      this.renderNodes();
      return;
    }

    requestAnimationFrame((time) => this.animate(time));
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (this.modal?.classList.contains("is-open")) {
          this.closeSubserviceInterstitial();
          return;
        }

        this.closeActiveService();
      }
    });

    if (this.resetButton) {
      this.resetButton.addEventListener("click", () => this.closeActiveService());
    }

    this.stage.addEventListener("pointermove", (event) => {
      const rect = this.stage.getBoundingClientRect();
      const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      this.stage.style.setProperty("--pointer-x", `${(offsetX * 18).toFixed(2)}px`);
      this.stage.style.setProperty("--pointer-y", `${(offsetY * 18).toFixed(2)}px`);
    });

    this.stage.addEventListener("pointerleave", () => {
      this.stage.style.setProperty("--pointer-x", "0px");
      this.stage.style.setProperty("--pointer-y", "0px");
    });

    this.modalBackdrop?.addEventListener("click", () => this.closeSubserviceInterstitial());
    this.modalClose?.addEventListener("click", () => this.closeSubserviceInterstitial());
    this.modal?.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.closeSubserviceInterstitial();
      }
    });
  }

  createNodes() {
    const fragment = document.createDocumentFragment();

    this.services.forEach((service, index) => {
      const element = document.createElement("button");
      element.className = "service-node";
      element.type = "button";
      element.setAttribute("aria-expanded", "false");
      element.setAttribute("aria-label", `${service.name}. Haz clic para explorar este servicio.`);
      element.style.setProperty("--size", `${this.getNodeDiameter(service.code)}px`);
      element.style.setProperty("--node-accent-a", service.colors[0]);
      element.style.setProperty("--node-accent-b", service.colors[1]);
      element.style.setProperty("--node-glow-a", hexToRgba(service.colors[0], 0.18));
      element.style.setProperty("--node-glow-b", hexToRgba(service.colors[1], 0.12));
      element.innerHTML = `<span class="service-node__code">${service.code}</span>`;

      const node = {
        index,
        service,
        element,
        radius: this.getNodeDiameter(service.code) / 2,
        x: 0,
        y: 0,
        baseX: 0,
        baseY: 0,
        homeAngle: Math.random() * Math.PI * 2,
        homeSpeed: 0.00035 + Math.random() * 0.00035,
        seed: Math.random() * Math.PI * 2,
        driftX: 4 + Math.random() * 4,
        driftY: 3 + Math.random() * 3,
        anchorX: 0,
        anchorY: 0
      };

      element.addEventListener("click", () => {
        if (this.activeNode === node && !this.isClosing) {
          this.closeActiveService();
          return;
        }

        this.activateNode(node);
      });

      this.nodes.push(node);
      fragment.appendChild(element);
    });

    this.nodesLayer.appendChild(fragment);
  }

  getNodeDiameter(code) {
    const viewport = this.width || this.stage?.clientWidth || window.innerWidth;

    if (viewport < 560) {
      if (code === "DEV") {
        return 116;
      }

      if (code === "SEO") {
        return 100;
      }

      return 106;
    }

    if (viewport < 720) {
      if (code === "DEV") {
        return 126;
      }

      if (code === "SEO") {
        return 108;
      }

      return 114;
    }

    if (viewport < 980) {
      if (code === "DEV") {
        return 140;
      }

      if (code === "SEO") {
        return 122;
      }

      return 128;
    }

    if (code === "DEV") {
      return 170;
    }

    return 154;
  }

  getCenter() {
    const compact = this.width < 900;

    return {
      x: compact ? this.width * 0.5 : this.width * 0.56,
      y: compact ? this.height * 0.54 : this.height * 0.53
    };
  }

  getAnchorLayout() {
    if (this.width < 720) {
      return [
        [0.2, 0.14], [0.5, 0.12], [0.8, 0.14],
        [0.18, 0.28], [0.5, 0.28], [0.82, 0.28],
        [0.16, 0.43], [0.84, 0.43],
        [0.18, 0.58], [0.5, 0.58], [0.82, 0.58],
        [0.18, 0.73], [0.5, 0.73], [0.82, 0.73],
        [0.24, 0.88], [0.76, 0.88]
      ];
    }

    if (this.width < 1100) {
      return [
        [0.22, 0.16], [0.44, 0.13], [0.67, 0.14], [0.86, 0.2],
        [0.16, 0.35], [0.36, 0.35], [0.72, 0.35], [0.9, 0.38],
        [0.14, 0.56], [0.34, 0.58], [0.7, 0.58], [0.9, 0.58],
        [0.2, 0.8], [0.42, 0.84], [0.65, 0.83], [0.86, 0.78]
      ];
    }

    return [
      [0.34, 0.16], [0.55, 0.14], [0.74, 0.16], [0.9, 0.26],
      [0.18, 0.33], [0.34, 0.35], [0.77, 0.34], [0.92, 0.46],
      [0.14, 0.55], [0.31, 0.58], [0.76, 0.58], [0.9, 0.68],
      [0.2, 0.77], [0.38, 0.82], [0.62, 0.84], [0.82, 0.78]
    ];
  }

  refreshNodeDimensions() {
    this.nodes.forEach((node) => {
      const diameter = this.getNodeDiameter(node.service.code);
      node.radius = diameter / 2;
      node.element.style.setProperty("--size", `${diameter}px`);
    });
  }

  resolveAnchorPosition(node, anchor) {
    const padding = node.radius + (this.width < 720 ? 16 : 24);
    const usableWidth = this.width - padding * 2;
    const usableHeight = this.height - padding * 2;
    const x = padding + usableWidth * anchor[0];
    const y = padding + usableHeight * anchor[1];

    return {
      x: clamp(x, padding, this.width - padding),
      y: clamp(y, padding, this.height - padding)
    };
  }

  resize() {
    this.previousWidth = this.width;
    this.previousHeight = this.height;
    this.width = this.stage.clientWidth;
    this.height = this.stage.clientHeight;

    if (!this.width || !this.height) {
      return;
    }

    this.refreshNodeDimensions();
    this.placeNodes();

    if (this.activeNode) {
      const center = this.getCenter();
      this.activeNode.x = center.x;
      this.activeNode.y = center.y;
      this.buildSubnodes(this.activeNode.service);
      this.drawLines();
    }

    this.renderNodes();
  }

  placeNodes() {
    const anchors = this.getAnchorLayout();

    this.nodes.forEach((node, index) => {
      const anchor = anchors[index] || anchors[anchors.length - 1];
      const position = this.resolveAnchorPosition(node, anchor);

      node.anchorX = anchor[0];
      node.anchorY = anchor[1];
      node.baseX = position.x;
      node.baseY = position.y;
      node.x = lerp(node.x || position.x, position.x, 0.85);
      node.y = lerp(node.y || position.y, position.y, 0.85);
    });
  }

  animate(time) {
    if (!this.lastFrame) {
      this.lastFrame = time;
    }

    const delta = Math.min((time - this.lastFrame) / 16.6667, 1.6);
    this.lastFrame = time;

    this.updateNodes(delta);
    this.updateSubnodes(delta);
    this.renderNodes();

    requestAnimationFrame((nextTime) => this.animate(nextTime));
  }

  updateNodes(delta) {
    const center = this.getCenter();

    this.nodes.forEach((node) => {
      if (this.activeNode === node) {
        node.x = lerp(node.x, center.x, 0.08 * delta);
        node.y = lerp(node.y, center.y, 0.08 * delta);
        return;
      }

      const activity = this.activeNode ? 0.68 : 1;
      const orbitX = node.baseX + Math.cos(node.homeAngle + node.seed) * (node.driftX * activity);
      const orbitY = node.baseY + Math.sin(node.homeAngle * 0.9 + node.seed * 0.7) * (node.driftY * activity);
      let targetX = orbitX;
      let targetY = orbitY;

      node.homeAngle += node.homeSpeed * delta * 12;

      if (this.activeNode) {
        const dx = targetX - center.x;
        const dy = targetY - center.y;
        const distance = Math.max(Math.hypot(dx, dy), 0.001);
        const minimum = node.radius + this.activeNode.radius + (this.width < 720 ? 84 : 126);

        if (distance < minimum) {
          const scale = minimum / distance;
          targetX = center.x + dx * scale;
          targetY = center.y + dy * scale;
        }
      }

      node.x = lerp(node.x, targetX, 0.03 * delta);
      node.y = lerp(node.y, targetY, 0.03 * delta);
    });
  }

  renderNodes() {
    this.nodes.forEach((node) => {
      node.element.style.left = `${node.x}px`;
      node.element.style.top = `${node.y}px`;
      node.element.style.transform = "translate(-50%, -50%)";
      node.element.classList.toggle("is-active", node === this.activeNode);
      node.element.setAttribute("aria-expanded", String(node === this.activeNode && !this.isClosing));
    });

    this.stage.classList.toggle("is-focused", Boolean(this.activeNode));
    this.hint.style.opacity = this.activeNode ? "0" : "1";
  }

  activateNode(node) {
    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = null;
    this.isClosing = false;
    this.activeNode = node;

    if (this.resetButton) {
      this.resetButton.hidden = false;
    }

    this.buildSubnodes(node.service);
    this.updatePanel(node.service);
    this.status.textContent = `${node.service.name} desplegado con ${node.service.items.length} subservicios.`;

    if (this.reducedMotion) {
      this.snapSubnodes(true);
      this.renderNodes();
    }
  }

  closeActiveService() {
    if (!this.activeNode) {
      return;
    }

    this.isClosing = true;

    this.subnodes.forEach((subnode) => {
      subnode.closing = true;
    });

    this.closeSubserviceInterstitial();

    this.updatePanel(null);
    this.status.textContent = "Modo flotante general restaurado.";

    if (this.resetButton) {
      this.resetButton.hidden = true;
    }

    if (this.reducedMotion) {
      this.finishClose();
      return;
    }

    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = window.setTimeout(() => this.finishClose(), 360);
  }

  finishClose() {
    this.subnodes = [];
    this.subnodesLayer.innerHTML = "";
    this.lines.innerHTML = "";
    this.activeNode = null;
    this.isClosing = false;
    this.renderNodes();
  }

  buildSubnodes(service) {
    this.subnodes = [];
    this.subnodesLayer.innerHTML = "";
    this.lines.innerHTML = "";

    const positions = this.getSubnodeLayout(service.items.length);
    const center = this.getCenter();
    const fragment = document.createDocumentFragment();

    service.items.forEach((item, index) => {
      const element = document.createElement("button");
      element.className = "subnode";
      element.type = "button";
      element.setAttribute("aria-label", `Abrir detalle de ${item}`);
      element.innerHTML = `<span>${item}</span>`;

      const target = positions[index];
      const subnode = {
        item,
        service,
        element,
        x: center.x,
        y: center.y,
        targetX: target.x,
        targetY: target.y,
        progress: 0,
        closing: false
      };

      element.addEventListener("click", () => this.openSubserviceInterstitial(subnode));

      this.subnodes.push(subnode);
      fragment.appendChild(element);
    });

    this.subnodesLayer.appendChild(fragment);
    this.drawLines();

    if (this.reducedMotion) {
      this.snapSubnodes(true);
    }
  }

  getSubnodeLayout(count) {
    const center = this.getCenter();
    const compact = this.width < 720;
    const compactMedium = this.width < 980;
    const firstRing = compact ? 4 : 6;
    const secondRing = compact ? 4 : 5;
    const baseRadius = compact ? 118 : compactMedium ? 150 : 188;
    const ringGap = compact ? 62 : 82;
    const verticalScale = compact ? 0.82 : 0.74;
    const positions = [];
    let index = 0;
    let ring = 0;

    while (index < count) {
      let itemsInRing = count - index;

      if (ring === 0) {
        itemsInRing = Math.min(firstRing, itemsInRing);
      } else if (ring === 1) {
        itemsInRing = Math.min(secondRing, itemsInRing);
      } else {
        itemsInRing = Math.min(6, itemsInRing);
      }

      for (let offset = 0; offset < itemsInRing; offset += 1) {
        const angle = (-Math.PI / 2) + (Math.PI * 2 * offset) / itemsInRing + ring * 0.26;
        const radius = baseRadius + ring * ringGap;
        const x = clamp(
          center.x + Math.cos(angle) * radius,
          78,
          this.width - 78
        );
        const y = clamp(
          center.y + Math.sin(angle) * radius * verticalScale,
          74,
          this.height - 74
        );

        positions.push({ x, y });
      }

      index += itemsInRing;
      ring += 1;
    }

    return positions;
  }

  updateSubnodes(delta) {
    if (!this.subnodes.length) {
      return;
    }

    const center = this.getCenter();

    this.subnodes.forEach((subnode) => {
      const targetX = subnode.closing ? center.x : subnode.targetX;
      const targetY = subnode.closing ? center.y : subnode.targetY;
      const factor = subnode.closing ? 0.1 * delta : 0.08 * delta;

      subnode.x = lerp(subnode.x, targetX, factor);
      subnode.y = lerp(subnode.y, targetY, factor);
      subnode.progress = lerp(subnode.progress, subnode.closing ? 0 : 1, factor);

      subnode.element.style.left = `${subnode.x}px`;
      subnode.element.style.top = `${subnode.y}px`;
      subnode.element.style.transform = `translate(-50%, -50%) scale(${0.72 + subnode.progress * 0.28})`;
      subnode.element.style.opacity = `${0.18 + subnode.progress * 0.82}`;
      subnode.element.style.pointerEvents = subnode.progress > 0.72 ? "auto" : "none";
    });

    this.drawLines();
  }

  snapSubnodes(expanded) {
    const center = this.getCenter();

    this.subnodes.forEach((subnode) => {
      subnode.progress = expanded ? 1 : 0;
      subnode.x = expanded ? subnode.targetX : center.x;
      subnode.y = expanded ? subnode.targetY : center.y;
      subnode.element.style.left = `${subnode.x}px`;
      subnode.element.style.top = `${subnode.y}px`;
      subnode.element.style.transform = `translate(-50%, -50%) scale(${expanded ? 1 : 0.72})`;
      subnode.element.style.opacity = expanded ? "1" : "0";
      subnode.element.style.pointerEvents = expanded ? "auto" : "none";
    });

    this.drawLines();
  }

  drawLines() {
    if (!this.width || !this.height) {
      return;
    }

    this.lines.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);

    while (this.lines.childElementCount < this.subnodes.length) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("network-path");
      this.lines.appendChild(path);
    }

    while (this.lines.childElementCount > this.subnodes.length) {
      this.lines.removeChild(this.lines.lastChild);
    }

    if (!this.activeNode) {
      Array.from(this.lines.children).forEach((path) => path.setAttribute("d", ""));
      return;
    }

    const sourceX = this.activeNode.x;
    const sourceY = this.activeNode.y;

    this.subnodes.forEach((subnode, index) => {
      const path = this.lines.children[index];
      const curveX = lerp(sourceX, subnode.x, 0.5) + (subnode.y > sourceY ? 30 : -30);
      const curveY = lerp(sourceY, subnode.y, 0.5) - (subnode.x > sourceX ? 22 : -22);
      const d = `M ${sourceX} ${sourceY} Q ${curveX} ${curveY} ${subnode.x} ${subnode.y}`;

      path.setAttribute("d", d);
      path.style.opacity = String(subnode.progress);

      try {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length * (1 - subnode.progress)}`;
      } catch (error) {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
      }
    });
  }

  updatePanel(service) {
    if (!service) {
      this.panelKicker.textContent = "Modo flotante general";
      this.panelTitle.textContent = "Explora un mapa vivo de capacidades conectadas.";
      this.panelDescription.textContent =
        "Este espacio reune estrategia, operacion, contenido, experiencia, data, automatizacion, IA, publicidad y desarrollo dentro de un mismo sistema.";
      this.panelMetricPrimary.textContent = "16";
      this.panelMetricPrimaryLabel.textContent = "nodos principales";
      this.panelMetricSecondary.textContent = "+100";
      this.panelMetricSecondaryLabel.textContent = "subservicios articulados";
      this.panelList.innerHTML = `
        <li>Haz clic sobre cualquier sigla para abrir su ecosistema.</li>
        <li>El nodo activo se convierte en el nucleo del sistema.</li>
        <li>Vuelve a pulsarlo para cerrar y regresar al modo flotante.</li>
      `;
      return;
    }

    const serviceMeta = SERVICE_CODE_META[service.code];
    this.panelKicker.textContent = `${service.code} | Nodo activo`;
    this.panelTitle.textContent = service.name;
    const serviceExplanation = serviceMeta && !this.explainedServiceCodes.has(service.code)
      ? ` ${serviceMeta.teaching}`
      : "";
    this.panelDescription.textContent = `${service.description}${serviceExplanation}`;
    this.explainedServiceCodes.add(service.code);
    this.panelMetricPrimary.textContent = String(service.items.length);
    this.panelMetricPrimaryLabel.textContent = "subservicios visibles";
    this.panelMetricSecondary.textContent = service.code;
    this.panelMetricSecondaryLabel.textContent = serviceMeta ? serviceMeta.label : "sigla del nucleo";
    this.panelList.innerHTML = service.items
      .map((item) => {
        const notes = this.getGlossaryNotes(item);
        const noteMarkup = notes.length
          ? `<span class="panel-list-note">${notes.join(" ")}</span>`
          : "";

        return `<li><strong>${item}</strong>${noteMarkup}</li>`;
      })
      .join("");
  }

  getGlossaryNotes(text, options = {}) {
    const { consume = false } = options;
    const notes = [];

    TERM_GLOSSARY.forEach((entry) => {
      if (!entry.pattern.test(text) || this.explainedTerms.has(entry.key)) {
        return;
      }

      notes.push(entry.note);

      if (consume) {
        this.explainedTerms.add(entry.key);
      }
    });

    return notes.slice(0, 3);
  }

  getGlossaryEntries(text, options = {}) {
    const { consume = false } = options;
    const entries = [];

    TERM_GLOSSARY.forEach((entry) => {
      if (!entry.pattern.test(text) || this.explainedTerms.has(entry.key)) {
        return;
      }

      entries.push(entry);

      if (consume) {
        this.explainedTerms.add(entry.key);
      }
    });

    return entries;
  }

  getSubserviceInsight(service, item) {
    const serviceMeta = SERVICE_CODE_META[service.code];
    const meta = SERVICE_INTERSTITIAL_MAP[service.code] || {
      role: "Capacidad conectada",
      value: "Aporta claridad, ejecucion y mejor rendimiento.",
      application: "Se usa dentro del ecosistema para reforzar una parte critica del recorrido.",
      summary: "fortalece una capa clave del sistema comercial"
    };
    const glossaryEntries = this.getGlossaryEntries(item, { consume: true });
    const glossaryNotes = glossaryEntries.map((entry) => entry.note).slice(0, 3);
    const didacticNote = glossaryNotes.length ? ` ${glossaryNotes.join(" ")}` : "";
    const serviceTeaching = serviceMeta && !this.explainedServiceCodes.has(service.code)
      ? ` ${serviceMeta.teaching}`
      : "";
    this.explainedServiceCodes.add(service.code);

    return {
      kicker: `${service.code} | ${service.name}`,
      title: item,
      description: `${item} es un subservicio que ${meta.summary}. Dentro de ${service.name}, su funcion es aportar una capa concreta de trabajo para que la marca gane mas claridad, mejor ejecucion y una experiencia comercial mejor articulada.${serviceTeaching}${didacticNote}`,
      role: `${meta.role}. ${item} cumple una funcion puntual dentro de esa capa.`,
      value: meta.value,
      application: meta.application,
      glossaryEntries,
      visual: this.getVisualTeachingModel(service, item, meta)
    };
  }

  getVisualTeachingModel(service, item, meta) {
    const words = item
      .split(/[\s/,-]+/)
      .filter(Boolean)
      .map((word) => word.trim());
    const labels = [];

    words.forEach((word) => {
      if (labels.length >= 3) {
        return;
      }

      if (word.length <= 2) {
        return;
      }

      labels.push(word);
    });

    while (labels.length < 3) {
      labels.push(["Impacto", "Proceso", "Valor"][labels.length]);
    }

    const hash = Array.from(`${service.code}${item}`).reduce((acc, char, index) => (
      acc + char.charCodeAt(0) * (index + 1)
    ), 0);

    const bars = [
      36 + (hash % 32),
      46 + ((hash >> 1) % 34),
      40 + ((hash >> 2) % 30),
      56 + ((hash >> 3) % 28)
    ];

    return {
      system: service.code,
      focus: meta.role.split(".")[0],
      orbitLabels: labels.slice(0, 3),
      coreCode: service.code,
      subtitle: item,
      axisA: "Lectura",
      axisB: "Accion",
      bars
    };
  }

  openSubserviceInterstitial(subnode) {
    if (!this.modal || !subnode?.service) {
      return;
    }

    const insight = this.getSubserviceInsight(subnode.service, subnode.item);
    const [accentA, accentB] = subnode.service.colors;

    this.openSubservice = subnode;
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.modalKicker.textContent = insight.kicker;
    this.modalTitle.textContent = insight.title;
    this.modalDescription.textContent = insight.description;
    this.modalRole.textContent = insight.role;
    this.modalValue.textContent = insight.value;
    this.modalApplication.textContent = insight.application;
    this.updateHolographicVisual(insight.visual);
    if (this.modalGlossary && this.modalGlossaryList) {
      if (insight.glossaryEntries.length) {
        this.modalGlossary.hidden = false;
        this.modalGlossaryList.innerHTML = insight.glossaryEntries
          .map((entry) => `<li><strong>${entry.key}</strong>: ${entry.note}</li>`)
          .join("");
      } else {
        this.modalGlossary.hidden = true;
        this.modalGlossaryList.innerHTML = "";
      }
    }
    this.modalDialog?.style.setProperty("--modal-accent-a", hexToRgba(accentA, 0.82));
    this.modalDialog?.style.setProperty("--modal-accent-b", hexToRgba(accentB, 0.72));
    this.modal.classList.add("is-open");
    this.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    this.modalClose?.focus();
  }

  updateHolographicVisual(visual) {
    if (!visual) {
      return;
    }

    if (this.holoSystemLabel) {
      this.holoSystemLabel.textContent = visual.system;
    }

    if (this.holoFocusLabel) {
      this.holoFocusLabel.textContent = visual.focus;
    }

    if (this.holoOrbitA) {
      this.holoOrbitA.textContent = visual.orbitLabels[0];
    }

    if (this.holoOrbitB) {
      this.holoOrbitB.textContent = visual.orbitLabels[1];
    }

    if (this.holoOrbitC) {
      this.holoOrbitC.textContent = visual.orbitLabels[2];
    }

    if (this.holoCoreCode) {
      this.holoCoreCode.textContent = visual.coreCode;
    }

    if (this.holoCoreSubtitle) {
      this.holoCoreSubtitle.textContent = visual.subtitle;
    }

    if (this.holoAxisA) {
      this.holoAxisA.textContent = visual.axisA;
    }

    if (this.holoAxisB) {
      this.holoAxisB.textContent = visual.axisB;
    }

    this.holoBars.forEach((bar, index) => {
      if (!bar) {
        return;
      }

      bar.style.setProperty("--bar-size", `${visual.bars[index]}%`);
    });
  }

  closeSubserviceInterstitial() {
    if (!this.modal) {
      return;
    }

    this.openSubservice = null;
    this.modal.classList.remove("is-open");
    this.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    this.lastFocusedElement?.focus();
    this.lastFocusedElement = null;
  }
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");

  if (!items.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.15
  });

  items.forEach((item) => observer.observe(item));
}

document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  const ecosystem = new ServiceEcosystem(SERVICES);
  ecosystem.init();
});
