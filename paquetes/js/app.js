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
const signupCardSecurity = document.getElementById("signupCardSecurity");

const urlParams = new URLSearchParams(window.location.search);
const initialMode = urlParams.get("mode");
const initialPackageCode = String(urlParams.get("package") || "").toUpperCase();
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();
const initialBillingCycle = String(urlParams.get("billing") || "").toLowerCase();
const THEME_KEY = "marketgames_portal_theme";
let mode = initialMode === "portal" ? "portal" : "base";
let billingCycle = initialBillingCycle === "annual" ? "annual" : "monthly";
let packages = [];
let plans = [];
let basePlan = null;
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
  return escapeHtml(item.price_label || "Cotización");
}

function monthlyPlanLabel(plan) {
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotización");
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
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotización");
  return billingCycle === "annual" ? `${copMoney(annualPlanCop(plan))} / año` : monthlyPlanLabel(plan);
}

function visiblePackages() {
  return packages.filter((item) => mode === "base" ? true : item.subscriber_allowed);
}

function activatesBasePortal(item) {
  return Boolean(item?.base_access_allowed && Number(item?.package_size || 0) >= 200);
}

function selectedTotal() {
  if (mode === "base") {
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
  if (mode === "base") return Boolean(selectedPackage);
  return Boolean(selectedPlan && selectedPackage && selectedPlan.monthly_price_cop);
}

function resetSignupVisibility() {
  signupSection.classList.add("hidden");
}

function selectedBenefits() {
  if (mode === "base") {
    return [
      "Portal RMS Base sin mensualidad",
      "Dashboard base, validador interno y Sales Tracker básico",
      "QR preventa y postventa usando saldo operativo",
      "1 campaña activa, leads 30 días y 10 exportaciones al mes",
    ];
  }
  if (selectedPlan && !selectedPlan.monthly_price_cop) {
    return (selectedPlan.included || []).slice(0, 6);
  }
  return [
    ...(selectedPlan?.included || []).slice(0, 5),
    selectedPackage ? `${Number(selectedPackage.package_size || 0).toLocaleString("es-CO")} tickets iniciales sin vencimiento mensual` : "Selecciona tickets iniciales",
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
    throw new Error(data.error?.message || "No se pudo cargar la información.");
  }
  return data;
}

function renderPackages() {
  if (mode === "portal" && !selectedPlan?.monthly_price_cop) {
    packageGrid.innerHTML = "";
    return;
  }
  const offers = visiblePackages();
  packageGrid.innerHTML = offers.map((item) => `
    <article class="package-card ${selectedPackage?.code === item.code ? "selected" : ""}">
      <span class="package-code">${escapeHtml(item.display_code || item.public_code || item.code)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${Number(item.package_size).toLocaleString("es-CO")} tickets. ${escapeHtml(item.description || "Tickets para activar Portal RMS y medir resultados.")}</p>
      <div class="price">${priceLabel(item)}</div>
      <p>${copMoney(item.unit_price_cop)} por ticket. ${item.savings_percent ? `${Number(item.savings_percent).toLocaleString("es-CO")}% mejor valor frente al ticket base.` : "Precio base de entrada."}</p>
      <p>${escapeHtml(item.mode_label || "Tickets")} · ${escapeHtml(item.expiration_label || "")}</p>
      <p class="ticket-balance-note">${activatesBasePortal(item) ? "Activa Portal Base sin mensualidad y suma saldo operativo RMS." : "Paquete T50: saldo operativo para generar QR; el Portal Base se activa desde T200."}</p>
      <button type="button" data-package-code="${escapeHtml(item.code)}" ${mode === "base" && !activatesBasePortal(item) ? "disabled" : ""}>${mode === "base" ? activatesBasePortal(item) ? "Activar Portal Base" : "Recarga T50" : "Sumar tickets"}</button>
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
      <div class="price">${item.monthly_price_cop ? planBillingLabel(item) : escapeHtml(item.price_label || "Cotización")}</div>
      ${item.monthly_price_cop ? `<p>${billingCycle === "annual" ? "Renueva 12 meses de portal con beneficio del 30%. Los tickets van aparte." : "Mensualidad del portal. Los tickets se recargan aparte y no vencen con el mes."}</p>` : ""}
      <button type="button" data-plan-code="${escapeHtml(item.code)}">${item.monthly_price_cop ? "Elegir portal" : "Solicitar cotización"}</button>
    </article>
  `).join("");

  planGrid.querySelectorAll("[data-plan-code]").forEach((button) => {
    button.addEventListener("click", () => selectPlan(button.dataset.planCode));
  });
}

function renderPlanComparison() {
  if (!planComparisonGrid) return;
  const comparisonPlans = [basePlan, ...plans].filter(Boolean);
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
        <p>${plan.category === "ticket_base" || plan.code === "TICKET_BASE" ? "Paquetes desde T50. Portal Base incluido desde T200; tickets como saldo operativo." : "Mensualidad del portal; tickets aparte como saldo sin vencimiento mensual"}</p>
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
    pricingLogicCopy.textContent = mode === "base"
      ? "T50 esta disponible como saldo operativo. T200 o superior activa Portal Base sin mensualidad para generar QR, leads, redenciones y ventas medibles."
      : billingCycle === "annual"
        ? "La anualidad renueva 12 meses de acceso al portal con beneficio del 30%. Los tickets iniciales se cobran aparte, quedan como saldo y no vencen con el mes."
        : "La mensualidad escala cuando necesitas más poder: más campañas, más historial, afiliados, referidos, sedes, usuarios y analítica avanzada.";
  }
  pricingLogicGrid.innerHTML = visible.map((offer) => {
    return `
      <article>
        <span>${escapeHtml(offer.display_code || offer.public_code || offer.code)}</span>
        <strong>${Number(offer.package_size || 0).toLocaleString("es-CO")} tickets</strong>
        <p>${Number(offer.package_size || 0).toLocaleString("es-CO")} tickets para operar campañas, beneficios, redenciones y medición de revenue con trazabilidad RMS.</p>
      </article>
    `;
  }).join("");
}

