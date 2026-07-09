const planGrid = document.getElementById("planGrid");
const selectedBox = document.getElementById("selectedBox");
const signupForm = document.getElementById("signupForm");
const signupSection = document.getElementById("signupSection");
const signupPlanSummary = document.getElementById("signupPlanSummary");
const requestMessage = document.getElementById("requestMessage");
const submitButton = document.getElementById("submitButton");
const formEyebrow = document.getElementById("formEyebrow");
const formTitle = document.getElementById("formTitle");
const formCopy = document.getElementById("formCopy");
const paymentStatusSection = document.getElementById("paymentStatusSection");
const paymentStatusEyebrow = document.getElementById("paymentStatusEyebrow");
const paymentStatusTitle = document.getElementById("paymentStatusTitle");
const paymentStatusCopy = document.getElementById("paymentStatusCopy");
const paymentStatusActionTitle = document.getElementById("paymentStatusActionTitle");
const paymentStatusActionCopy = document.getElementById("paymentStatusActionCopy");
const paymentStatusPrimaryLink = document.getElementById("paymentStatusPrimaryLink");
const themeSwitch = document.getElementById("themeSwitch");
const themeSwitchLabel = document.getElementById("themeSwitchLabel");

const urlParams = new URLSearchParams(window.location.search);
const initialPlanCode = String(urlParams.get("plan") || "").toUpperCase();
const THEME_KEY = "marketgames_portal_theme";

const FALLBACK_PLANS = [
  {
    code: "STARTER",
    name: "Started",
    monthly_price_cop: 1000000,
    access_summary: "Plan de entrada para negocios que quieren empezar a capturar leads, crear campañas y validar beneficios desde un portal comercial gamificado.",
    included: [
      "Acceso al portal",
      "Graficas de redencion",
      "Visualizacion de ultimos 50 leads",
      "2 exportaciones mensuales",
      "Validador de tickets",
      "Creacion de campañas",
      "1 campaña activa en linea",
      "1 sede",
      "1 usuario",
      "Gaming center sin historial de tickets",
      "Agenda para programar tareas",
      "10 tickets de cortesia en primera suscripcion",
    ],
  },
  {
    code: "GROWTH",
    name: "Medium",
    recommended: true,
    monthly_price_cop: 2500000,
    access_summary: "Plan para negocios que quieren operar varias campañas, organizar contactos, medir resultados y activar seguimiento comercial con mas estructura.",
    included: [
      "Acceso al portal",
      "Graficas de redencion",
      "Visualizacion de ultimos 100 leads",
      "10 exportaciones mensuales",
      "Validador de tickets",
      "Creacion de campañas",
      "3 campañas activas en linea",
      "2 sedes",
      "2 usuarios",
      "Gaming center con historial de tickets",
      "Calculadora de campañas",
      "Dashboard completo",
      "Programa de fidelizacion hasta 50 contactos",
      "Branding en ticket",
      "Gift cards: 10 unidades al mes",
      "Directorio de contactos",
      "Inventario de obsequios hasta 4 productos",
      "Sales tracker",
      "Asistencia de marketing al lanzamiento de MarketGamesQR",
      "Agenda para programar tareas",
      "10 tickets de cortesia en primera suscripcion",
    ],
  },
  {
    code: "PRO",
    name: "Premium",
    monthly_price_cop: 4500000,
    access_summary: "Plan para marcas que quieren usar MarketGamesQR como sistema comercial completo con campañas, activaciones, agenda, contactos, fidelizacion, referidos y analitica avanzada.",
    included: [
      "Acceso al portal",
      "Graficas de redencion",
      "Visualizacion ampliada de leads",
      "Exportaciones ilimitadas",
      "Validador de tickets",
      "Creacion de campañas en linea ilimitadas",
      "4 sedes",
      "4 usuarios",
      "Gaming center con historial de tickets",
      "Acceso a todas las activaciones disponibles",
      "Calculadora de campañas",
      "Dashboard completo con insights",
      "Programa de fidelizacion ilimitado",
      "Branding en ticket",
      "Gift cards ilimitadas",
      "Directorio de contactos",
      "Inventario de obsequios con productos ilimitados",
      "Sales tracker",
      "Asistencia de marketing al lanzamiento de MarketGamesQR 2 veces al mes",
      "Agenda para programar tareas",
      "Journey de clientes",
      "Contactos con tickets pendientes por redimir",
      "Afiliados con carnet digital",
      "Programa de premios",
      "Analitica de prediccion de redencion de campañas",
      "10 tickets de cortesia en primera suscripcion",
    ],
  },
];

