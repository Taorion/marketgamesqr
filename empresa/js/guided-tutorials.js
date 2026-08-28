(() => {
  "use strict";

  const tutorials = [
    {
      id: "sellers",
      icon: "groups_3",
      title: "Crear y preparar vendedores",
      summary: "Crea el acceso del vendedor y reconoce dónde consultar su rendimiento.",
      steps: [
        { view: "sellers", target: ".sellers-hero", title: "Entra al equipo comercial", copy: "Aquí administras vendedores, metas, ventas atribuidas y señales de desempeño con datos del negocio." },
        { target: "#sellerNewButton", title: "Abre Nuevo vendedor", copy: "Este botón abre el registro de un responsable comercial. En el siguiente paso lo abriremos sin guardar nada." },
        { open: "#sellerNewButton", target: "#sellerEditorFields", title: "Completa identidad y acceso", copy: "Registra los datos reales del vendedor. El correo identifica su acceso y permite atribuirle contactos, activaciones y ventas." },
        { target: "#sellerEditorSubmit", title: "Guarda cuando todo esté correcto", copy: "Revisa la información antes de guardar. La guía nunca pulsa este botón ni crea usuarios por ti.", caution: "Guardar vendedor sí modifica el equipo y puede crear acceso al portal." },
        { close: "#sellerEditorClose", target: "#sellersKpiGrid", title: "Consulta el resultado del equipo", copy: "Los indicadores y filtros muestran el aporte real. Puedes abrir la ficha de cada vendedor para revisar metas, clientes, ventas y actividad." }
      ]
    },
    {
      id: "contacts",
      icon: "contacts",
      title: "Asignar responsable a un contacto",
      summary: "Asocia clientes o leads a la persona que debe atenderlos.",
      steps: [
        { view: "leads", click: '#contactTabDirectory', target: ".contact-center-operator-panel", title: "Abre el Directorio comercial", copy: "Clientes y leads conviven en el mismo directorio, pero permanecen diferenciados para medir el embudo correctamente." },
        { target: "#leadDirectoryAudienceTabs", title: "Elige Clientes o Leads", copy: "Cambia entre las dos audiencias según el contacto que quieras asignar. El responsable funciona en ambas." },
        { target: '[data-lead-seller-id]', fallback: ".contact-directory-unified-list", title: "Selecciona el responsable", copy: "En cada tarjeta usa Responsable para elegir un vendedor. La asignación queda ligada al contacto y aparece en sus datos.", empty: "Si la lista está vacía, agrega o importa contactos; el selector aparecerá dentro de cada tarjeta." },
        { target: ".contact-directory-unified-list", title: "Comprueba la responsabilidad", copy: "La tarjeta conserva el vendedor asignado. Desde ese momento el contacto aporta a los leads y conversiones de ese responsable." }
      ]
    },
    {
      id: "contacts-import",
      icon: "upload_file",
      title: "Importar contactos con responsable",
      summary: "Carga clientes por CSV y asigna un vendedor al lote o por fila.",
      steps: [
        { view: "leads", click: ['#contactTabDirectory','[data-lead-directory-audience="customers"]'], target: "#customerCsvImportOpenButton", title: "Abre Clientes e inicia la carga", copy: "En el Directorio elige Clientes. Allí aparece Importar clientes CSV; en el siguiente paso abriremos la ventana." },
        { open: "#customerCsvImportOpenButton", target: "#customerCsvDefaultSellerInput", title: "Define un vendedor para el lote", copy: "Este responsable se aplica solamente a filas sin responsable_comercial. Lo escrito dentro del CSV siempre tiene prioridad." },
        { target: "#customerCsvTemplateButton", title: "Usa la plantilla", copy: "Descarga la estructura esperada. En responsable_comercial escribe el correo corporativo exacto; un nombre solo sirve si es único." },
        { target: "#customerCsvDropzone", title: "Carga y valida el archivo", copy: "Selecciona o arrastra el CSV. Qori valida responsables, duplicados y filas inválidas antes de cambiar datos." },
        { target: "#customerCsvSubmitButton", title: "Importa solo después de revisar", copy: "El botón se habilita cuando existen filas válidas. La guía nunca inicia la importación por ti.", caution: "Antes de importar, revisa la vista previa y cualquier advertencia de responsables no reconocidos." }
      ]
    },
    {
      id: "activations",
      icon: "qr_code_2",
      title: "Asignar activaciones a vendedores",
      summary: "Entrega una activación a un responsable antes de publicarla.",
      steps: [
        { view: "strategic-qr", target: ".activation-premium-head", title: "Entra al Centro de activaciones", copy: "Desde aquí creas experiencias y revisas las activaciones existentes del negocio." },
        { target: '[data-gaming-center-action="create-activation"]', title: "Abre Crear activación", copy: "El constructor permite preparar una activación nueva. En el siguiente paso lo abriremos sin publicarla." },
        { open: '[data-gaming-center-action="create-activation"]', target: "#triviaSellerInput", fallback: "#triviaLauncherForm", title: "Asigna el vendedor responsable", copy: "La asignación es opcional. Los leads que lleguen por esta activación conservarán la atribución al vendedor seleccionado." },
        { target: '#triviaLauncherForm button[type="submit"]', title: "Publica cuando esté lista", copy: "Verifica nombre, campaña, vigencia, beneficio y responsable. La guía no crea ni publica la activación.", caution: "También puedes editar una activación existente y cambiar su responsable sin reescribir el historial anterior." }
      ]
    },
    {
      id: "sales",
      icon: "point_of_sale",
      title: "Registrar una venta atribuida",
      summary: "Conecta cliente, productos, campaña y vendedor en un cierre real.",
      steps: [
        { view: "sales", target: ".sales-command-hero", title: "Entra a Ventas atribuidas", copy: "Este módulo reúne cierres reales y evita confundir actividad comercial con revenue confirmado." },
        { target: "#salesCreateHeadButton", title: "Abre Registrar venta", copy: "El formulario centraliza cliente, productos, canal, campaña y responsable. En el siguiente paso lo abriremos." },
        { open: "#salesCreateHeadButton", target: "#customerAcquisitionSellerInput", title: "Elige quién cerró la venta", copy: "Selecciona al vendedor real, incluso si otra persona está registrando el dato. Así las métricas no dependen de quién digitó." },
        { target: "#customerAcquisitionForm", title: "Completa y revisa el cierre", copy: "Confirma cliente, productos y valores antes de guardar. La guía no registra ventas ni altera pagos.", caution: "La atribución debe reflejar al responsable real, no al usuario que está operando el portal." }
      ]
    },
    {
      id: "revenue",
      icon: "query_stats",
      title: "Analizar resultados por vendedor",
      summary: "Filtra Revenue Center y entiende captación, conversión e ingresos.",
      steps: [
        { view: "dashboard", target: ".dashboard-revenue-head", title: "Entra al Centro de Revenue", copy: "Aquí se conectan activaciones, leads, clientes, ventas y revenue para leer el desempeño comercial completo." },
        { target: "[data-revenue-command-seller]", fallback: "#revenueCommandSurface", title: "Elige un vendedor", copy: "Selecciona Todo el equipo para comparar o un responsable específico para activar su lente individual." },
        { target: ".revenue-seller-lens", fallback: "#revenueCommandSurface", title: "Lee la huella de atribución", copy: "La lente muestra leads propios, inicio y finalización de activaciones, ventas, conversión, ticket y revenue atribuido." },
        { target: ".revenue-seller-visuals", fallback: ".revenue-seller-lens", title: "Compara comportamiento y cierres", copy: "Las gráficas ayudan a detectar volumen sin conversión, vendedores eficientes y oportunidades para acompañamiento." }
      ]
    }
  ];

  const state = { tutorial: null, index: 0, target: null, previousFocus: null, actionTimer: 0, openedClosers: [] };
  const openerClosers = {
    "#sellerNewButton": "#sellerEditorClose",
    "#customerCsvImportOpenButton": "#customerCsvImportClose",
    "#salesCreateHeadButton": "[data-sales-modal-close]"
  };
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const visible = (node) => Boolean(node && !node.hidden && !node.closest("[hidden]") && node.getClientRects().length);
  const firstVisible = (selectors) => {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list.filter(Boolean)) {
      const node = [...document.querySelectorAll(selector)].find(visible);
      if (node) return node;
    }
    return null;
  };

  function storageKey() {
    let business = "session";
    try { business = String((typeof session !== "undefined" && session?.user?.business_id) || "session"); } catch (_) {}
    return `qori-guided-tutorials:${business}`;
  }
  function progressState() {
    try { return JSON.parse(localStorage.getItem(storageKey()) || "{}") || {}; } catch (_) { return {}; }
  }
  function persistComplete(id) {
    const saved = progressState();
    saved.completed = [...new Set([...(saved.completed || []), id])];
    saved.lastCompletedAt = new Date().toISOString();
    localStorage.setItem(storageKey(), JSON.stringify(saved));
  }

  function shell() {
    if (document.getElementById("portalGuideLauncher")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <button class="portal-guide-launcher" id="portalGuideLauncher" type="button" aria-haspopup="dialog" aria-controls="portalGuideLibrary" hidden><span class="material-symbols-outlined" aria-hidden="true">explore</span><span>Guías</span></button>
      <section class="portal-guide-library" id="portalGuideLibrary" role="dialog" aria-modal="true" aria-labelledby="portalGuideLibraryTitle" hidden>
        <div class="portal-guide-library-backdrop" data-guide-close-library></div>
        <article class="portal-guide-library-card" tabindex="-1">
          <header class="portal-guide-library-head"><div><span class="mono-label">ACADEMIA QORI · EN TU PORTAL</span><h2 id="portalGuideLibraryTitle">Tutoriales guiados</h2><p>Aprende sobre los controles reales del portal. Puedes salir en cualquier momento; ningún recorrido guarda datos, asigna responsables ni confirma operaciones por ti.</p></div><button class="icon-button portal-guide-library-close" type="button" data-guide-close-library aria-label="Cerrar tutoriales"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header>
          <div class="portal-guide-grid" id="portalGuideGrid"></div>
        </article>
      </section>
      <section class="portal-guide-tour" id="portalGuideTour" aria-live="polite" hidden>
        <div class="portal-guide-shade"></div><div class="portal-guide-spotlight" id="portalGuideSpotlight" hidden></div>
        <article class="portal-guide-coachmark" id="portalGuideCoachmark" role="dialog" aria-modal="true" aria-labelledby="portalGuideStepTitle" tabindex="-1">
          <div class="portal-guide-progress"><span id="portalGuideProgress"></span></div>
          <div class="portal-guide-coachmark-body"><div class="portal-guide-step-meta"><span id="portalGuideName"></span><span id="portalGuideCounter"></span></div><h3 id="portalGuideStepTitle"></h3><p id="portalGuideStepCopy"></p><div class="portal-guide-note" id="portalGuideNote" hidden><span class="material-symbols-outlined" aria-hidden="true">verified_user</span><span></span></div></div>
          <footer class="portal-guide-actions"><button class="portal-guide-exit" type="button" data-guide-exit>Salir</button><button class="portal-guide-prev" type="button" data-guide-prev>Anterior</button><button class="portal-guide-next" type="button" data-guide-next>Siguiente</button></footer>
        </article>
      </section>`);
    bind();
    renderLibrary();
    syncAuthVisibility();
    new MutationObserver(syncAuthVisibility).observe(document.body, { attributes: true, attributeFilter: ["data-auth-state"] });
  }

  function syncAuthVisibility() {
    const launcher = document.getElementById("portalGuideLauncher");
    if (launcher) launcher.hidden = document.body.dataset.authState === "guest";
  }

  function renderLibrary() {
    const completed = progressState().completed || [];
    const grid = document.getElementById("portalGuideGrid");
    if (!grid) return;
    grid.innerHTML = tutorials.map((tutorial) => {
      const done = completed.includes(tutorial.id);
      return `<article class="portal-guide-card${done ? " is-complete" : ""}"><figure class="portal-guide-card-media"><img src="img/tutorials/qori-guide-${tutorial.id}.gif?v=guided-tutorials-v2-20260828" width="640" height="360" loading="lazy" alt="Vista animada: ${tutorial.title}"><span class="portal-guide-card-icon"><span class="material-symbols-outlined" aria-hidden="true">${tutorial.icon}</span></span></figure><span class="portal-guide-card-copy"><strong>${tutorial.title}</strong><small>${tutorial.summary}</small><em>${done ? "Completado · repetir" : `${tutorial.steps.length} pasos`}</em></span><button class="portal-guide-start" type="button" data-guide-start="${tutorial.id}">${done ? "Repetir" : "Empezar"}</button></article>`;
    }).join("");
  }

  function openLibrary() {
    const modal = document.getElementById("portalGuideLibrary");
    state.previousFocus = document.activeElement;
    renderLibrary();
    modal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => modal.querySelector(".portal-guide-library-card")?.focus());
  }
  function closeLibrary(restore = true) {
    const modal = document.getElementById("portalGuideLibrary");
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (restore) state.previousFocus?.focus?.({ preventScroll: true });
  }

  async function prepareStep(step) {
    if (step.close) firstVisible(step.close)?.click();
    if (step.view) {
      firstVisible(`[data-view="${step.view}"].nav-item`)?.click();
      await wait(260);
    }
    const clicks = Array.isArray(step.click) ? step.click : [step.click];
    for (const selector of clicks.filter(Boolean)) {
      const node = firstVisible(selector);
      if (node) { node.click(); await wait(180); }
    }
    if (step.open) {
      const opener = firstVisible(step.open);
      if (opener) {
        opener.click();
        if (openerClosers[step.open]) state.openedClosers.push(openerClosers[step.open]);
        await wait(260);
      }
    }
  }

  async function showStep(index) {
    if (!state.tutorial) return;
    state.index = Math.max(0, Math.min(index, state.tutorial.steps.length - 1));
    clearTarget();
    const step = state.tutorial.steps[state.index];
    await prepareStep(step);
    if (!state.tutorial) return;
    let target = firstVisible(step.target);
    if (!target && step.fallback) target = firstVisible(step.fallback);
    state.target = target;
    if (target) {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
      await wait(reduceMotion ? 30 : 220);
      target.classList.add("portal-guide-target");
    }
    document.getElementById("portalGuideName").textContent = state.tutorial.title;
    document.getElementById("portalGuideCounter").textContent = `Paso ${state.index + 1} de ${state.tutorial.steps.length}`;
    document.getElementById("portalGuideStepTitle").textContent = step.title;
    document.getElementById("portalGuideStepCopy").textContent = !target && step.empty ? step.empty : step.copy;
    document.getElementById("portalGuideProgress").style.setProperty("--guide-progress", `${((state.index + 1) / state.tutorial.steps.length) * 100}%`);
    const note = document.getElementById("portalGuideNote");
    note.hidden = !step.caution;
    note.querySelector("span:last-child").textContent = step.caution || "";
    document.querySelector("[data-guide-prev]").disabled = state.index === 0;
    document.querySelector("[data-guide-next]").textContent = state.index === state.tutorial.steps.length - 1 ? "Terminar" : "Siguiente";
    positionTour();
    document.getElementById("portalGuideCoachmark").focus({ preventScroll: true });
  }

  function clearTarget() {
    state.target?.classList.remove("portal-guide-target");
    state.target = null;
  }
  function positionTour() {
    const spotlight = document.getElementById("portalGuideSpotlight");
    const card = document.getElementById("portalGuideCoachmark");
    const target = state.target;
    if (!target || window.innerWidth <= 760) {
      spotlight.hidden = !target;
      card.classList.add("is-centered");
      if (target && window.innerWidth <= 760) {
        const rect = target.getBoundingClientRect();
        spotlight.style.cssText = `top:${Math.max(8,rect.top - 7)}px;left:${Math.max(8,rect.left - 7)}px;width:${Math.min(window.innerWidth - 16,rect.width + 14)}px;height:${rect.height + 14}px`;
      }
      return;
    }
    card.classList.remove("is-centered");
    spotlight.hidden = false;
    const rect = target.getBoundingClientRect();
    const pad = 8;
    const top = Math.max(8, rect.top - pad);
    const left = Math.max(8, rect.left - pad);
    const width = Math.min(window.innerWidth - left - 8, rect.width + pad * 2);
    const height = Math.min(window.innerHeight - top - 8, rect.height + pad * 2);
    spotlight.style.cssText = `top:${top}px;left:${left}px;width:${width}px;height:${height}px`;
    const cardWidth = Math.min(390, window.innerWidth - 24);
    const cardHeight = card.offsetHeight || 300;
    let cardLeft = rect.right + 22;
    if (cardLeft + cardWidth > window.innerWidth - 12) cardLeft = rect.left - cardWidth - 22;
    if (cardLeft < 12) cardLeft = Math.max(12, (window.innerWidth - cardWidth) / 2);
    let cardTop = Math.max(12, rect.top + (rect.height - cardHeight) / 2);
    cardTop = Math.min(cardTop, window.innerHeight - cardHeight - 12);
    card.style.left = `${cardLeft}px`;
    card.style.top = `${Math.max(12,cardTop)}px`;
  }

  function start(id) {
    const tutorial = tutorials.find((item) => item.id === id);
    if (!tutorial) return;
    closeLibrary(false);
    state.tutorial = tutorial;
    state.index = 0;
    state.openedClosers = [];
    document.getElementById("portalGuideTour").hidden = false;
    document.body.classList.add("portal-guide-active");
    showStep(0);
  }
  function finish(completed = false) {
    if (!state.tutorial) return;
    if (completed) persistComplete(state.tutorial.id);
    clearTarget();
    [...new Set(state.openedClosers)].reverse().forEach((selector) => firstVisible(selector)?.click());
    state.openedClosers = [];
    state.tutorial = null;
    document.getElementById("portalGuideTour").hidden = true;
    document.body.classList.remove("portal-guide-active");
    document.body.classList.remove("modal-open");
    renderLibrary();
    document.getElementById("portalGuideLauncher")?.focus?.({ preventScroll: true });
  }
  function next() {
    if (!state.tutorial) return;
    if (state.index >= state.tutorial.steps.length - 1) finish(true);
    else showStep(state.index + 1);
  }
  function previous() { if (state.tutorial && state.index > 0) showStep(state.index - 1); }

  function bind() {
    document.getElementById("portalGuideLauncher")?.addEventListener("click", openLibrary);
    document.addEventListener("click", (event) => {
      const startButton = event.target.closest("[data-guide-start]");
      if (startButton) start(startButton.dataset.guideStart);
      if (event.target.closest("[data-guide-close-library]")) closeLibrary();
      if (event.target.closest("[data-guide-exit]")) finish(false);
      if (event.target.closest("[data-guide-next]")) next();
      if (event.target.closest("[data-guide-prev]")) previous();
    });
    document.addEventListener("keydown", (event) => {
      const libraryOpen = !document.getElementById("portalGuideLibrary").hidden;
      if (event.key === "Escape" && state.tutorial) { event.preventDefault(); finish(false); }
      else if (event.key === "Escape" && libraryOpen) { event.preventDefault(); closeLibrary(); }
      else if (state.tutorial && event.key === "ArrowRight") { event.preventDefault(); next(); }
      else if (state.tutorial && event.key === "ArrowLeft") { event.preventDefault(); previous(); }
    });
    window.addEventListener("resize", positionTour, { passive: true });
    window.addEventListener("scroll", () => { window.clearTimeout(state.actionTimer); state.actionTimer = window.setTimeout(positionTour, 40); }, { passive: true, capture: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", shell, { once: true });
  else shell();
  window.QoriGuidedTutorials = { open: openLibrary, start, list: () => tutorials.map(({ id, title, summary }) => ({ id, title, summary })) };
})();
