const captureCard = document.getElementById("captureCard");
const token = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
let currentPayload = null;
const SALES_MACHINE_LOGO = "/img/qori-favicon.png";
const trackingParams = new URLSearchParams(window.location.search);
const acquisitionTrackingToken = trackingParams.get("qori_ref") || null;
const acquisitionTrackingSource = trackingParams.get("qori_source") || null;

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
  return business.logo_data_url || business.logo_url || SALES_MACHINE_LOGO;
}

function logoAlt(business = {}) {
  return `Logo de ${business.name || "Qori"}`;
}

function assetLabel(asset = {}) {
  const category = asset.category ? String(asset.category).replace(/[_-]/g, " ") : "material digital";
  const fileType = asset.file_type ? String(asset.file_type).split("/").pop().toUpperCase() : "";
  return [category, fileType].filter(Boolean).join(" - ");
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function sameText(a, b) {
  return normalizeText(a) && normalizeText(a) === normalizeText(b);
}

function isPrefixText(shortText, longText) {
  const shortValue = normalizeText(shortText);
  const longValue = normalizeText(longText);
  return Boolean(shortValue && longValue && longValue.startsWith(shortValue) && shortValue.length < longValue.length);
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}

function renderResourceDetails(asset = {}, activation = {}, publicMessage = {}, businessName = "Qori") {
  const title = publicMessage.title || activation.name || asset.title || "Recibe tu material digital";
  const subtitle = publicMessage.subtitle || "";
  const assetDescription = asset.description || activation.description || "";
  const generatedDescription = assetDescription && !sameText(assetDescription, title)
    ? assetDescription
    : `${businessName} preparo este recurso para que puedas revisarlo de inmediato.`;
  const fileInfo = [assetLabel(asset), formatFileSize(asset.file_size)].filter(Boolean).join(" - ");
  const description = publicMessage.details_description || generatedDescription;
  const badges = Array.isArray(publicMessage.detail_badges) && publicMessage.detail_badges.length
    ? publicMessage.detail_badges
    : [fileInfo || "Material digital", "Acceso inmediato", "Enlace seguro"];
  return `
    <section class="resource-panel">
      <div>
        <p class="section-kicker">${escapeHtml(publicMessage.details_title || "Que recibes")}</p>
        <p class="resource-description">${escapeHtml(sameText(description, subtitle) ? "Un recurso listo para descargar apenas completes el formulario." : description)}</p>
      </div>
      <div class="trust-strip" aria-label="Detalles del recurso">
        ${badges.filter(Boolean).slice(0, 3).map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}
      </div>
    </section>
  `;
}

function render(payload) {
  currentPayload = payload;
  const { business, activation } = payload;
  const asset = activation.asset || {};
  const formConfig = activation.form_config || {};
  const publicMessage = activation.public_message || {};
  const businessName = business.name || "Qori";
  const pageTitle = publicMessage.title || asset.title || activation.name || "Recibe tu material digital";
  const rawSubtitle = publicMessage.subtitle || "";
  const rawAssetDescription = asset.description || activation.description || "";
  const heroSubtitle = isPrefixText(rawSubtitle, rawAssetDescription)
    ? rawAssetDescription
    : (rawSubtitle || rawAssetDescription || `${businessName} preparo este material para ti. Completa tus datos y accede al contenido de inmediato.`);
  document.title = `${pageTitle} | ${businessName}`;
  captureCard.innerHTML = `
    <div class="brand-row">
      <img src="${escapeHtml(logoSource(business))}" alt="${escapeHtml(logoAlt(business))}" onerror="this.onerror=null;this.src='${SALES_MACHINE_LOGO}';">
      <div>
        <strong>${escapeHtml(businessName)}</strong>
        <span>Material exclusivo para visitantes</span>
      </div>
    </div>
    ${asset.cover_image_data_url ? `<img class="asset-cover" src="${escapeHtml(asset.cover_image_data_url)}" alt="${escapeHtml(asset.title || "")}">` : ""}
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(assetLabel(asset) || "Contenido digital")}</p>
      <h1>${escapeHtml(pageTitle)}</h1>
      <p>${escapeHtml(heroSubtitle)}</p>
    </div>
    ${renderResourceDetails(asset, activation, publicMessage, businessName)}
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
  const payload = { form_data: {}, consent_accepted: formData.get("consent_accepted") === "on", acquisition_tracking_token: acquisitionTrackingToken, acquisition_tracking_source: acquisitionTrackingSource };
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
    render(await api(`/api/public/lead-captures/${encodeURIComponent(token)}${window.location.search}`));
  } catch (error) {
    captureCard.innerHTML = `<div class="capture-error">${escapeHtml(error.message || "Este recurso ya no esta disponible.")}</div>`;
  }
}

boot();
