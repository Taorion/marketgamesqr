const planGrid = document.getElementById("planGrid");
const signupForm = document.getElementById("signupForm");
const signupSection = document.getElementById("signupSection");
const signupPlanSummary = document.getElementById("signupPlanSummary");
const requestMessage = document.getElementById("requestMessage");
const submitButton = document.getElementById("submitButton");
const formEyebrow = document.getElementById("formEyebrow");
const formTitle = document.getElementById("formTitle");
const formCopy = document.getElementById("formCopy");
const salesAdvisorSelf = document.getElementById("salesAdvisorSelf");
const salesAdvisorSeller = document.getElementById("salesAdvisorSeller");
const salesAdvisorCombobox = document.getElementById("salesAdvisorCombobox");
const salesAdvisorSearch = document.getElementById("salesAdvisorSearch");
const salesAdvisorResults = document.getElementById("salesAdvisorResults");
const salesAdvisorStatus = document.getElementById("salesAdvisorStatus");

let selectedSalesAdvisor = null;
let salesAdvisorMatches = [];
let salesAdvisorActiveIndex = -1;
let salesAdvisorTimer = 0;
let salesAdvisorRequest = 0;

const urlParams = new URLSearchParams(window.location.search);
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();

const DESPEGA_PLAN = {
  code: "DESPEGA",
  name: "Despega",
  monthly_price_cop: 75000,
  mode: "Suscripción",
  access_summary: "Entrada para activar experiencias, validar QR y administrar tu cuenta con 25 tickets iniciales.",
  snapshot: ["25 tickets iniciales", "Validador QR", "Activaciones interactivas"],
  included: [
    "25 tickets de bienvenida",
    "Cuenta y perfil del negocio",
    "Seguridad y gestión del plan",
    "Atracción con activaciones interactivas",
    "Validador QR",
  ],
};

const FALLBACK_PLANS = [
  {
    code: "STARTER",
    name: "Crece",
    monthly_price_cop: 229000,
    mode: "Suscripción",
    access_summary: "Operación comercial con Revenue, Máquina GOS, productos, contactos y vitrina.",
    snapshot: ["50 tickets iniciales", "100 contactos", "20 productos"],
    included: [
      "50 tickets de bienvenida",
      "Todo lo incluido en Despega",
      "Centro de Revenue y Máquina GOS operativa",
      "Hasta 100 redenciones y 100 contactos",
      "1 GB para branding y activos digitales",
      "Hasta 20 productos y 2 medios de adquisición",
      "Reciclaje, ventas atribuidas y una vitrina web",
      "10 tarjetas regalo al mes y hasta 10 afiliados",
    ],
  },
  {
    code: "GROWTH",
    name: "Escala",
    monthly_price_cop: 999000,
    mode: "Suscripción",
    recommended: true,
    access_summary: "Inteligencia comercial, campañas, comunicaciones, agenda y control de calidad.",
    snapshot: ["100 tickets iniciales", "3 campañas", "3.000 emails/mes"],
    included: [
      "100 tickets de bienvenida",
      "Todo lo incluido en Crece con mayor capacidad",
      "Hasta 1.000 redenciones y 1.000 contactos",
      "5 GB, 50 productos, 5 medios y 5 vitrinas",
      "Inteligencia GOS y controles de calidad 1 y 2",
      "3 campañas y 3.000 emails al mes, máximo 100 diarios",
      "Agenda, 25 tarjetas regalo al mes y equipo de 2 usuarios",
      "Hasta 50 afiliados",
    ],
  },
  {
    code: "PRO",
    name: "Expande",
    monthly_price_cop: 1999000,
    mode: "Suscripción",
    access_summary: "Operación completa con Radar, Ranking, afiliados, sedes, vendedores y valorización.",
    snapshot: ["200 tickets iniciales", "15 campañas", "50.000 emails/mes"],
    included: [
      "200 tickets de bienvenida",
      "Todo lo incluido en Escala con mayor capacidad",
      "Hasta 5.000 redenciones y 5.000 contactos",
      "15 GB, 300 productos, 10 medios y 15 vitrinas",
      "15 campañas y 50.000 emails al mes sin límite diario",
      "250 tarjetas regalo al mes y equipo de 5 usuarios",
      "Radar, Ranking, valorización y 100 afiliados",
      "Hasta 10 vendedores y 3 sedes",
    ],
  },
];

const CTA_LABELS = {
  DESPEGA: "Activar Despega",
  STARTER: "Activar Crece",
  GROWTH: "Activar Escala",
  PRO: "Activar Expande",
};

