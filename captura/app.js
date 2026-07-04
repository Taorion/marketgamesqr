const captureCard = document.getElementById("captureCard");
const token = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
let currentPayload = null;

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

function render(payload) {
  currentPayload = payload;
  const { business, activation } = payload;
  const asset = activation.asset || {};
  const formConfig = activation.form_config || {};
  const publicMessage = activation.public_message || {};
  captureCard.innerHTML = `
    <div class="brand-row">
      ${business.logo_data_url ? `<img src="${escapeHtml(business.logo_data_url)}" alt="">` : ""}
      <div>
        <strong>${escapeHtml(business.name || "MarketGamesQR")}</strong>
        <span>Captura Relampago de Lead</span>
      </div>
    </div>
    ${asset.cover_image_data_url ? `<img class="asset-cover" src="${escapeHtml(asset.cover_image_data_url)}" alt="${escapeHtml(asset.title || "")}">` : ""}
    <div>
      <h1>${escapeHtml(publicMessage.title || activation.name || "Activo digital")}</h1>
      <p>${escapeHtml(publicMessage.subtitle || "Entrega un activo digital a cambio de tus datos.")}</p>
    </div>
    <section>
      <h2>${escapeHtml(asset.title || "Contenido descargable")}</h2>
      <p class="asset-meta">${escapeHtml(asset.description || activation.description || "Deja tus datos para desbloquear la descarga.")}</p>
    </section>
    <form class="capture-form" id="captureForm">
      ${(formConfig.fields || []).map(fieldInput).join("")}
      ${formConfig.consent_required !== false ? `
        <label class="consent-row">
          <input name="consent_accepted" type="checkbox" required>
          <span>${escapeHtml(formConfig.consent_text || "Autorizo el tratamiento de mis datos personales para recibir informacion comercial relacionada con esta marca.")}</span>
        </label>
      ` : ""}
      ${formConfig.privacy_url ? `<a class="field-help" href="${escapeHtml(formConfig.privacy_url)}" target="_blank" rel="noreferrer">Ver politica de datos</a>` : ""}
      <button class="primary-button" type="submit">${escapeHtml(asset.download_button_text || "Acceder al contenido")}</button>
      <p class="message" id="captureMessage" role="status" aria-live="polite"></p>
    </form>
  `;
  document.getElementById("captureForm")?.addEventListener("submit", submitCapture);
}

async function submitCapture(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("captureMessage");
  const formData = new FormData(form);
  const payload = { form_data: {}, consent_accepted: formData.get("consent_accepted") === "on" };
  for (const [key, value] of formData.entries()) {
    if (key !== "consent_accepted") payload.form_data[key] = String(value || "").trim();
  }
  try {
    message.textContent = "Desbloqueando contenido...";
    const result = await api(`/api/public/lead-captures/${encodeURIComponent(token)}/submissions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const success = currentPayload?.activation?.public_message?.success_message || result.success_message || "Listo. Ya puedes descargar tu activo digital.";
    form.outerHTML = `
      <section class="success-panel">
        <h2>Listo</h2>
        <p>${escapeHtml(success)}</p>
        <a class="download-button" href="${escapeHtml(result.download_url)}">Descargar ahora</a>
      </section>
    `;
  } catch (error) {
    message.textContent = error.message;
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
    captureCard.innerHTML = `<div class="capture-error">${escapeHtml(error.message || "Esta activacion ya no esta disponible.")}</div>`;
  }
}

boot();
