const packageGrid = document.getElementById("packageGrid");
const planGrid = document.getElementById("planGrid");
const selectedBox = document.getElementById("selectedBox");
const signupForm = document.getElementById("signupForm");
const requestMessage = document.getElementById("requestMessage");
const submitButton = document.getElementById("submitButton");
const formEyebrow = document.getElementById("formEyebrow");
const formTitle = document.getElementById("formTitle");
const formCopy = document.getElementById("formCopy");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const startPrepaidButton = document.getElementById("startPrepaidButton");
const startPortalButton = document.getElementById("startPortalButton");
const offerSection = document.getElementById("offerSection");
const signupSection = document.getElementById("signupSection");
const offerEyebrow = document.getElementById("offerEyebrow");
const offerTitle = document.getElementById("offerTitle");
const offerCopy = document.getElementById("offerCopy");
const paymentStatusSection = document.getElementById("paymentStatusSection");
const paymentStatusEyebrow = document.getElementById("paymentStatusEyebrow");
const paymentStatusTitle = document.getElementById("paymentStatusTitle");
const paymentStatusCopy = document.getElementById("paymentStatusCopy");
const paymentStatusActionTitle = document.getElementById("paymentStatusActionTitle");
const paymentStatusActionCopy = document.getElementById("paymentStatusActionCopy");
const paymentStatusPrimaryLink = document.getElementById("paymentStatusPrimaryLink");
const planComparisonGrid = document.getElementById("planComparisonGrid");
const themeSwitch = document.getElementById("themeSwitch");
const themeSwitchLabel = document.getElementById("themeSwitchLabel");
const stickySelectedBox = document.getElementById("stickySelectedBox");
const continueToSignupButton = document.getElementById("continueToSignupButton");
const pricingLogicGrid = document.getElementById("pricingLogicGrid");
const pricingLogicCopy = document.getElementById("pricingLogicCopy");
const billingSwitchPanel = document.getElementById("billingSwitchPanel");
const billingCycleSwitch = document.getElementById("billingCycleSwitch");
const billingSwitchTitle = document.getElementById("billingSwitchTitle");
const billingSwitchCopy = document.getElementById("billingSwitchCopy");

const urlParams = new URLSearchParams(window.location.search);
const initialMode = urlParams.get("mode");
const initialPackageCode = String(urlParams.get("package") || "").toUpperCase();
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();
const initialBillingCycle = String(urlParams.get("billing") || "").toLowerCase();
const THEME_KEY = "marketgames_portal_theme";
let mode = initialMode === "portal" ? "portal" : "prepaid";
let billingCycle = initialBillingCycle === "annual" ? "annual" : "monthly";
let packages = [];
let plans = [];
let prepaidPlan = null;
let subscriberPackages = [];
let selectedPackage = null;
let selectedPlan = null;
let pricing = {
  display_currency: "COP",
  payment_currency: "COP",
};

function readPreferredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyPackagesTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  if (themeSwitch) themeSwitch.checked = nextTheme === "light";
  if (themeSwitchLabel) themeSwitchLabel.textContent = nextTheme === "light" ? "Claro" : "Oscuro";
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", nextTheme === "light" ? "#fbfdfc" : "#050816");
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    // Theme persistence is optional; the switch still works for the current page.
  }
}

function togglePackagesTheme() {
  applyPackagesTheme(themeSwitch?.checked ? "light" : "dark");
}

function copMoney(value) {
  return `COP ${Number(value || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  })}`;
}

function priceLabel(item) {
  if (!item) return "";
  if (Number.isFinite(Number(item.price_cop))) {
    return copMoney(item.price_cop);
  }
  return escapeHtml(item.price_label || "Cotizacion");
}

function monthlyPlanLabel(plan) {
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotizacion");
  return `${copMoney(plan.monthly_price_cop)} / mes`;
}

function annualPlanCop(plan) {
  return Number(plan?.annual_price_cop || (Number(plan?.monthly_price_cop || 0) * 12 * 0.7));
}