const CTA_LABELS = {
  STARTER: "Suscribirme a Started",
  GROWTH: "Elegir Medium",
  PRO: "Activar Premium",
};

let plans = [];
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
    // Theme persistence is optional.
  }
}

function togglePackagesTheme() {
  applyPackagesTheme(themeSwitch?.checked ? "light" : "dark");
}

function copMoney(value) {
  return `$${Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP`;
}

function monthlyPlanLabel(plan) {
  if (!plan?.monthly_price_cop) return escapeHtml(plan?.price_label || "Cotizacion");
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
    throw new Error(data.error?.message || "No se pudo cargar la informacion.");
  }
  return data;
}

function normalizedPlan(plan) {
  const fallback = FALLBACK_PLANS.find((item) => item.code === plan.code) || {};
  return {
    ...fallback,
    ...plan,
    included: Array.isArray(plan.included) && plan.included.length ? plan.included : fallback.included,
    access_summary: plan.access_summary || fallback.access_summary,
    recommended: Boolean(plan.recommended || fallback.recommended || plan.code === "GROWTH"),
  };
}

function publicPlansFromApi(data) {
  const allowed = ["STARTER", "GROWTH", "PRO"];
  const apiPlans = Array.isArray(data?.plans) ? data.plans : [];
  const mapped = allowed
    .map((code) => apiPlans.find((plan) => plan.code === code) || FALLBACK_PLANS.find((plan) => plan.code === code))
    .filter(Boolean)
    .map(normalizedPlan);
  return mapped.length === 3 ? mapped : FALLBACK_PLANS;
}

function renderPlans() {
  planGrid.innerHTML = plans.map((plan) => {
    const benefits = (plan.included || []).slice(0, 11);
    return `
      <article class="package-card subscription-plan-card ${selectedPlan?.code === plan.code ? "selected" : ""} ${plan.recommended ? "featured-plan" : ""}">
        <div class="plan-card-head">
          <span class="package-code">${escapeHtml(plan.name)}</span>
          ${plan.recommended ? '<span class="recommended-badge">Mas recomendado</span>' : ""}
        </div>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.access_summary || "")}</p>
        <div class="price">${monthlyPlanLabel(plan)}</div>
        <ul class="plan-access-list">
          ${benefits.map((benefit) => `
            <li><span class="mark">OK</span><span>${escapeHtml(benefit)}</span></li>
          `).join("")}
        </ul>
        <p class="ticket-balance-note">Incluye 10 tickets de cortesia solo en la primera suscripcion. Los tickets adicionales se compran dentro del portal.</p>
        <button type="button" data-plan-code="${escapeHtml(plan.code)}">${escapeHtml(CTA_LABELS[plan.code] || "Elegir plan")}</button>
      </article>
    `;
  }).join("");

  planGrid.querySelectorAll("[data-plan-code]").forEach((button) => {
    button.addEventListener("click", () => selectPlan(button.dataset.planCode));
  });
}

function renderSelection() {
  const title = selectedPlan ? `${selectedPlan.name} - ${monthlyPlanLabel(selectedPlan)}` : "Suscripcion primero";
  const copy = selectedPlan
    ? `Vas a activar el plan ${selectedPlan.name}. Al confirmar tu primera suscripcion recibes 10 tickets de cortesia.`
    : "Los tickets adicionales se compran unicamente dentro del portal, una vez el usuario haya iniciado sesion y tenga una suscripcion activa.";
  [selectedBox, signupPlanSummary].forEach((box) => {
    if (!box) return;
    box.innerHTML = `
      <span>${selectedPlan ? "Plan seleccionado" : "Logica comercial"}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(copy)}</p>
    `;
  });
  if (formEyebrow) formEyebrow.textContent = selectedPlan ? `Suscripcion ${selectedPlan.name}` : "Activacion del plan";
  if (formTitle) formTitle.textContent = selectedPlan ? `Activar ${selectedPlan.name}` : "Registro y suscripcion";
  if (formCopy) {
    formCopy.textContent = selectedPlan
      ? `Hola, quiero suscribirme al plan ${selectedPlan.name} de MarketGamesQR.`
      : "Selecciona Started, Medium o Premium para continuar.";
  }
  if (submitButton) {
    submitButton.textContent = selectedPlan ? (CTA_LABELS[selectedPlan.code] || "Activar suscripcion") : "Activar suscripcion";
  }
}

