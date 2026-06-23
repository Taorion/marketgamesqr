const root = document.getElementById("rewardPassRoot");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function date(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}

function apiErrorMessage(data, fallback) {
  const baseMessage = data?.error?.message || fallback;
  const fieldErrors = data?.error?.details?.fieldErrors || {};
  const firstField = Object.keys(fieldErrors)[0];
  const firstMessage = firstField ? fieldErrors[firstField]?.[0] : "";
  if (firstField && firstMessage) {
    return `${baseMessage} ${firstField}: ${firstMessage}`;
  }
  const formErrors = data?.error?.details?.formErrors || [];
  if (formErrors.length) {
    return `${baseMessage} ${formErrors[0]}`;
  }
  return baseMessage;
}

function statusLabel(status) {
  const labels = {
    pending_claim: "Pendiente de activacion",
    active: "Activo",
    partially_redeemed: "Parcialmente redimido",
    fully_redeemed: "Redimido totalmente",
    expired: "Vencido",
    cancelled: "Anulado",
    extended: "Prorrogado",
  };
  return labels[status] || status || "-";
}

function publicCodeFromPath() {
  return decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
}

async function render() {
  const publicCode = publicCodeFromPath();
  if (!publicCode) {
    root.innerHTML = '<div class="rp-error">Codigo de Reward Pass no encontrado.</div>';
    return;
  }

  try {
    const response = await fetch(`/api/public/reward-passes/${encodeURIComponent(publicCode)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || "No se pudo cargar este Reward Pass.");
    }
    const pass = data.reward_pass;
    const blocked = ["fully_redeemed", "expired", "cancelled"].includes(pass.status);
    const isClaim = Boolean(pass.claim_required);
    const officialValue = Number(pass.current_balance_cop ?? pass.initial_value_cop ?? 0);
    root.innerHTML = `
      <article class="rp-pass">
        <section class="rp-hero ${isClaim ? "is-claim" : ""}">
          <div>
            <div class="rp-eyebrow">Gift Card Digital Propia</div>
            <h1 class="rp-title">${isClaim ? "ACTIVA TU GIFT CARD" : "REWARD PASS"}</h1>
            <p class="rp-subtitle">Emitido por ${escapeHtml(pass.company?.name || "Empresa emisora")}. Administrado tecnologicamente por MarketGames QR Portal.</p>
            <div class="rp-value">
              <span>${isClaim ? "Paso requerido" : "Saldo disponible"}</span>
              <strong>${isClaim ? "ACTIVAR" : money(officialValue)}</strong>
            </div>
            <div class="rp-status ${blocked ? "is-blocked" : ""}">${escapeHtml(statusLabel(pass.status))}</div>
          </div>
          ${isClaim ? `
          <div class="rp-activation-panel">
            <span>Validacion previa</span>
            <strong>Completa tus datos para recibir la Gift Card oficial.</strong>
            <p>Por seguridad, el QR redimible y el valor se muestran solo despues de activar la gift card con tu informacion.</p>
          </div>` : `
          <div class="rp-qr">
            <img src="${escapeHtml(pass.qr_image_data_url || "")}" alt="Codigo QR Reward Pass">
            <p>Presenta este QR junto con tu documento en el negocio emisor.</p>
          </div>`}
        </section>
        <section class="rp-details">
          <div class="rp-detail"><span>Beneficiario</span><strong>${escapeHtml(isClaim ? "Se registra al activar" : pass.beneficiary_name || "-")}</strong></div>
          <div class="rp-detail"><span>Documento</span><strong>${escapeHtml(isClaim ? "Se solicita al activar" : pass.beneficiary_document || "-")}</strong></div>
          <div class="rp-detail"><span>Codigo</span><strong class="rp-code">${escapeHtml(pass.public_code)}</strong></div>
          <div class="rp-detail"><span>${isClaim ? "Valor" : "Valor inicial"}</span><strong>${escapeHtml(isClaim ? "Disponible despues de activar" : money(pass.initial_value_cop))}</strong></div>
          <div class="rp-detail"><span>Saldo</span><strong>${escapeHtml(isClaim ? "Disponible despues de activar" : money(pass.current_balance_cop))}</strong></div>
          <div class="rp-detail"><span>Vigencia</span><strong>${escapeHtml(date(pass.expires_at))}</strong></div>
          <div class="rp-detail"><span>Sede autorizada</span><strong>${escapeHtml(pass.authorized_branch || "Segun condiciones del emisor")}</strong></div>
        </section>
        <footer class="rp-footer">
          <p><strong>Instrucciones:</strong> ${escapeHtml(pass.instructions)}</p>
          ${isClaim ? `
          <form class="rp-claim-form" id="rpClaimForm">
            <p class="rp-claim-note">Completa tus datos. Al activar, veras la Gift Card oficial con su valor y el QR redimible en punto de venta.</p>
            <label>Nombre completo<input id="rpClaimName" type="text" required></label>
            <label>Documento de identidad<input id="rpClaimDocument" type="text" required></label>
            <label>Celular<input id="rpClaimPhone" type="tel"></label>
            <label>Email<input id="rpClaimEmail" type="email"></label>
            <button type="submit">Activar Gift Card Oficial</button>
            <p id="rpClaimMessage"></p>
          </form>` : ""}
          <p><strong>Condiciones:</strong> Redimible unicamente en el negocio emisor. No es canjeable por efectivo salvo autorizacion del emisor.</p>
          <p>${pass.partial_redemption_allowed ? "Permite redenciones parciales hasta agotar saldo o hasta la fecha de vencimiento." : "De un solo uso segun condiciones del emisor."}</p>
          <p>${escapeHtml(pass.status_message)}</p>
        </footer>
      </article>
    `;
    const form = document.getElementById("rpClaimForm");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("rpClaimMessage");
      message.textContent = "Activando gift card oficial...";
      try {
        const claimResponse = await fetch(`/api/public/reward-passes/${encodeURIComponent(publicCode)}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            beneficiary_name: document.getElementById("rpClaimName").value.trim(),
            beneficiary_document: document.getElementById("rpClaimDocument").value.trim(),
            beneficiary_phone: document.getElementById("rpClaimPhone").value.trim() || null,
            beneficiary_email: document.getElementById("rpClaimEmail").value.trim() || null,
          }),
        });
        const claimData = await claimResponse.json().catch(() => ({}));
        if (!claimResponse.ok) {
          throw new Error(apiErrorMessage(claimData, "No se pudo activar la Gift Card."));
        }
        message.textContent = claimData.message || "Gift Card oficial activada.";
        setTimeout(render, 600);
      } catch (claimError) {
        message.textContent = claimError.message;
      }
    });
  } catch (error) {
    root.innerHTML = `<div class="rp-error">${escapeHtml(error.message)}</div>`;
  }
}

render();