let plans = [DESPEGA_PLAN, ...FALLBACK_PLANS];
let selectedPlan = null;

function copMoney(value) {
  return `$${Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP`;
}

function monthlyPlanLabel(plan) {
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotización");
  return `${copMoney(plan.monthly_price_cop)} / mes`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "No se pudo cargar la información.");
  }
  return data;
}

function qoriPlanFromApi(apiPlan) {
  const fallback = [DESPEGA_PLAN, ...FALLBACK_PLANS].find((item) => item.code === apiPlan.code);
  if (!fallback) return null;
  return {
    ...fallback,
    name: apiPlan.name || fallback.name,
    access_summary: apiPlan.access_summary || fallback.access_summary,
    included: Array.isArray(apiPlan.included) && apiPlan.included.length ? apiPlan.included : fallback.included,
    limits: apiPlan.limits || fallback.limits,
    monthly_price_cop: Number(apiPlan.monthly_price_cop || fallback.monthly_price_cop),
    recommended: Boolean(apiPlan.recommended || fallback.recommended),
  };
}

function publicPlansFromApi(data) {
  const apiPlans = Array.isArray(data?.plans) ? data.plans : [];
  const mapped = [DESPEGA_PLAN, ...FALLBACK_PLANS].map((fallback) => {
    const apiPlan = apiPlans.find((plan) => plan.code === fallback.code);
    return apiPlan ? qoriPlanFromApi(apiPlan) : fallback;
  }).filter(Boolean);
  return mapped;
}

function renderPlans() {
  if (!planGrid) return;
  planGrid.innerHTML = plans.map((plan) => {
    const benefits = plan.included || [];
    const primaryBenefits = benefits.slice(0, 5);
    const extraBenefits = benefits.slice(5);
    return `
      <article class="plan-card ${selectedPlan?.code === plan.code ? "selected" : ""} ${plan.recommended ? "featured-plan" : ""} ${plan.notSubscription ? "entry-plan" : ""}">
        <div class="plan-card-head">
          <span>${escapeHtml(plan.mode || "Suscripción")}</span>
          ${plan.recommended ? '<em>Recomendado</em>' : ""}
        </div>
        <div class="plan-title-row">
          <h3>${escapeHtml(plan.name)}</h3>
          <div class="plan-price-row">
            <strong>${monthlyPlanLabel(plan)}</strong>
            <span>${plan.notSubscription ? "Entrada básica" : "Suscripción mensual"}</span>
          </div>
        </div>
        <p class="plan-summary">${escapeHtml(plan.access_summary || "")}</p>
        <div class="plan-snapshot" aria-label="Resumen de capacidad">
          ${(plan.snapshot || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="plan-includes-label">Capacidad principal</div>
        <ul class="plan-access-list">
          ${primaryBenefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}
        </ul>
        ${extraBenefits.length ? `
          <details class="plan-details">
            <summary>${extraBenefits.length} capacidades adicionales</summary>
            <ul class="plan-access-list">
              ${extraBenefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}
            </ul>
          </details>
        ` : ""}
        <button type="button" data-plan-code="${escapeHtml(plan.code)}">${escapeHtml(CTA_LABELS[plan.code] || "Elegir plan")}</button>
      </article>
    `;
  }).join("");

  planGrid.querySelectorAll("[data-plan-code]").forEach((button) => {
    button.addEventListener("click", () => selectPlan(button.dataset.planCode));
  });
}

function renderSelection() {
  if (!selectedPlan) return;
  const title = `${selectedPlan.name} - ${monthlyPlanLabel(selectedPlan)}`;
  const copy = selectedPlan.notSubscription
    ? "Despega es una entrada básica. Escríbenos para activarla sin flujo de suscripción automática."
    : `Vas a activar ${selectedPlan.name}. Recibirás ${Number(selectedPlan.limits?.welcome_courtesy_tickets || selectedPlan.snapshot?.[0]?.match(/\d+/)?.[0] || 0)} tickets iniciales y podrás recargar más según tu volumen.`;
  if (signupPlanSummary) {
    signupPlanSummary.innerHTML = `
      <span>Plan seleccionado</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(copy)}</p>
    `;
  }
  if (formEyebrow) formEyebrow.textContent = selectedPlan.notSubscription ? "Entrada Despega" : `Suscripción ${selectedPlan.name}`;
  if (formTitle) formTitle.textContent = selectedPlan.notSubscription ? "Solicitar Despega" : `Activar ${selectedPlan.name}`;
  if (formCopy) {
    formCopy.textContent = selectedPlan.notSubscription
      ? "Completa los datos y nuestro equipo te ayuda con la activación de entrada."
      : "Completa los datos para crear la cuenta y continuar con Mercado Pago.";
  }
  if (submitButton) {
    submitButton.textContent = selectedPlan.notSubscription ? "Solicitar activación" : (CTA_LABELS[selectedPlan.code] || "Activar suscripción");
  }
}