function planBillingAmountCop(plan) {
  if (!plan?.monthly_price_cop) return 0;
  return billingCycle === "annual" ? annualPlanCop(plan) : Number(plan.monthly_price_cop || 0);
}

function planBillingLabel(plan) {
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotizacion");
  return billingCycle === "annual" ? `${copMoney(annualPlanCop(plan))} / ano` : monthlyPlanLabel(plan);
}

function visiblePackages() {
  return packages.filter((item) => mode === "prepaid" ? item.prepaid_allowed : item.subscriber_allowed);
}

function selectedTotal() {
  if (mode === "prepaid") {
    return {
      total_cop: Number(selectedPackage?.price_cop || 0),
      plan_cop: 0,
      package_cop: Number(selectedPackage?.price_cop || 0),
    };
  }
  return {
    total_cop: planBillingAmountCop(selectedPlan) + Number(selectedPackage?.price_cop || 0),
    plan_cop: planBillingAmountCop(selectedPlan),
    package_cop: Number(selectedPackage?.price_cop || 0),
  };
}

function selectionComplete() {
  if (mode === "prepaid") return Boolean(selectedPackage);
  return Boolean(selectedPlan && selectedPackage && selectedPlan.monthly_price_cop);
}

function resetSignupVisibility() {
  signupSection.classList.add("hidden");
}

function selectedBenefits() {
  if (mode === "prepaid") {
    return [
      "Validador de tickets para validar beneficios en tienda",
      "Generador simple y paquetes descargables",
      "Control de canje para evitar doble redencion",
      "Visualizacion de los ultimos 50 leads, sin exportacion",
    ];
  }
  return [
    ...(selectedPlan?.included || []).slice(0, 5),
    selectedPackage ? `${Number(selectedPackage.package_size || 0).toLocaleString("es-CO")} tickets iniciales` : "Selecciona tickets iniciales",
  ];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchJson(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "No se pudo cargar la informacion.");
  }
  return data;
}

function renderPackages() {
  const offers = visiblePackages();
  packageGrid.innerHTML = offers.map((item) => `
    <article class="package-card ${selectedPackage?.code === item.code ? "selected" : ""}">
      <span class="package-code">${escapeHtml(item.display_code || item.public_code || item.code)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${Number(item.package_size).toLocaleString("es-CO")} tickets. ${escapeHtml(item.description || "Tickets para activar beneficios y medir resultados.")}</p>
      <div class="price">${priceLabel(item)}</div>
      <p>${copMoney(item.unit_price_cop)} por ticket. ${item.savings_percent ? `${Number(item.savings_percent).toLocaleString("es-CO")}% mejor valor frente al ticket base.` : "Precio base de entrada."}</p>
      <p>${escapeHtml(item.mode_label || "Tickets")} · ${escapeHtml(item.expiration_label || "")}</p>
      <button type="button" data-package-code="${escapeHtml(item.code)}">${mode === "prepaid" ? "Elegir tickets" : "Sumar tickets"}</button>
    </article>
  `).join("");

  packageGrid.querySelectorAll("[data-package-code]").forEach((button) => {
    button.addEventListener("click", () => selectPackage(button.dataset.packageCode));
  });
}

function renderPlans() {
  planGrid.innerHTML = plans.map((item) => `
    <article class="package-card ${selectedPlan?.code === item.code ? "selected" : ""} ${item.monthly_price_cop ? "" : "quote-plan"}">
      <span class="package-code">${escapeHtml(item.code)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.access_summary || "Portal mensual para operar beneficios con tickets.")}</p>
      <ul class="plan-access-list">
        ${(item.included || []).slice(0, item.monthly_price_cop ? 6 : 10).map((benefit) => `
          <li><span class="mark">OK</span><span>${escapeHtml(benefit)}</span></li>
        `).join("")}
      </ul>
      <div class="price">${item.monthly_price_cop ? planBillingLabel(item) : escapeHtml(item.price_label || "Cotizacion")}</div>
      ${item.monthly_price_cop ? `<p>${billingCycle === "annual" ? "Beneficio anual 30% frente al pago mes a mes." : "Anualidad disponible con beneficio del 30%."}</p>` : ""}
      <button type="button" data-plan-code="${escapeHtml(item.code)}">${item.monthly_price_cop ? "Sumar plan" : "Solicitar cotizacion"}</button>
    </article>
  `).join("");

  planGrid.querySelectorAll("[data-plan-code]").forEach((button) => {
    button.addEventListener("click", () => selectPlan(button.dataset.planCode));
  });
}

