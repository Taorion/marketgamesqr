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

const urlParams = new URLSearchParams(window.location.search);
const initialMode = urlParams.get("mode");
const initialPackageCode = String(urlParams.get("package") || "").toUpperCase();
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();
const THEME_KEY = "marketgames_portal_theme";
let mode = initialMode === "portal" ? "portal" : "prepaid";
let packages = [];
let plans = [];
let prepaidPlan = null;
let selectedPackage = null;
let selectedPlan = null;

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

function money(value) {
  return `$ ${Number(value || 0).toLocaleString("es-CO")}`;
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
  packageGrid.innerHTML = packages.map((item) => `
    <article class="package-card ${selectedPackage?.code === item.code ? "selected" : ""}">
      <span class="package-code">${escapeHtml(item.code)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${Number(item.package_size).toLocaleString("es-CO")} creditos para activar beneficios QR y validarlos en tienda.</p>
      <div class="price">${money(item.price_cop)}</div>
      <button type="button" data-package-code="${escapeHtml(item.code)}">Elegir y registrarme</button>
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
      <div class="price">${item.monthly_price_cop ? money(item.monthly_price_cop) : escapeHtml(item.price_label || "Cotizacion")}</div>
      <button type="button" data-plan-code="${escapeHtml(item.code)}">${item.monthly_price_cop ? "Elegir y registrarme" : "Solicitar cotizacion"}</button>
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
    const price = plan.monthly_price_cop ? money(plan.monthly_price_cop) : escapeHtml(plan.price_label || "Compra por paquete");
    const qrIncluded = plan.limits?.monthly_qr_included ?? plan.qr_monthly_included;
    return `
      <article class="plan-access-card ${isFull ? "featured" : ""}">
        <span class="package-code">${escapeHtml(plan.code)}</span>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.best_for || plan.access_summary || "")}</p>
        <div class="price">${price}</div>
        <p>${plan.code === "GLOBAL" ? "25.000+ QR al mes por cotizacion" : qrIncluded ? `${Number(qrIncluded).toLocaleString("es-CO")} QR incluidos al mes` : "QR por paquete comprado"}</p>
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

function syncMode() {
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  packageGrid.classList.toggle("hidden", mode !== "prepaid");
  planGrid.classList.toggle("hidden", mode !== "portal");

  if (mode === "prepaid") {
    offerEyebrow.textContent = "Compra minima para activar";
    offerTitle.textContent = "Escoge tus creditos QR";
    offerCopy.textContent = "El paquete mas basico cuesta $19.900 y ya te permite crear cuenta, pagar y empezar a validar beneficios.";
    formEyebrow.textContent = "Datos para activar prepago";
    formTitle.textContent = "Registro y pago minimo";
    formCopy.textContent = "Usa el NIT de la empresa o tu cedula si aun no tienes empresa constituida.";
    submitButton.textContent = "Crear cuenta y pagar activacion";
    selectPackage(selectedPackage?.code || packages[0]?.code, false);
    return;
  }

  offerEyebrow.textContent = "Planes mensuales";
  offerTitle.textContent = "Escoge el portal RMS para operar campanas";
  offerCopy.textContent = "Registra tus datos, paga desde $149.000 al mes o solicita Global por cotizacion para operaciones de alto volumen.";
  formEyebrow.textContent = "Datos para portal mensual";
  formTitle.textContent = "Registro y pago mensual";
  formCopy.textContent = "Elige el plan mensual. El usuario y la empresa quedan activos solo cuando el pago sea aprobado.";
  submitButton.textContent = "Crear cuenta y pagar mensualidad";
  selectPlan(selectedPlan?.code || plans[0]?.code, false);
}

function selectPackage(code, shouldScroll = true) {
  if (!code) return;
  selectedPackage = packages.find((item) => item.code === code) || selectedPackage;
  if (!selectedPackage) return;
  selectedBox.innerHTML = `
    <span>QR Validator prepago</span>
    <strong>${escapeHtml(selectedPackage.code)} - ${escapeHtml(selectedPackage.title)}</strong>
    <p>${money(selectedPackage.price_cop)} - ${Number(selectedPackage.package_size).toLocaleString("es-CO")} creditos. Crea usuario, paga y empieza cuando Mercado Pago apruebe.</p>
  `;
  renderPackages();
  if (shouldScroll) signupSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectPlan(code, shouldScroll = true) {
  if (!code) return;
  selectedPlan = plans.find((item) => item.code === code) || selectedPlan;
  if (!selectedPlan) return;
  selectedBox.innerHTML = `
    <span>${selectedPlan.monthly_price_cop ? "Portal mensual" : "Plan por cotizacion"}</span>
    <strong>${escapeHtml(selectedPlan.name)}</strong>
    <p>${selectedPlan.monthly_price_cop ? money(selectedPlan.monthly_price_cop) : escapeHtml(selectedPlan.price_label || "Cotizacion")} - ${selectedPlan.code === "GLOBAL" ? "25.000+ QR/mes segun alcance" : `${Number(selectedPlan.limits?.monthly_qr_included || 0).toLocaleString("es-CO")} QR/mes`}. ${selectedPlan.monthly_price_cop ? "Crea usuario, paga y activa el portal." : "Deja tus datos y solicita una propuesta a medida."}</p>
  `;
  renderPlans();
  if (mode === "portal") {
    submitButton.textContent = selectedPlan.monthly_price_cop ? "Crear cuenta y pagar mensualidad" : "Solicitar cotizacion";
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

  submitButton.disabled = true;
  requestMessage.textContent = mode === "prepaid" ? "Creando cuenta y checkout..." : "Creando cuenta y checkout mensual...";
  try {
    const path = mode === "prepaid" ? "/api/public/signup/prepaid" : "/api/public/signup/portal";
    const body = mode === "prepaid"
      ? { ...payload, package_code: selectedPackage.code }
      : { ...payload, plan_code: selectedPlan.code };
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
      : `Cuenta creada para ${data.plan?.name || "el plan mensual"}. Te llevamos a Mercado Pago; el portal se activa al aprobarse el pago.`;
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
    prepaidPlan = planData.prepaid_plan || null;
    plans = planData.plans || [];
    selectedPackage = packages.find((item) => item.code === initialPackageCode) || packages[0] || null;
    selectedPlan = plans.find((item) => item.code === initialPlanCode) || plans[0] || null;
    renderPackages();
    renderPlans();
    renderPlanComparison();
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
signupForm.addEventListener("submit", submitSignup);
themeSwitch?.addEventListener("change", togglePackagesTheme);
applyPackagesTheme(readPreferredTheme());
init();