function selectPlan(code) {
  selectedPlan = plans.find((plan) => plan.code === code) || null;
  renderPlans();
  renderSelection();
  if (signupSection) {
    signupSection.classList.remove("hidden");
    signupSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
    legal_version: "2026-07-09",
  };
}

async function submitSignup(event) {
  event.preventDefault();
  if (!selectedPlan?.code) {
    setMessage("Selecciona un plan antes de registrar la suscripcion.", "error");
    document.getElementById("planes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Creando suscripcion...";
  setMessage("Registrando cuenta y preparando autorizacion segura en Mercado Pago.", "info");
  try {
    const payload = {
      ...signupPayload(),
      plan_code: selectedPlan.code,
      billing_cycle: "monthly",
    };
    const data = await fetchJson("/api/public/signup/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("La suscripcion fue registrada, pero no se recibio enlace de Mercado Pago.");
    }
    setMessage("Suscripcion creada. Redirigiendo a Mercado Pago...", "success");
    window.location.href = checkoutUrl;
  } catch (error) {
    setMessage(error.message || "No se pudo completar la suscripcion.", "error");
    submitButton.disabled = false;
    submitButton.textContent = selectedPlan ? (CTA_LABELS[selectedPlan.code] || "Activar suscripcion") : "Activar suscripcion";
  }
}

function renderPaymentStatus() {
  const status = urlParams.get("signup");
  if (!status || !paymentStatusSection) return;
  const content = {
    success: {
      eyebrow: "Pago aprobado",
      title: "Tu suscripcion fue aprobada",
      copy: "El portal se activa cuando Mercado Pago confirma el pago. Si ya esta aprobado, ingresa con el correo y clave registrados.",
      actionTitle: "Entra al portal",
      actionCopy: "Recibiras 10 tickets de cortesia si es tu primera suscripcion.",
    },
    card: {
      eyebrow: "Tarjeta autorizada",
      title: "Autorizacion recibida",
      copy: "Mercado Pago confirmo la autorizacion. El portal procesa la activacion y deja lista la cuenta.",
      actionTitle: "Ingresa al portal",
      actionCopy: "Gestiona campañas, leads, agenda y tickets desde tu cuenta.",
    },
    pending: {
      eyebrow: "Pago pendiente",
      title: "Mercado Pago esta validando",
      copy: "Cuando el pago quede aprobado, se activa el portal y se entrega la cortesia si aplica.",
      actionTitle: "Revisa luego",
      actionCopy: "Puedes volver al portal despues de la confirmacion.",
    },
    failure: {
      eyebrow: "Pago no completado",
      title: "No se pudo activar la suscripcion",
      copy: "Intenta nuevamente o contacta al equipo comercial con el plan que elegiste.",
      actionTitle: "Volver a elegir plan",
      actionCopy: "La cuenta no queda activa hasta confirmar la suscripcion.",
      link: "/paquetes/#planes",
    },
  }[status];
  if (!content) return;
  paymentStatusSection.classList.remove("hidden");
  paymentStatusEyebrow.textContent = content.eyebrow;
  paymentStatusTitle.textContent = content.title;
  paymentStatusCopy.textContent = content.copy;
  paymentStatusActionTitle.textContent = content.actionTitle;
  paymentStatusActionCopy.textContent = content.actionCopy;
  paymentStatusPrimaryLink.href = content.link || "/empresa/";
}

async function loadPlans() {
  try {
    const data = await fetchJson("/api/public/subscription-plans");
    plans = publicPlansFromApi(data);
  } catch {
    plans = FALLBACK_PLANS;
  }
  renderPlans();
  if (initialPlanCode) {
    const match = plans.find((plan) => plan.code === initialPlanCode);
    if (match) {
      selectedPlan = match;
      renderPlans();
    }
  }
  renderSelection();
}

document.addEventListener("DOMContentLoaded", () => {
  applyPackagesTheme(readPreferredTheme());
  themeSwitch?.addEventListener("change", togglePackagesTheme);
  signupForm?.addEventListener("submit", submitSignup);
  renderPaymentStatus();
  loadPlans();
});