function renderPlanComparison() {
  if (!planComparisonGrid) return;
  const comparisonPlans = [prepaidPlan, ...plans].filter(Boolean);
  planComparisonGrid.innerHTML = comparisonPlans.map((plan) => {
    const isFull = plan.code === "GLOBAL";
    const price = plan.monthly_price_cop ? planBillingLabel(plan) : escapeHtml(plan.price_label || "Compra por paquete");
    return `
      <article class="plan-access-card ${isFull ? "featured" : ""}">
        <span class="package-code">${escapeHtml(plan.code)}</span>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.best_for || plan.access_summary || "")}</p>
        <div class="price">${price}</div>
        ${plan.monthly_price_cop ? `<p>${billingCycle === "annual" ? "Anualidad activa con beneficio del 30%." : "Anualidad disponible con beneficio del 30%."}</p>` : ""}
        <p>${plan.category === "prepaid" ? "Solo paquetes T50 o T200" : "Tickets se compran aparte por paquete"}</p>
        <ul class="plan-access-list">
          ${(plan.included || []).map((benefit) => `
            <li><span class="mark">OK</span><span>${escapeHtml(benefit)}</span></li>
          `).join("")}
          ${(plan.not_included || []).slice(0, 4).map((restriction) => `
            <li class="no"><span class="mark">-</span><span>${escapeHtml(restriction)}</span></li>
          `).join("")}
        </ul>
      </article>
    `;
  }).join("");
}

function renderPricingLogic() {
  if (!pricingLogicGrid) return;
  const visible = visiblePackages();
  if (pricingLogicCopy) {
    pricingLogicCopy.textContent = mode === "prepaid"
      ? "Prepago mantiene entrada simple en 50 o 200 tickets. El paquete x200 amplia la capacidad inicial antes de pasar al Portal RMS."
      : billingCycle === "annual"
        ? "La anualidad toma el valor de 12 meses del portal y aplica un beneficio del 30%. Los tickets iniciales se cobran aparte segun la capacidad de activacion."
        : "La mensualidad del portal escala por capacidad operativa: Started, Medium y Premium. Los tickets se cobran aparte segun la capacidad de activacion que requiera la empresa.";
  }
  pricingLogicGrid.innerHTML = visible.map((offer) => {
    return `
      <article>
        <span>${escapeHtml(offer.display_code || offer.public_code || offer.code)}</span>
        <strong>${Number(offer.package_size || 0).toLocaleString("es-CO")} tickets</strong>
        <p>${Number(offer.package_size || 0).toLocaleString("es-CO")} tickets para operar campanas, beneficios, redenciones y medicion de revenue con trazabilidad RMS.</p>
      </article>
    `;
  }).join("");
}

