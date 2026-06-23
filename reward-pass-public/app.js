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

function statusLabel(status) {
  const labels = {
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
    root.innerHTML = `
      <article class="rp-pass">
        <section class="rp-hero">
          <div>
            <div class="rp-eyebrow">Gift Card Digital Propia</div>
            <h1 class="rp-title">REWARD PASS</h1>
            <p class="rp-subtitle">Emitido por ${escapeHtml(pass.company?.name || "Empresa emisora")}. Administrado tecnologicamente por MarketGames QR Portal.</p>
            <div class="rp-value">
              <span>Saldo disponible</span>
              <strong>${escapeHtml(money(pass.current_balance_cop))}</strong>
            </div>
            <div class="rp-status ${blocked ? "is-blocked" : ""}">${escapeHtml(statusLabel(pass.status))}</div>
          </div>
          <div class="rp-qr">
            <img src="${escapeHtml(pass.qr_image_data_url || "")}" alt="Codigo QR Reward Pass">
            <p>Presenta este QR junto con tu documento en el negocio emisor.</p>
          </div>
        </section>
        <section class="rp-details">
          <div class="rp-detail"><span>Beneficiario</span><strong>${escapeHtml(pass.beneficiary_name)}</strong></div>
          <div class="rp-detail"><span>Documento</span><strong>${escapeHtml(pass.beneficiary_document)}</strong></div>
          <div class="rp-detail"><span>Codigo</span><strong class="rp-code">${escapeHtml(pass.public_code)}</strong></div>
          <div class="rp-detail"><span>Valor inicial</span><strong>${escapeHtml(money(pass.initial_value_cop))}</strong></div>
          <div class="rp-detail"><span>Vigencia</span><strong>${escapeHtml(date(pass.expires_at))}</strong></div>
          <div class="rp-detail"><span>Sede autorizada</span><strong>${escapeHtml(pass.authorized_branch || "Segun condiciones del emisor")}</strong></div>
        </section>
        <footer class="rp-footer">
          <p><strong>Instrucciones:</strong> ${escapeHtml(pass.instructions)}</p>
          <p><strong>Condiciones:</strong> Redimible unicamente en el negocio emisor. No es canjeable por efectivo salvo autorizacion del emisor.</p>
          <p>${pass.partial_redemption_allowed ? "Permite redenciones parciales hasta agotar saldo o hasta la fecha de vencimiento." : "De un solo uso segun condiciones del emisor."}</p>
          <p>${escapeHtml(pass.status_message)}</p>
        </footer>
      </article>
    `;
  } catch (error) {
    root.innerHTML = `<div class="rp-error">${escapeHtml(error.message)}</div>`;
  }
}

render();
