const planGrid = document.getElementById("planGrid");
const signupForm = document.getElementById("signupForm");
const signupSection = document.getElementById("signupSection");
const signupPlanSummary = document.getElementById("signupPlanSummary");
const requestMessage = document.getElementById("requestMessage");
const submitButton = document.getElementById("submitButton");
const formEyebrow = document.getElementById("formEyebrow");
const formTitle = document.getElementById("formTitle");
const formCopy = document.getElementById("formCopy");

const urlParams = new URLSearchParams(window.location.search);
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();

const DESPEGA_PLAN = {
  code: "DESPEGA",
  name: "Despega",
  monthly_price_cop: 75000,
  mode: "Entrada básica",
  access_summary: "Entrada sencilla para validar tickets y operar una primera capa de interacción con clientes.",
  snapshot: ["1 sede", "1 usuario", "Validador incluido"],
  included: [
    "Acceso al portal / tickets",
    "Exportación de base que interactuó con QR",
    "Validador",
    "Gaming Center sin historial",
    "Leadboard",
  ],
  notSubscription: true,
};

const FALLBACK_PLANS = [
  {
    code: "STARTER",
    name: "Crece",
    monthly_price_cop: 229000,
    mode: "Suscripción",
    access_summary: "Operación inicial con gráficas, leads recientes, campañas y máquina.",
    snapshot: ["50 leads", "1 campaña", "2 exportaciones"],
    included: [
      "Acceso al portal / tickets",
      "Gráficas de redención",
      "Últimos 50 leads",
      "2 exportaciones mensuales",
      "Validador",
      "1 campaña activa en línea",
      "1 sede / 1 usuario",
      "Máquina incluida",
      "Leadboard",
    ],
  },
  {
    code: "GROWTH",
    name: "Escala",
    monthly_price_cop: 899000,
    mode: "Suscripción",
    recommended: true,
    access_summary: "Gestión avanzada con dashboard completo, fidelización, contactos, sales y agenda.",
    snapshot: ["100 leads", "3 campañas", "10 exportaciones"],
    included: [
      "Acceso al portal / tickets",
      "Gráficas de redención",
      "Últimos 100 leads",
      "10 exportaciones mensuales",
      "2 sedes / 2 usuarios",
      "Gaming Center con historial",
      "Calculadora de campañas",
      "Dashboard completo",
      "Fidelización hasta 50",
      "Branding de ticket",
      "10 Gift Cards al mes",
      "Directorio de contactos",
      "Sales",
      "Agenda para tareas",
    ],
  },
  {
    code: "PRO",
    name: "Expande",
    monthly_price_cop: 1990000,
    mode: "Suscripción",
    access_summary: "Operación completa con analítica predictiva, afiliados, premios y soporte de marketing.",
    snapshot: ["Todos los leads", "Campañas ilimitadas", "Journey + premios"],
    included: [
      "Acceso al portal / tickets",
      "Gráficas de redención",
      "Todos los leads",
      "Exportaciones ilimitadas",
      "Sedes y usuarios ilimitados",
      "Campañas en línea ilimitadas",
      "Dashboard completo con insights",
      "Fidelización ilimitada",
      "Gift Card ilimitadas",
      "Inventario ilimitado",
      "Journey de clientes",
      "Contactos con tickets por redimir",
      "Afiliados con carnet digital",
      "Programa de premios",
      "Analítica predictiva",
      "Asistencia de marketing",
    ],
  },
];

const CTA_LABELS = {
  DESPEGA: "Solicitar Despega",
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
  const fallback = FALLBACK_PLANS.find((item) => item.code === apiPlan.code);
  if (!fallback) return null;
  return {
    ...fallback,
    monthly_price_cop: Number(apiPlan.monthly_price_cop || fallback.monthly_price_cop),
    annual_price_cop: apiPlan.annual_price_cop || null,
    recommended: Boolean(apiPlan.recommended || fallback.recommended),
  };
}

function publicPlansFromApi(data) {
  const apiPlans = Array.isArray(data?.plans) ? data.plans : [];
  const mapped = FALLBACK_PLANS.map((fallback) => {
    const apiPlan = apiPlans.find((plan) => plan.code === fallback.code);
    return apiPlan ? qoriPlanFromApi(apiPlan) : fallback;
  }).filter(Boolean);
  return [DESPEGA_PLAN, ...mapped];
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
    : `Vas a activar ${selectedPlan.name}. Los tickets se recargan aparte según tu volumen de operación.`;
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
  };
}

async function submitEntryRequest(payload) {
  const message = [
    `Hola, quiero activar Qori ${selectedPlan.name}.`,
    `Empresa: ${payload.company_name || "No registrada"}`,
    `Contacto: ${payload.contact_name}`,
    `Email: ${payload.email}`,
    `Teléfono: ${payload.phone}`,
  ].join("\n");
  window.location.href = `https://wa.me/573057724185?text=${encodeURIComponent(message)}`;
}

async function submitSignup(event) {
  event.preventDefault();
  if (!selectedPlan?.code) {
    setMessage("Selecciona un plan antes de continuar.", "error");
    document.getElementById("planes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const payload = signupPayload();
  if (selectedPlan.notSubscription) {
    await submitEntryRequest(payload);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Creando suscripción...";
  setMessage("Registrando cuenta y preparando autorización segura en Mercado Pago.", "info");
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
      throw new Error("La suscripción fue registrada, pero no se recibió enlace de Mercado Pago.");
    }
    setMessage("Suscripción creada. Redirigiendo a Mercado Pago...", "success");
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
  loadPlans();
});