function syncMode() {
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  packageGrid.classList.toggle("hidden", false);
  planGrid.classList.toggle("hidden", mode !== "portal");
  billingSwitchPanel?.classList.toggle("hidden", mode !== "portal");

  if (mode === "prepaid") {
    offerEyebrow.textContent = "Activacion inicial";
    offerTitle.textContent = "Escoge una de las dos recargas prepago";
    offerCopy.textContent = "El validador prepago solo permite 50 o 200 tickets. Para operar mas volumen, dashboard y medicion avanzada debes activar Portal RMS mensual.";
    formEyebrow.textContent = "Informacion de activacion";
    formTitle.textContent = "Registro y activacion";
    formCopy.textContent = "Usa el NIT de la empresa o tu cedula si aun no tienes empresa constituida.";
    submitButton.textContent = "Crear cuenta y pagar activacion";
    selectedPackage = packages.find((item) => item.prepaid_allowed && item.code === selectedPackage?.code) || null;
    selectedPlan = null;
    renderPackages();
    renderPlans();
    renderSelectionBox();
    renderPricingLogic();
    return;
  }

  offerEyebrow.textContent = "Planes mensuales";
  offerTitle.textContent = "Escoge portal RMS y tickets iniciales";
  offerCopy.textContent = billingCycle === "annual"
    ? "El portal anual se muestra en COP con beneficio del 30% frente al pago mes a mes. Al suscribirte eliges con cuantos tickets empezar y activas un entorno premium."
    : "El portal se muestra en COP por afiliacion mensual. Al suscribirte eliges con cuantos tickets empezar y activas un entorno premium para medir campanas, leads, redenciones y ventas.";
  formEyebrow.textContent = "Informacion de activacion";
  formTitle.textContent = "Registro, plan y paquete inicial";
  formCopy.textContent = billingCycle === "annual"
    ? "El pago total suma la anualidad del portal con beneficio del 30% mas el paquete de tickets elegido. El usuario queda activo cuando Mercado Pago apruebe."
    : "El pago total suma la mensualidad del portal mas el paquete de tickets elegido. El usuario queda activo cuando Mercado Pago apruebe.";
  submitButton.textContent = billingCycle === "annual" ? "Crear cuenta y pagar anualidad + tickets" : "Crear cuenta y pagar plan + tickets";
  syncBillingSwitch();
  selectedPackage = subscriberPackages.find((item) => item.code === selectedPackage?.code) || null;
  renderPackages();
  renderPlans();
  renderPricingLogic();
  renderSelectionBox();
}

function renderSelectionBox() {
  const syncSticky = (html) => {
    if (stickySelectedBox) stickySelectedBox.innerHTML = html;
  };
  const bindSummaryActions = () => {
    document.querySelectorAll("[data-remove-selection]").forEach((button) => {
      button.addEventListener("click", () => removeSelection(button.dataset.removeSelection));
    });
  };

  if (mode === "prepaid" && selectedPackage) {
    const html = `
      <span>Resumen de compra</span>
      <strong>${escapeHtml(selectedPackage.title)}</strong>
      <div class="summary-lines">
        <div><span>Servicio</span><b>Validador prepago</b></div>
        <div><span>Tickets</span><b>${Number(selectedPackage.package_size).toLocaleString("es-CO")} tickets</b></div>
        <div><span>Total hoy</span><b>${priceLabel(selectedPackage)}</b></div>
      </div>
      <ul class="summary-list">
        ${selectedBenefits().map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <div class="summary-actions">
        <button class="secondary-button" type="button" data-remove-selection="package">Quitar tickets</button>
      </div>
    `;
    selectedBox.innerHTML = html;
    syncSticky(html);
    bindSummaryActions();
    updateContinueState();
    return;
  }

  if (mode === "portal" && (selectedPlan || selectedPackage)) {
    const totalData = selectedTotal();
    const html = `
      <span>Resumen de compra</span>
      <strong>${escapeHtml(selectedPlan?.name || "Plan pendiente")}${selectedPackage ? ` + ${escapeHtml(selectedPackage.title)}` : ""}</strong>
      <div class="summary-lines">
        <div><span>Plan</span><b>${selectedPlan ? selectedPlan.monthly_price_cop ? planBillingLabel(selectedPlan) : "Cotizacion" : "Sin plan seleccionado"}</b></div>
        <div><span>Tickets</span><b>${selectedPackage ? `${Number(selectedPackage.package_size).toLocaleString("es-CO")} tickets - ${copMoney(selectedPackage.price_cop)}` : "Sin paquete seleccionado"}</b></div>
        <div><span>Total hoy</span><b>${selectedPlan?.monthly_price_cop && selectedPackage ? copMoney(totalData.total_cop) : "Pendiente"}</b></div>
      </div>
      ${selectedPlan?.monthly_price_cop && billingCycle === "annual" ? `<p>Incluye beneficio anual del 30% frente al pago mes a mes. Los tickets se suman una sola vez al inicio.</p>` : ""}
      <ul class="summary-list">
        ${selectedBenefits().map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <div class="summary-actions">
        ${selectedPlan ? '<button class="secondary-button" type="button" data-remove-selection="plan">Quitar plan</button>' : ""}
        ${selectedPackage ? '<button class="secondary-button" type="button" data-remove-selection="package">Quitar tickets</button>' : ""}
      </div>
    `;
    selectedBox.innerHTML = html;
    syncSticky(html);
    bindSummaryActions();
    updateContinueState();
    return;
  }

  const emptyCopy = mode === "portal"
    ? "Elige primero un plan del portal y luego suma el paquete de tickets inicial. El registro se habilita solo cuando tengas ambos."
    : "Elige un paquete prepago de 50 o 200 tickets. El registro se habilita cuando confirmes esa seleccion.";
  const html = `
    <span>Resumen de compra</span>
    <strong>Seleccion pendiente</strong>
    <p>${emptyCopy}</p>
    <ul class="summary-list">
      <li>El formulario queda oculto mientras comparas opciones.</li>
      <li>Puedes cambiar o quitar selecciones antes de pagar.</li>
      <li>Mercado Pago solo se abre despues del registro confirmado.</li>
    </ul>
  `;
  selectedBox.innerHTML = html;
  syncSticky(html);
  updateContinueState();
}

