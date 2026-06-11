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

const urlParams = new URLSearchParams(window.location.search);
const initialMode = urlParams.get("mode");
let mode = initialMode === "portal" ? "portal" : "prepaid";
let packages = [];
let plans = [];
let prepaidPlan = null;
let selectedPackage = null;
let selectedPlan = null;

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
    <article class="package-card ${selectedPlan?.code === item.code ? "selected" : ""}">
      <span class="package-code">${escapeHtml(item.code)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.access_summary || "Portal mensual para operar beneficios QR.")}</p>
      <ul class="plan-access-list">
        ${(item.included || []).slice(0, 4).map((benefit) => `
          <li><span class="mark">OK</span><span>${escapeHtml(benefit)}</span></li>
        `).join("")}
      </ul>
      <div class="price">${item.monthly_price_cop ? money(item.monthly_price_cop) : escapeHtml(item.price_label || "Cotizacion")}</div>
      <button type="button" data-plan-code="${escapeHtml(item.code)}">Elegir y registrarme</button>
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
    const isFull = plan.code === "PRO";
    const price = plan.monthly_price_cop ? money(plan.monthly_price_cop) : escapeHtml(plan.price_label || "Compra por paquete");
    const qrIncluded = plan.limits?.monthly_qr_included ?? plan.qr_monthly_included;
    return `
      <article class="plan-access-card ${isFull ? "featured" : ""}">
        <span class="package-code">${escapeHtml(plan.code)}</span>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.best_for || plan.access_summary || "")}</p>
        <div class="price">${price}</div>
        <p>${qrIncluded ? `${Number(qrIncluded).toLocaleString("es-CO")} QR incluidos al mes` : "QR por paquete comprado"}</p>
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
    offerCopy.textContent = "El paquete mas basico ya te permite crear cuenta, pagar y empezar a validar beneficios.";
    formEyebrow.textContent = "Datos para activar prepago";
    formTitle.textContent = "Registro y pago minimo";
    formCopy.textContent = "Usa el NIT de la empresa o tu cedula si aun no tienes empresa constituida.";
    submitButton.textContent = "Crear cuenta y pagar activacion";
    selectPackage(selectedPackage?.code || packages[0]?.code, false);
    return;
  }

  offerEyebrow.textContent = "Planes mensuales";
  offerTitle.textContent = "Escoge el portal para operar campanas";
  offerCopy.textContent = "Registra tus datos, paga la mensualidad y entra al portal cuando Mercado Pago confirme.";
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
    <span>Portal mensual</span>
    <strong>${escapeHtml(selectedPlan.name)}</strong>
    <p>${selectedPlan.monthly_price_cop ? money(selectedPlan.monthly_price_cop) : escapeHtml(selectedPlan.price_label || "Cotizacion")} - ${Number(selectedPlan.limits?.monthly_qr_included || 0).toLocaleString("es-CO")} QR/mes. Crea usuario, paga y activa el portal.</p>
  `;
  renderPlans();
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
      : "Entra al portal y abre el validador QR con el email y password que registraste.";
    paymentStatusPrimaryLink.href = "/empresa/";
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
    selectedPackage = packages[0] || null;
    selectedPlan = plans[0] || null;
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
init();
