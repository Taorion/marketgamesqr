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
    pending_claim: "Estas a un paso",
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

function shareUrlForPass(pass) {
  return pass.public_url || window.location.href;
}

function normalizeWhatsappNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("57") ? digits : `57${digits}`;
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
            <h1 class="rp-title">${isClaim ? "DESCUBRE TU GIFT CARD" : "REWARD PASS"}</h1>
            <p class="rp-subtitle">${isClaim ? "Buenas noticias: tienes una Gift Card esperandote." : "Esta es tu Gift Card Digital oficial."} Emitida por ${escapeHtml(pass.company?.name || "Empresa emisora")} y administrada por MarketGames QR Portal.</p>
            <div class="rp-value">
              <span>${isClaim ? "Solo falta este paso" : "Saldo disponible"}</span>
              <strong>${isClaim ? "ACTIVAR" : money(officialValue)}</strong>
            </div>
            <div class="rp-status ${blocked ? "is-blocked" : ""}">${escapeHtml(statusLabel(pass.status))}</div>
          </div>
          ${isClaim ? `
          <div class="rp-activation-panel">
            <span>Tu premio esta reservado</span>
            <strong>Completa tus datos y desbloquea el valor de tu Gift Card.</strong>
            <p>Al activar, veras el monto disponible y recibiras el QR final que debes presentar en el negocio para redimirla.</p>
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
          <div class="rp-detail"><span>${isClaim ? "Valor" : "Valor inicial"}</span><strong>${escapeHtml(isClaim ? "Lo veras al activar" : money(pass.initial_value_cop))}</strong></div>
          <div class="rp-detail"><span>QR final</span><strong>${escapeHtml(isClaim ? "Se genera despues de tus datos" : "Listo para redimir")}</strong></div>
          <div class="rp-detail"><span>Vigencia</span><strong>${escapeHtml(date(pass.expires_at))}</strong></div>
          <div class="rp-detail"><span>Sede autorizada</span><strong>${escapeHtml(pass.authorized_branch || "Segun condiciones del emisor")}</strong></div>
        </section>
        <footer class="rp-footer">
          <p><strong>Como funciona:</strong> ${escapeHtml(pass.instructions)}</p>
          ${isClaim ? `
          <form class="rp-claim-form" id="rpClaimForm">
            <p class="rp-claim-note">Estas a un paso: escribe tus datos, activa tu Gift Card y descubre el valor disponible junto con tu QR final.</p>
            <label>Nombre completo<input id="rpClaimName" type="text" required></label>
            <label>Documento de identidad<input id="rpClaimDocument" type="text" required></label>
            <label>Celular<input id="rpClaimPhone" type="tel"></label>
            <label>Email<input id="rpClaimEmail" type="email"></label>
            <button type="submit">Activar y ver mi Gift Card</button>
            <p id="rpClaimMessage"></p>
          </form>` : `
          <section class="rp-share-panel">
            <div>
              <span>Conserva tu Gift Card</span>
              <strong>Descarga o comparte tu QR oficial</strong>
              <p>Usa estas opciones para enviartela a tu WhatsApp, compartir el enlace o guardar el PDF.</p>
            </div>
            <div class="rp-share-actions">
              <a class="rp-action-button" href="/api/public/reward-passes/${encodeURIComponent(pass.public_code)}/pdf" download>Descargar PDF</a>
              <button class="rp-action-button" id="rpShareButton" type="button">Compartir enlace</button>
            </div>
            <div class="rp-whatsapp-row">
              <input id="rpWhatsappInput" type="tel" inputmode="tel" placeholder="Celular WhatsApp. Ej: 3001234567">
              <button class="rp-action-button" id="rpWhatsappButton" type="button">Enviar a WhatsApp</button>
            </div>
            <p id="rpShareMessage"></p>
          </section>`}
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
        message.textContent = "Activando tu Gift Card oficial...";
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
        message.textContent = claimData.message || "Gift Card oficial activada. Cargando tu QR final...";
        setTimeout(render, 600);
      } catch (claimError) {
        message.textContent = claimError.message;
      }
    });
    if (!isClaim) {
      const shareMessage = document.getElementById("rpShareMessage");
      const shareUrl = shareUrlForPass(pass);
      document.getElementById("rpShareButton")?.addEventListener("click", async () => {
        const shareData = {
          title: "Mi Gift Card Digital",
          text: `Mi Reward Pass de ${pass.company?.name || "MarketGames QR"}: ${money(officialValue)} COP disponibles.`,
          url: shareUrl,
        };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
            if (shareMessage) shareMessage.textContent = "Enlace compartido.";
            return;
          }
          await navigator.clipboard.writeText(shareUrl);
          if (shareMessage) shareMessage.textContent = "Enlace copiado al portapapeles.";
        } catch (shareError) {
          if (shareMessage) shareMessage.textContent = "No se pudo compartir. Copia el enlace desde la barra del navegador.";
        }
      });
      document.getElementById("rpWhatsappButton")?.addEventListener("click", () => {
        const phone = normalizeWhatsappNumber(document.getElementById("rpWhatsappInput")?.value);
        if (!phone) {
          if (shareMessage) shareMessage.textContent = "Ingresa un numero de WhatsApp valido.";
          return;
        }
        const text = encodeURIComponent(`Te comparto mi Gift Card Digital de ${pass.company?.name || "MarketGames QR"} por ${money(officialValue)} COP. Link oficial: ${shareUrl}`);
        window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener");
      });
    }
  } catch (error) {
    root.innerHTML = `<div class="rp-error">${escapeHtml(error.message)}</div>`;
  }
}

render();