function selectPackage(code, shouldScroll = true) {
  if (!code) return;
  selectedPackage = packages.find((item) => item.code === code) || selectedPackage;
  if (!selectedPackage) return;
  resetSignupVisibility();
  renderSelectionBox();
  renderPackages();
  renderPricingLogic();
}

function selectPlan(code, shouldScroll = true) {
  if (!code) return;
  selectedPlan = plans.find((item) => item.code === code) || selectedPlan;
  if (!selectedPlan) return;
  resetSignupVisibility();
  renderSelectionBox();
  renderPlans();
  renderPricingLogic();
  if (mode === "portal") {
    submitButton.textContent = selectedPlan.monthly_price_cop
      ? billingCycle === "annual" ? "Crear cuenta y pagar anualidad + tickets" : "Crear cuenta y pagar plan + tickets"
      : "Solicitar cotizacion";
  }
}

function removeSelection(type) {
  resetSignupVisibility();
  if (type === "plan") selectedPlan = null;
  if (type === "package") selectedPackage = null;
  renderPackages();
  renderPlans();
  renderSelectionBox();
}

function updateContinueState() {
  if (!continueToSignupButton) return;
  const ready = selectionComplete();
  continueToSignupButton.disabled = !ready;
  continueToSignupButton.textContent = ready
    ? "Confirmar seleccion y registrar"
    : mode === "portal" ? "Elige plan y tickets" : "Elige tickets";
}