function selectPlan(code) {
  selectedPlan = plans.find((plan) => plan.code === code) || null;
  renderPlans();
  if (signupSection) {
    signupSection.classList.remove("hidden");
    signupSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  renderSelection();
  setMessage("", "");
}

function setMessage(text, type = "info") {
  if (!requestMessage) return;
  requestMessage.textContent = text;
  requestMessage.className = `message full ${type || ""}`.trim();
}

function signupPayload() {
  return {
    company_name: document.getElementById("companyName")?.value.trim() || null,
    contact_name: document.getElementById("contactName")?.value.trim(),
    nit: document.getElementById("nit")?.value.trim(),
    phone: document.getElementById("phone")?.value.trim(),
    email: document.getElementById("email")?.value.trim(),
    password: document.getElementById("password")?.value,
    password_confirm: document.getElementById("passwordConfirm")?.value,
    website: document.getElementById("website")?.value.trim() || null,
    city: document.getElementById("city")?.value.trim() || null,
    address: document.getElementById("address")?.value.trim() || null,
    terms_accepted: Boolean(document.getElementById("termsAccepted")?.checked),
    privacy_accepted: Boolean(document.getElementById("privacyAccepted")?.checked),
    legal_version: "2026-07-23",
    sales_advisor_code: salesAdvisorSeller?.checked ? selectedSalesAdvisor?.code || null : null,
  };
}

function syncSalesAdvisorChoice() {
  const sellerSelected = Boolean(salesAdvisorSeller?.checked);
  salesAdvisorCombobox?.classList.toggle("hidden", !sellerSelected);
  salesAdvisorSearch?.setAttribute("aria-expanded", "false");
  if (!sellerSelected) {
    selectedSalesAdvisor = null;
    if (salesAdvisorSearch) salesAdvisorSearch.value = "";
    salesAdvisorResults?.classList.add("hidden");
    if (salesAdvisorStatus) salesAdvisorStatus.textContent = "La inscripción quedará registrada como llegada por cuenta propia.";
  } else {
    if (salesAdvisorStatus) salesAdvisorStatus.textContent = "Escribe al menos 2 caracteres.";
    window.setTimeout(() => salesAdvisorSearch?.focus(), 0);
  }
}

function renderSalesAdvisorMatches(message = "") {
  if (!salesAdvisorResults) return;
  salesAdvisorResults.innerHTML = salesAdvisorMatches.map((advisor, index) => `
    <button id="sales-advisor-option-${index}" type="button" role="option" aria-selected="${index === salesAdvisorActiveIndex ? "true" : "false"}" data-sales-advisor-code="${escapeHtml(advisor.code)}">
      <span class="material-symbols-outlined" aria-hidden="true">badge</span>
      <span><strong>${escapeHtml(advisor.name)}</strong><small>${escapeHtml(advisor.code)}</small></span>
    </button>
  `).join("");
  salesAdvisorResults.classList.toggle("hidden", !salesAdvisorMatches.length);
  salesAdvisorSearch?.setAttribute("aria-expanded", String(Boolean(salesAdvisorMatches.length)));
  if (salesAdvisorActiveIndex >= 0) salesAdvisorSearch?.setAttribute("aria-activedescendant", `sales-advisor-option-${salesAdvisorActiveIndex}`);
  else salesAdvisorSearch?.removeAttribute("aria-activedescendant");
  if (salesAdvisorStatus) salesAdvisorStatus.textContent = message || (salesAdvisorMatches.length ? `${salesAdvisorMatches.length} coincidencia${salesAdvisorMatches.length === 1 ? "" : "s"}.` : "No encontramos un asesor activo con ese nombre o código.");
}

async function searchSalesAdvisors() {
  const term = String(salesAdvisorSearch?.value || "").trim();
  selectedSalesAdvisor = null;
  salesAdvisorMatches = [];
  salesAdvisorActiveIndex = -1;
  if (term.length < 2) {
    renderSalesAdvisorMatches("Escribe al menos 2 caracteres.");
    return;
  }
  const request = ++salesAdvisorRequest;
  if (salesAdvisorStatus) salesAdvisorStatus.textContent = "Buscando asesores…";
  try {
    const data = await fetchJson(`/api/public/sales-advisors?q=${encodeURIComponent(term)}`);
    if (request !== salesAdvisorRequest) return;
    salesAdvisorMatches = Array.isArray(data.advisors) ? data.advisors : [];
    renderSalesAdvisorMatches();
  } catch (error) {
    if (request !== salesAdvisorRequest) return;
    renderSalesAdvisorMatches(error.message || "No fue posible buscar asesores. Puedes elegir Llegué por mi cuenta.");
  }
}

function chooseSalesAdvisor(code) {
  const advisor = salesAdvisorMatches.find((item) => item.code === code);
  if (!advisor) return;
  selectedSalesAdvisor = advisor;
  if (salesAdvisorSearch) salesAdvisorSearch.value = `${advisor.name} · ${advisor.code}`;
  salesAdvisorMatches = [];
  salesAdvisorActiveIndex = -1;
  renderSalesAdvisorMatches(`Asesor seleccionado: ${advisor.name} · ${advisor.code}.`);
}

function scheduleSalesAdvisorSearch() {
  window.clearTimeout(salesAdvisorTimer);
  selectedSalesAdvisor = null;
  salesAdvisorTimer = window.setTimeout(searchSalesAdvisors, 280);
}

async function submitSignup(event) {
  event.preventDefault();
  if (!selectedPlan?.code) {
    setMessage("Selecciona un plan antes de continuar.", "error");
    document.getElementById("planes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const payload = signupPayload();
  if (salesAdvisorSeller?.checked && !payload.sales_advisor_code) {
    setMessage("Selecciona una coincidencia válida de asesor o elige Llegué por mi cuenta.", "error");
    salesAdvisorSearch?.focus();
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = "Preparando pago...";
  setMessage("Registrando cuenta y preparando pago seguro con tarjeta, saldo Mercado Pago o PSE.", "info");
  try {
    const data = await fetchJson("/api/public/signup/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        plan_code: selectedPlan.code,
        billing_cycle: "monthly",
      }),
    });
    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("El plan fue registrado, pero no se recibió enlace de Mercado Pago.");
    }
    setMessage("Plan registrado. Elige tarjeta, saldo Mercado Pago o PSE para completar el pago.", "success");
    window.location.href = checkoutUrl;
  } catch (error) {
    setMessage(error.message || "No se pudo completar la suscripción.", "error");
    submitButton.disabled = false;
    submitButton.textContent = selectedPlan ? (CTA_LABELS[selectedPlan.code] || "Activar suscripción") : "Activar suscripción";
  }
}