function syncMode() {
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  planGrid.classList.toggle("hidden", mode !== "portal");
  billingSwitchPanel?.classList.toggle("hidden", mode !== "portal");

  if (mode === "base") {
    packageGrid.classList.remove("hidden");
    offerEyebrow.textContent = "Activación inicial";
    offerTitle.textContent = "Compra tickets y activa tu Portal RMS";
    offerCopy.textContent = "Puedes ver paquetes desde T50. Desde T200 desbloqueas Portal Base sin mensualidad: dashboard, validador interno, QR preventa/postventa, leads, redenciones y Sales Tracker básico.";
    formEyebrow.textContent = "Información de activación";
    formTitle.textContent = "Crea tu acceso al Portal Base";
    formCopy.textContent = "El pago aprobado activa tu Portal RMS y carga tus tickets como saldo operativo.";
    submitButton.textContent = "Crear cuenta y activar portal";
    if (signupCardSecurity) signupCardSecurity.classList.add("hidden");
    selectedPackage = packages.find((item) => activatesBasePortal(item) && item.code === selectedPackage?.code) || null;
    selectedPlan = null;
    renderPackages();
    renderPlans();
    renderSelectionBox();
    renderPricingLogic();
    return;
  }

  offerEyebrow.textContent = "Upgrades mensuales";
  offerTitle.textContent = selectedPlan ? "Ahora escoge tus tickets iniciales" : "Primero escoge tu Portal RMS";
  offerCopy.textContent = billingCycle === "annual"
    ? "La anualidad paga el acceso al portal por 12 meses. Después eliges el paquete inicial de tickets; ese saldo se conserva hasta consumirse."
    : "La mensualidad paga el acceso al portal. Después eliges el paquete inicial de tickets; ese saldo no vence con el mes y se recarga según uso.";
  formEyebrow.textContent = "Información de activación";
  formTitle.textContent = "Registro, upgrade y tickets iniciales";
  formCopy.textContent = billingCycle === "annual"
    ? "Inscribes la tarjeta en Mercado Pago para renovar el portal cada 12 meses. Market Games no recibe ni guarda datos de tarjeta."
    : "Inscribes la tarjeta en Mercado Pago para activar el portal y dejar la renovación automatica lista. Market Games no recibe ni guarda datos de tarjeta.";
  submitButton.textContent = "Crear cuenta e inscribir tarjeta";
  if (signupCardSecurity) signupCardSecurity.classList.remove("hidden");
  syncBillingSwitch();
  selectedPackage = subscriberPackages.find((item) => item.code === selectedPackage?.code) || null;
  packageGrid.classList.toggle("hidden", !selectedPlan?.monthly_price_cop);
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

  if (mode === "base" && selectedPackage) {
    const html = `
      <span>Resumen de compra</span>
      <strong>${escapeHtml(selectedPackage.title)}</strong>
      <div class="summary-lines">
        <div><span>Servicio</span><b>Portal Base activado por tickets</b></div>
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
        <div><span>Plan</span><b>${selectedPlan ? selectedPlan.monthly_price_cop ? planBillingLabel(selectedPlan) : "Cotización" : "Sin plan seleccionado"}</b></div>
        <div><span>Tickets iniciales</span><b>${selectedPackage ? `${Number(selectedPackage.package_size).toLocaleString("es-CO")} tickets - ${copMoney(totalData.package_cop)}` : "Elige saldo inicial después del portal"}</b></div>
        <div><span>Total plan + tickets</span><b>${selectedPlan?.monthly_price_cop && selectedPackage ? copMoney(totalData.total_cop) : "Pendiente"}</b></div>
        <div><span>Autorización</span><b>${selectedPlan?.monthly_price_cop ? "Tarjeta en Mercado Pago" : "Pendiente"}</b></div>
        <div><span>Primer cobro del plan</span><b>${selectedPlan?.monthly_price_cop ? planBillingLabel(selectedPlan) : "Pendiente"}</b></div>
      </div>
      ${selectedPlan?.monthly_price_cop ? `<p>El alta queda activa cuando Mercado Pago autoriza la tarjeta. El resumen totaliza el plan y los tickets elegidos; los tickets seleccionados se cargan como saldo operativo inicial y no vencen por cierre de mes.</p>` : ""}
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
    ? "Elige primero un plan del portal. Después te mostramos los paquetes para definir con cuantos tickets quieres empezar."
    : "Elige un paquete. T50 aparece como saldo operativo; T200 o superior activa tu Portal RMS sin mensualidad y habilita el registro.";
  const html = `
    <span>Resumen de compra</span>
    <strong>Selección pendiente</strong>
    <p>${emptyCopy}</p>
    <ul class="summary-list">
      <li>El formulario queda oculto mientras comparas opciones.</li>
      <li>Puedes cambiar o quitar selecciones antes de continuar.</li>
      <li>Mercado Pago solo se abre después del registro confirmado: pago para Portal Base o autorización de tarjeta para Growth/Premium.</li>
    </ul>
  `;
  selectedBox.innerHTML = html;
  syncSticky(html);
  updateContinueState();
}

function selectPackage(code, shouldScroll = true) {
  if (!code) return;
  if (mode === "portal" && !selectedPlan?.monthly_price_cop) {
    requestMessage.textContent = "Primero selecciona el plan del portal; luego eliges con cuantos tickets quieres empezar.";
    planGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
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
      ? "Crear cuenta e inscribir tarjeta"
      : "Solicitar cotización";
    offerTitle.textContent = selectedPlan.monthly_price_cop ? "Ahora escoge tus tickets iniciales" : "Solicita tu portal Global";
    offerCopy.textContent = selectedPlan.monthly_price_cop
      ? "Ya elegiste el portal. Ahora define el saldo inicial de tickets; se conserva hasta consumirse. La tarjeta se inscribe de forma segura en Mercado Pago."
      : "Global se define por cotización para portal, volumen de tickets, sedes, integraciones y soporte.";
    packageGrid.classList.toggle("hidden", !selectedPlan.monthly_price_cop);
    renderPackages();
    if (shouldScroll && selectedPlan.monthly_price_cop) {
      packageGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function removeSelection(type) {
  resetSignupVisibility();
  if (type === "plan") {
    selectedPlan = null;
    selectedPackage = null;
    packageGrid.classList.add("hidden");
    offerTitle.textContent = "Primero escoge tu Portal RMS";
    offerCopy.textContent = billingCycle === "annual"
      ? "La anualidad paga el acceso al portal por 12 meses. Después eliges el paquete inicial de tickets; ese saldo se conserva hasta consumirse."
      : "La mensualidad paga el acceso al portal. Después eliges el paquete inicial de tickets; ese saldo no vence con el mes y se recarga según uso.";
  }
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
    ? "Confirmar selección y registrar"
    : mode === "portal" && !selectedPlan ? "Elige primero el portal" : mode === "portal" ? "Elige tickets iniciales" : "Elige tickets";
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
      ? "Autorizas la tarjeta para renovar el portal cada 12 meses con beneficio anual. Los tickets iniciales quedan como saldo operativo al activarse la cuenta."
      : "Autorizas la tarjeta para renovar el portal automáticamente. Los tickets iniciales quedan como saldo operativo al activarse la cuenta.";
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

  if (mode === "base" && !selectedPackage) {
    requestMessage.textContent = "Selecciona T200 o superior para activar el Portal Base. T50 queda disponible como recarga de tickets.";
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
    requestMessage.textContent = "Global requiere cotización. Envia la información de activación al equipo comercial para definir portal brandeable, sedes, afiliados, integraciones y soporte.";
    requestMessage.classList.add("ok");
    return;
  }
  const payload = formPayload();
  if (payload.password !== payload.password_confirm) {
    requestMessage.textContent = "La confirmación de clave no coincide.";
    requestMessage.classList.add("error");
    return;
  }
  if (!payload.terms_accepted || !payload.privacy_accepted) {
    requestMessage.textContent = "Debes aceptar términos, condiciones y política de privacidad antes de continuar al pago.";
    requestMessage.classList.add("error");
    return;
  }

  submitButton.disabled = true;
  requestMessage.textContent = mode === "base"
    ? "Creando cuenta y checkout seguro..."
    : "Creando cuenta y autorización segura de tarjeta en Mercado Pago...";
  try {
    const path = mode === "base" ? "/api/public/signup/ticket-base" : "/api/public/signup/portal";
    const body = mode === "base"
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
      throw new Error(mode === "base"
        ? "La cuenta fue creada, pero Mercado Pago no devolvió link de pago."
        : "La cuenta fue creada, pero Mercado Pago no devolvió link para inscribir la tarjeta.");
    }
    requestMessage.textContent = mode === "base"
      ? "Cuenta creada. Te llevamos a Mercado Pago; el acceso se activa al aprobarse el pago."
      : `Cuenta creada para ${data.plan?.name || "el plan del portal"}. Te llevamos a Mercado Pago para inscribir la tarjeta con seguridad; el portal se activa cuando la autorización quede aprobada.`;
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
  if (signup === "card") {
    paymentStatusEyebrow.textContent = "Tarjeta en validación";
    paymentStatusTitle.textContent = "Mercado Pago está confirmando la autorización";
    paymentStatusCopy.textContent = "Tu cuenta queda activa solo cuando Mercado Pago confirma que la tarjeta fue autorizada. Market Games no guarda los datos de tu tarjeta; recibimos un estado seguro de autorización.";
    paymentStatusActionTitle.textContent = "Siguiente paso";
    paymentStatusActionCopy.textContent = "Si la autorización ya fue aprobada por Mercado Pago, entra al portal. Si aún aparece bloqueado, espera unos segundos y vuelve a intentar.";
    paymentStatusPrimaryLink.href = "/empresa/";
    paymentStatusPrimaryLink.textContent = "Ingresar al portal";
    return;
  }

  if (signup === "success") {
    paymentStatusEyebrow.textContent = "Pago aprobado";
    paymentStatusTitle.textContent = "Estamos activando tu cuenta";
    paymentStatusCopy.textContent = "Si Mercado Pago ya notificó el webhook, tu empresa y usuario quedan activos. Si aún no, espera unos segundos y vuelve a intentar.";
    paymentStatusActionTitle.textContent = "Acceso habilitado tras confirmación";
    paymentStatusActionCopy.textContent = mode === "portal"
      ? "Entra al portal con tu acceso registrado."
      : "Entra al Portal Base con tu acceso registrado.";
    paymentStatusPrimaryLink.href = "/empresa/";
    paymentStatusPrimaryLink.textContent = "Ingresar al portal";
    return;
  }

  if (signup === "pending") {
    paymentStatusEyebrow.textContent = "Pago pendiente";
    paymentStatusTitle.textContent = "Tu cuenta aún no está activa";
    paymentStatusCopy.textContent = "Mercado Pago está revisando la transacción o autorización. La empresa y el usuario se activan automáticamente cuando llegue la aprobación.";
    paymentStatusActionTitle.textContent = "Espera confirmación";
    paymentStatusActionCopy.textContent = "Conserva el comprobante y vuelve a intentar el ingreso cuando el pago figure aprobado.";
    paymentStatusPrimaryLink.href = "/paquetes/";
    paymentStatusPrimaryLink.textContent = "Ver paquetes";
    return;
  }

  if (signup === "failure") {
    paymentStatusEyebrow.textContent = "Pago no aprobado";
    paymentStatusTitle.textContent = "No se activo la cuenta";
    paymentStatusCopy.textContent = "El acceso sigue bloqueado porque Mercado Pago no aprobó el pago o la autorización de tarjeta. Puedes reintentar con otro medio.";
    paymentStatusActionTitle.textContent = "Reintentar pago";
    paymentStatusActionCopy.textContent = "Selecciona de nuevo el paquete o plan y completa el pago o la autorización de tarjeta.";
    paymentStatusPrimaryLink.href = mode === "portal" ? "/paquetes/?mode=portal" : "/paquetes/?mode=base";
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
    basePlan = planData.portal_base_plan || planData.prepaid_plan || null;
    plans = (planData.plans || []).filter((plan) => plan.public_signup_available !== false);
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
startPrepaidButton.addEventListener("click", () => switchMode("base"));
startPortalButton.addEventListener("click", () => switchMode("portal"));
continueToSignupButton?.addEventListener("click", continueToSignup);
signupForm.addEventListener("submit", submitSignup);
themeSwitch?.addEventListener("change", togglePackagesTheme);
billingCycleSwitch?.addEventListener("change", () => setBillingCycle(billingCycleSwitch.checked ? "annual" : "monthly"));
applyPackagesTheme(readPreferredTheme());
syncBillingSwitch();
init();