function continueToSignup() {
  if (!selectionComplete()) {
    renderSelectionBox();
    return;
  }
  signupSection.classList.remove("hidden");
  signupSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncBillingSwitch() {
  if (billingCycleSwitch) billingCycleSwitch.checked = billingCycle === "annual";
  if (billingSwitchTitle) billingSwitchTitle.textContent = billingCycle === "annual" ? "Anualidad activa" : "Mensual";
  if (billingSwitchCopy) {
    billingSwitchCopy.textContent = billingCycle === "annual"
      ? "Pagas 12 meses del portal con beneficio anual del 30%. Los tickets iniciales se suman una sola vez."
      : "Activa el switch anual para pagar 12 meses con beneficio anual del 30% frente al pago mes a mes.";
  }
}

function setBillingCycle(nextCycle) {
  billingCycle = nextCycle === "annual" ? "annual" : "monthly";
  syncBillingSwitch();
  renderPlans();
  renderPlanComparison();
  renderPricingLogic();
  renderSelectionBox();
  if (mode === "portal") {
    syncMode();
  }
}

function switchMode(nextMode, shouldScroll = true) {
  mode = nextMode;
  resetSignupVisibility();
  syncMode();
  if (shouldScroll) offerSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formPayload() {
  return {
    company_name: document.getElementById("companyName").value.trim() || null,
    contact_name: document.getElementById("contactName").value.trim(),
    nit: document.getElementById("nit").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    password_confirm: document.getElementById("passwordConfirm").value,
    website: document.getElementById("website").value.trim() || null,
    city: document.getElementById("city").value.trim() || null,
    address: document.getElementById("address").value.trim() || null,
    terms_accepted: document.getElementById("termsAccepted").checked,
    privacy_accepted: document.getElementById("privacyAccepted").checked,
    legal_version: "2026-06-16",
    billing_cycle: billingCycle,
  };
}

async function submitSignup(event) {
  event.preventDefault();
  requestMessage.className = "message";
  requestMessage.textContent = "";

  if (mode === "prepaid" && !selectedPackage) {
    requestMessage.textContent = "Selecciona un paquete de activacion para activar el validador de tickets.";
    requestMessage.classList.add("error");
    return;
  }
  if (mode === "portal" && !selectedPlan) {
    requestMessage.textContent = "Selecciona el plan mensual al que te quieres inscribir.";
    requestMessage.classList.add("error");
    return;
  }
  if (mode === "portal" && !selectedPackage) {
    requestMessage.textContent = "Selecciona con cuantos tickets quieres empezar.";
    requestMessage.classList.add("error");
    return;
  }
  if (mode === "portal" && selectedPlan && !selectedPlan.monthly_price_cop) {
    requestMessage.textContent = "Global requiere cotizacion. Envia la informacion de activacion al equipo comercial para definir portal brandeable, sedes, afiliados, integraciones y soporte.";
    requestMessage.classList.add("ok");
    return;
  }
  const payload = formPayload();
  if (payload.password !== payload.password_confirm) {
    requestMessage.textContent = "La confirmacion de clave no coincide.";
    requestMessage.classList.add("error");
    return;
  }
  if (!payload.terms_accepted || !payload.privacy_accepted) {
    requestMessage.textContent = "Debes aceptar terminos, condiciones y politica de privacidad antes de continuar al pago.";
    requestMessage.classList.add("error");
    return;
  }

  submitButton.disabled = true;
  requestMessage.textContent = mode === "prepaid" ? "Creando cuenta y checkout..." : "Creando cuenta y checkout del portal...";
  try {
    const path = mode === "prepaid" ? "/api/public/signup/prepaid" : "/api/public/signup/portal";
    const body = mode === "prepaid"
      ? { ...payload, package_code: selectedPackage.code }
      : { ...payload, plan_code: selectedPlan.code, package_code: selectedPackage.code, billing_cycle: billingCycle };
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || "No se pudo completar el registro.");
    }

    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("La cuenta fue creada, pero Mercado Pago no devolvio link de pago.");
    }
    requestMessage.textContent = mode === "prepaid"
      ? "Cuenta creada. Te llevamos a Mercado Pago; el acceso se activa al aprobarse el pago."
      : `Cuenta creada para ${data.plan?.name || "el plan del portal"} en ciclo ${billingCycle === "annual" ? "anual" : "mensual"} con ${selectedPackage.package_size} tickets iniciales. Te llevamos a Mercado Pago; el portal se activa al aprobarse el pago.`;
    requestMessage.classList.add("ok");
    window.location.href = checkoutUrl;
  } catch (error) {
    requestMessage.textContent = error.message;
    requestMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
  }
}