async function loadPlans() {
  try {
    const data = await fetchJson("/api/public/subscription-plans");
    plans = publicPlansFromApi(data);
  } catch {
    plans = [DESPEGA_PLAN, ...FALLBACK_PLANS];
  }
  renderPlans();
  if (initialPlanCode) {
    const match = plans.find((plan) => plan.code === initialPlanCode);
    if (match) selectedPlan = match;
  }
  if (selectedPlan) renderSelection();
}

document.addEventListener("DOMContentLoaded", () => {
  signupForm?.addEventListener("submit", submitSignup);
  salesAdvisorSelf?.addEventListener("change", syncSalesAdvisorChoice);
  salesAdvisorSeller?.addEventListener("change", syncSalesAdvisorChoice);
  salesAdvisorSearch?.addEventListener("input", scheduleSalesAdvisorSearch);
  salesAdvisorResults?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-sales-advisor-code]");
    if (option) chooseSalesAdvisor(option.dataset.salesAdvisorCode);
  });
  salesAdvisorSearch?.addEventListener("keydown", (event) => {
    if (!salesAdvisorMatches.length) return;
    if (event.key === "ArrowDown") salesAdvisorActiveIndex = (salesAdvisorActiveIndex + 1) % salesAdvisorMatches.length;
    else if (event.key === "ArrowUp") salesAdvisorActiveIndex = (salesAdvisorActiveIndex - 1 + salesAdvisorMatches.length) % salesAdvisorMatches.length;
    else if (event.key === "Enter" && salesAdvisorActiveIndex >= 0) { event.preventDefault(); chooseSalesAdvisor(salesAdvisorMatches[salesAdvisorActiveIndex].code); return; }
    else if (event.key === "Escape") { salesAdvisorMatches = []; salesAdvisorActiveIndex = -1; renderSalesAdvisorMatches("Búsqueda cerrada."); return; }
    else return;
    event.preventDefault();
    renderSalesAdvisorMatches();
    salesAdvisorResults?.querySelectorAll('[role="option"]')[salesAdvisorActiveIndex]?.scrollIntoView({ block: "nearest" });
  });
  syncSalesAdvisorChoice();
  loadPlans();
});
