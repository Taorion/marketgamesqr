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

const urlParams = new URLSearchParams(window.location.search);
const initialMode = urlParams.get("mode");
const initialPackageCode = String(urlParams.get("package") || "").toUpperCase();
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();
const THEME_KEY = "marketgames_portal_theme";
let mode = initialMode === "portal" ? "portal" : "prepaid";
let packages = [];
let plans = [];
let prepaidPlan = null;
let subscriberPackages = [];
let selectedPackage = null;
let selectedPlan = null;
let pricing = {
  display_currency: "USD",
  payment_currency: "COP",
  usd_to_cop_rate: 4000,
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

function usdMoney(value) {
  return `USD ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function usdUnitMoney(value) {
  return `USD ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

function priceLabel(item) {
  if (!item) return "";
  if (Number.isFinite(Number(item.price_usd))) {
    return usdMoney(item.price_usd);
  }
  return escapeHtml(item.price_label || "Cotizacion");
}

function monthlyPlanLabel(plan) {
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotizacion");
  return `${usdMoney(plan.monthly_price_usd)} / mes`;
}

function packageUnitUsd(offer) {
  return Number(offer?.unit_price_usd || (Number(offer?.price_usd || 0) / Math.max(1, Number(offer?.package_size || 1))));
}

function visiblePackages() {
  return packages.filter((item) => mode === "prepaid" ? item.prepaid_allowed : item.subscriber_allowed);
}

function defaultPortalPackage() {
  return subscriberPackages.find((item) => item.code === initialPackageCode)
    || subscriberPackages.find((item) => item.code === "QR500")
    || subscriberPackages[0]
    || null;
}

function selectedTotal() {
  if (mode === "prepaid") {
    return {
      total_cop: Number(selectedPackage?.price_cop || 0),
      total_usd: Number(selectedPackage?.price_usd || 0),
      plan_cop: 0,
      package_cop: Number(selectedPackage?.price_cop || 0),
    };
  }
  return {
    total_cop: Number(selectedPlan?.monthly_price_cop || 0) + Number(selectedPackage?.price_cop || 0),
    total_usd: Number(selectedPlan?.monthly_price_usd || 0) + Number(selectedPackage?.price_usd || 0),
    plan_cop: Number(selectedPlan?.monthly_price_cop || 0),
    package_cop: Number(selectedPackage?.price_cop || 0),
  };
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
      <span class="package-code">${escapeHtml(item.code)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${Number(item.package_size).toLocaleString("es-CO")} tickets QR. ${escapeHtml(item.description || "Tickets para activar beneficios y medir resultados.")}</p>
      <div class="price">${priceLabel(item)}</div>
      <p>${usdUnitMoney(packageUnitUsd(item))} por ticket · capacidad premium de ${Number(item.package_size || 0).toLocaleString("es-CO")} validaciones</p>
      <button type="button" data-package-code="${escapeHtml(item.code)}">${mode === "prepaid" ? "Elegir recarga prepago" : "Empezar con este paquete"}</button>
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
      <p>${escapeHtml(item.access_summary || "Portal mensual para operar beneficios QR.")}</p>
      <ul class="plan-access-list">
        ${(item.included || []).slice(0, item.monthly_price_cop ? 6 : 10).map((benefit) => `
          <li><span class="mark">OK</span><span>${escapeHtml(benefit)}</span></li>
        `).join("")}
      </ul>
      <div class="price">${item.monthly_price_cop ? monthlyPlanLabel(item) : escapeHtml(item.price_label || "Cotizacion")}</div>
      <button type="button" data-plan-code="${escapeHtml(item.code)}">${item.monthly_price_cop ? "Elegir plan" : "Solicitar cotizacion"}</button>
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
    const price = plan.monthly_price_cop ? monthlyPlanLabel(plan) : escapeHtml(plan.price_label || "Compra por paquete");
    return `
      <article class="plan-access-card ${isFull ? "featured" : ""}">
        <span class="package-code">${escapeHtml(plan.code)}</span>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.best_for || plan.access_summary || "")}</p>
        <div class="price">${price}</div>
        <p>${plan.category === "prepaid" ? "Solo paquetes x50 o x200" : "Tickets se compran aparte por paquete"}</p>
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
      ? "Prepago mantiene entrada simple en 50 o 200 tickets. El precio base es USD 0.25 por ticket y el paquete x200 amplia la capacidad inicial antes de pasar al Portal RMS."
      : "La mensualidad del portal sigue una progresion 1x, 3x y 9x: Starter, Growth y Pro. Los tickets se cobran aparte segun la capacidad de activacion que requiera la empresa.";
  }
  pricingLogicGrid.innerHTML = visible.map((offer) => {
    return `
      <article>
        <span>${escapeHtml(offer.code)}</span>
        <strong>${usdUnitMoney(packageUnitUsd(offer))} / ticket</strong>
        <p>${Number(offer.package_size || 0).toLocaleString("es-CO")} tickets para operar campanas, beneficios, redenciones y medicion de revenue con trazabilidad RMS.</p>
      </article>
    `;
  }).join("");
}

function syncMode() {
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  packageGrid.classList.toggle("hidden", false);
  planGrid.classList.toggle("hidden", mode !== "portal");

  if (mode === "prepaid") {
    offerEyebrow.textContent = "Compra minima para activar";
    offerTitle.textContent = "Escoge una de las dos recargas prepago";
    offerCopy.textContent = "QR Validator prepago solo permite 50 o 200 tickets. Para operar mas volumen, dashboard y medicion avanzada debes activar Portal RMS mensual.";
    formEyebrow.textContent = "Datos para activar prepago";
    formTitle.textContent = "Registro y activacion";
    formCopy.textContent = "Usa el NIT de la empresa o tu cedula si aun no tienes empresa constituida.";
    submitButton.textContent = "Crear cuenta y pagar activacion";
    selectedPackage = packages.find((item) => item.prepaid_allowed && item.code === selectedPackage?.code)
      || packages.find((item) => item.prepaid_allowed && item.code === initialPackageCode)
      || packages.find((item) => item.prepaid_allowed)
      || null;
    renderPackages();
    renderSelectionBox();
    renderPricingLogic();
    return;
  }

  offerEyebrow.textContent = "Planes mensuales";
  offerTitle.textContent = "Escoge portal RMS y tickets iniciales";
  offerCopy.textContent = "El portal se muestra en USD desde USD 80 al mes. Al suscribirte eliges con cuantos tickets empezar y activas un entorno premium para medir campanas, leads, redenciones y ventas.";
  formEyebrow.textContent = "Datos para portal mensual";
  formTitle.textContent = "Registro, plan y paquete inicial";
  formCopy.textContent = "El pago total suma la mensualidad del portal mas el paquete de tickets elegido. El usuario queda activo cuando Mercado Pago apruebe.";
  submitButton.textContent = "Crear cuenta y pagar plan + tickets";
  selectedPackage = subscriberPackages.find((item) => item.code === selectedPackage?.code) || defaultPortalPackage();
  renderPackages();
  renderPricingLogic();
  selectPlan(selectedPlan?.code || plans[0]?.code, false);
}

function renderSelectionBox() {
  const syncSticky = (html) => {
    if (stickySelectedBox) stickySelectedBox.innerHTML = html;
  };
  if (mode === "prepaid" && selectedPackage) {
    const html = `
      <span>QR Validator prepago</span>
      <strong>${escapeHtml(selectedPackage.code)} - ${escapeHtml(selectedPackage.title)}</strong>
      <p>${priceLabel(selectedPackage)} - ${Number(selectedPackage.package_size).toLocaleString("es-CO")} tickets. Para operar mas de 200 tickets con dashboard, campanas y analitica, activa Portal RMS.</p>
      <p>Precio mostrado en USD. Mercado Pago procesa la activacion del servicio.</p>
    `;
    selectedBox.innerHTML = html;
    syncSticky(html);
    return;
  }

  if (mode === "portal" && selectedPlan) {
    const totalData = selectedTotal();
    const planUsd = Number(selectedPlan.monthly_price_usd || 0);
    const packageUsd = Number(selectedPackage?.price_usd || 0);
    const totalUsd = totalData.total_usd;
    const html = `
      <span>${selectedPlan.monthly_price_cop ? "Portal mensual + tickets" : "Plan por cotizacion"}</span>
      <strong>${escapeHtml(selectedPlan.name)}${selectedPackage ? ` + ${escapeHtml(selectedPackage.title)}` : ""}</strong>
      <p>${selectedPlan.monthly_price_cop ? `${usdMoney(planUsd)} de portal + ${usdMoney(packageUsd)} en tickets = ${usdMoney(totalUsd)} hoy.` : "Deja tus datos y solicita una propuesta a medida."}</p>
      ${selectedPackage ? `<p>${Number(selectedPackage.package_size).toLocaleString("es-CO")} tickets a ${usdUnitMoney(packageUnitUsd(selectedPackage))} c/u. Capacidad inicial para operar activaciones premium con trazabilidad RMS.</p>` : ""}
    `;
    selectedBox.innerHTML = html;
    syncSticky(html);
  }
}

function selectPackage(code, shouldScroll = true) {
  if (!code) return;
  selectedPackage = packages.find((item) => item.code === code) || selectedPackage;
  if (!selectedPackage) return;
  renderSelectionBox();
  renderPackages();
  renderPricingLogic();
  if (shouldScroll) signupSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectPlan(code, shouldScroll = true) {
  if (!code) return;
  selectedPlan = plans.find((item) => item.code === code) || selectedPlan;
  if (!selectedPlan) return;
  renderSelectionBox();
  renderPlans();
  renderPricingLogic();
  if (mode === "portal") {
    submitButton.textContent = selectedPlan.monthly_price_cop ? "Crear cuenta y pagar plan + tickets" : "Solicitar cotizacion";
  }
  if (shouldScroll) signupSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function switchMode(nextMode, shouldScroll = true) {
  mode = nextMode;
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
  };
}

async function submitSignup(event) {
  event.preventDefault();
  requestMessage.className = "message";
  requestMessage.textContent = "";

  if (mode === "prepaid" && !selectedPackage) {
    requestMessage.textContent = "Selecciona el paquete minimo o uno superior para activar QR Validator.";
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
    requestMessage.textContent = "MarketGamesQR Global requiere cotizacion. Envia estos datos al equipo comercial para definir QR desde 25.000 al mes, portal brandeable, sedes, afiliados, integraciones y soporte.";
    requestMessage.classList.add("ok");
    return;
  }
  const payload = formPayload();
  if (payload.password !== payload.password_confirm) {
    requestMessage.textContent = "La confirmacion de password no coincide.";
    requestMessage.classList.add("error");
    return;
  }
  if (!payload.terms_accepted || !payload.privacy_accepted) {
    requestMessage.textContent = "Debes aceptar terminos, condiciones y politica de privacidad antes de continuar al pago.";
    requestMessage.classList.add("error");
    return;
  }

  submitButton.disabled = true;
  requestMessage.textContent = mode === "prepaid" ? "Creando cuenta y checkout..." : "Creando cuenta y checkout mensual...";
  try {
    const path = mode === "prepaid" ? "/api/public/signup/prepaid" : "/api/public/signup/portal";
    const body = mode === "prepaid"
      ? { ...payload, package_code: selectedPackage.code }
      : { ...payload, plan_code: selectedPlan.code, package_code: selectedPackage.code };
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
      : `Cuenta creada para ${data.plan?.name || "el plan mensual"} con ${selectedPackage.package_size} tickets iniciales. Te llevamos a Mercado Pago; el portal se activa al aprobarse el pago.`;
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
      ? "Entra al portal con el email y password que registraste."
      : "Entra al QR Validador simple con el email y password que registraste.";
    paymentStatusPrimaryLink.href = mode === "portal" ? "/empresa/" : "/qr-validador/";
    paymentStatusPrimaryLink.textContent = mode === "portal" ? "Ingresar al portal" : "Ingresar al QR Validator";
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
    selectedPlan = plans.find((item) => item.code === initialPlanCode) || plans[0] || null;
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
continueToSignupButton?.addEventListener("click", () => signupSection.scrollIntoView({ behavior: "smooth", block: "start" }));
signupForm.addEventListener("submit", submitSignup);
themeSwitch?.addEventListener("change", togglePackagesTheme);
applyPackagesTheme(readPreferredTheme());
init();