function renderPaymentStatus() {
  const signup = urlParams.get("signup");
  if (!signup || !paymentStatusSection) return;

  paymentStatusSection.classList.remove("hidden");
  if (signup === "success") {
    paymentStatusEyebrow.textContent = "Pago aprobado";
    paymentStatusTitle.textContent = "Estamos activando tu cuenta";
    paymentStatusCopy.textContent = "Si Mercado Pago ya notifico el webhook, tu empresa y usuario quedan activos. Si aun no, espera unos segundos y vuelve a intentar.";
    paymentStatusActionTitle.textContent = "Acceso habilitado tras confirmacion";
    paymentStatusActionCopy.textContent = mode === "portal"
      ? "Entra al portal con tu acceso registrado."
      : "Entra al validador de tickets con tu acceso registrado.";
    paymentStatusPrimaryLink.href = mode === "portal" ? "/empresa/" : "/qr-validador/";
    paymentStatusPrimaryLink.textContent = mode === "portal" ? "Ingresar al portal" : "Ingresar al validador";
    return;
  }

  if (signup === "pending") {
    paymentStatusEyebrow.textContent = "Pago pendiente";
    paymentStatusTitle.textContent = "Tu cuenta aun no esta activa";
    paymentStatusCopy.textContent = "Mercado Pago esta revisando la transaccion. La empresa y el usuario se activan automaticamente cuando llegue la aprobacion.";
    paymentStatusActionTitle.textContent = "Espera confirmacion";
    paymentStatusActionCopy.textContent = "Conserva el comprobante y vuelve a intentar el ingreso cuando el pago figure aprobado.";
    paymentStatusPrimaryLink.href = "/paquetes/";
    paymentStatusPrimaryLink.textContent = "Ver paquetes";
    return;
  }

  if (signup === "failure") {
    paymentStatusEyebrow.textContent = "Pago no aprobado";
    paymentStatusTitle.textContent = "No se activo la cuenta";
    paymentStatusCopy.textContent = "El acceso sigue bloqueado porque el pago no fue aprobado. Puedes registrar una nueva compra o reintentar con otro medio.";
    paymentStatusActionTitle.textContent = "Reintentar pago";
    paymentStatusActionCopy.textContent = "Selecciona de nuevo el paquete o plan y completa el checkout.";
    paymentStatusPrimaryLink.href = mode === "portal" ? "/paquetes/?mode=portal" : "/paquetes/?mode=prepaid";
    paymentStatusPrimaryLink.textContent = "Reintentar";
  }
}

async function init() {
  try {
    const [packageData, planData] = await Promise.all([
      fetchJson("/api/public/packages"),
      fetchJson("/api/public/subscription-plans"),
    ]);
    packages = packageData.packages || [];
    pricing = planData.pricing || packageData.pricing || pricing;
    prepaidPlan = planData.prepaid_plan || null;
    plans = planData.plans || [];
    subscriberPackages = planData.subscriber_packages || packages.filter((item) => item.subscriber_allowed);
    selectedPackage = packages.find((item) => item.code === initialPackageCode) || null;
    selectedPlan = plans.find((item) => item.code === initialPlanCode) || null;
    renderPackages();
    renderPlans();
    renderPlanComparison();
    renderPricingLogic();
    syncMode();
    renderPaymentStatus();
  } catch (error) {
    requestMessage.textContent = error.message;
    requestMessage.classList.add("error");
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode, false));
});
startPrepaidButton.addEventListener("click", () => switchMode("prepaid"));
startPortalButton.addEventListener("click", () => switchMode("portal"));
continueToSignupButton?.addEventListener("click", continueToSignup);
signupForm.addEventListener("submit", submitSignup);
themeSwitch?.addEventListener("change", togglePackagesTheme);
billingCycleSwitch?.addEventListener("change", () => setBillingCycle(billingCycleSwitch.checked ? "annual" : "monthly"));
applyPackagesTheme(readPreferredTheme());
syncBillingSwitch();
init();
