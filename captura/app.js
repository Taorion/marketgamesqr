const captureCard = document.getElementById("captureCard");
const token = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
let currentPayload = null;
const MARKET_GAMES_LOGO = "/img/MGLogo-01.png";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "No se pudo completar la solicitud.");
  }
  return data;
}

function fieldInput(field) {
  if (field.visible === false) return "";
  const type = field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "date" ? "date" : "text";
  return `
    <label>
      <span>${escapeHtml(field.label || field.name)}${field.required ? " *" : ""}</span>
      <input name="${escapeHtml(field.name)}" type="${type}" ${field.required ? "required" : ""} maxlength="180">
    </label>
  `;
}

function logoSource(business = {}) {
  return business.logo_data_url || business.logo_url || MARKET_GAMES_LOGO;
}

function logoAlt(business = {}) {
  return `Logo de ${business.name || "MarketGamesQR"}`;
}

function assetLabel(asset = {}) {
  const category = asset.category ? String(asset.category).replace(/[_-]/g, " ") : "material digital";
  const fileType = asset.file_type ? String(asset.file_type).split("/").pop().toUpperCase() : "";
  return [category, fileType].filter(Boolean).join(" - ");
}

function render(payload) {
  currentPayload = payload;
  const { business, activation } = payload;
  const asset = activation.asset || {};
  const formConfig = activation.form_config || {};
  const publicMessage = activation.public_message || {};
  const businessName = business.name || "MarketGamesQR";
  document.title = `${asset.title || publicMessage.title || activation.name || "Material digital"} | ${businessName}`;
  captureCard.innerHTML = `
    <div class="brand-row">
      <img src="${escapeHtml(logoSource(business))}" alt="${escapeHtml(logoAlt(business))}" onerror="this.onerror=null;this.src='${MARKET_GAMES_LOGO}';">
      <div>
        <strong>${escapeHtml(businessName)}</strong>
        <span>Material exclusivo para visitantes</span>
      </div>
    </div>
    ${asset.cover_image_data_url ? `<img class="asset-cover" src="${escapeHtml(asset.cover_image_data_url)}" alt="${escapeHtml(asset.title || "")}">` : ""}
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(assetLabel(asset) || "Contenido digital")}</p>
      <h1>${escapeHtml(publicMessage.title || activation.name || asset.title || "Recibe tu material digital")}</h1>
      <p>${escapeHtml(publicMessage.subtitle || `${businessName} preparo este material para ti. Completa tus datos y accede al contenido de inmediato.`)}</p>
    </div>
    <section class="asset-summary">
      <h2>${escapeHtml(asset.title || "Contenido descargable")}</h2>
      <p class="asset-meta">${escapeHtml(asset.description || activation.description || "Completa el formulario para recibir el recurso solicitado.")}</p>
    </section>
    <form class="capture-form" id="captureForm">
      ${(formConfig.fields || []).map(fieldInput).join("")}
      ${formConfig.consent_required !== false ? `
        <label class="consent-row">
          <input name="consent_accepted" type="checkbox" required>
          <span>${escapeHtml(formConfig.consent_text || `Autorizo a ${businessName} a tratar mis datos para entregar este material y contactarme sobre esta solicitud.`)}</span>
        </label>
      ` : ""}
      ${formConfig.privacy_url ? `<a class="field-help" href="${escapeHtml(formConfig.privacy_url)}" target="_blank" rel="noreferrer">Ver politica de datos</a>` : ""}
      <button class="primary-button" type="submit">${escapeHtml(asset.download_button_text || "Acceder al contenido")}</button>
      <p class="secure-note">Tus datos se envian directamente al equipo de ${escapeHtml(businessName)}.</p>
      <p class="message" id="captureMessage" role="status" aria-live="polite"></p>
    </form>
  `;
  document.getElementById("captureForm")?.addEventListener("submit", submitCapture);
}

async function submitCapture(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("captureMessage");
  const submitButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const payload = { form_data: {}, consent_accepted: formData.get("consent_accepted") === "on" };
  for (const [key, value] of formData.entries()) {
    if (key !== "consent_accepted") payload.form_data[key] = String(value || "").trim();
  }
  try {
    if (submitButton) submitButton.disabled = true;
    message.textContent = "Preparando tu acceso...";
    const result = await api(`/api/public/lead-captures/${encodeURIComponent(token)}/submissions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const success = currentPayload?.activation?.public_message?.success_message || result.success_message || "Listo. Ya puedes descargar tu material.";
    form.outerHTML = `
      <section class="success-panel">
        <h2>Listo</h2>
        <p>${escapeHtml(success)}</p>
        <a class="download-button" href="${escapeHtml(result.download_url)}">Descargar ahora</a>
      </section>
    `;
  } catch (error) {
    message.textContent = error.message;
    if (submitButton) submitButton.disabled = false;
  }
}

async function boot() {
  if (!token) {
    captureCard.innerHTML = '<div class="capture-error">El enlace no es valido.</div>';
    return;
  }
  try {
    render(await api(`/api/public/lead-captures/${encodeURIComponent(token)}`));
  } catch (error) {
    captureCard.innerHTML = `<div class="capture-error">${escapeHtml(error.message || "Este recurso ya no esta disponible.")}</div>`;
  }
}

boot();
