const state = {
  token: decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || ""),
  refreshMs: 15000,
  timer: 0,
};

const els = {
  affiliateName: document.getElementById("affiliateName"),
  businessName: document.getElementById("businessName"),
  cardStatus: document.getElementById("cardStatus"),
  photoInitials: document.getElementById("photoInitials"),
  affiliatePhoto: document.getElementById("affiliatePhoto"),
  pointsTotal: document.getElementById("pointsTotal"),
  lastUpdate: document.getElementById("lastUpdate"),
  documentId: document.getElementById("documentId"),
  phone: document.getElementById("phone"),
  email: document.getElementById("email"),
  eventsCount: document.getElementById("eventsCount"),
  ledgerList: document.getElementById("ledgerList"),
  tokenShort: document.getElementById("tokenShort"),
  statusMessage: document.getElementById("statusMessage"),
  refreshButton: document.getElementById("refreshButton"),
};

function text(value, fallback = "-") {
  return String(value ?? "").trim() || fallback;
}

function initials(value) {
  return text(value, "SM")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeBrandName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isPanoInglesBusiness(value) {
  const normalized = normalizeBrandName(value);
  return normalized.includes("pano ingles") || normalized.includes("panos ingles");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function setStatus(message, error = false) {
  if (!els.statusMessage) return;
  const styles = getComputedStyle(document.body);
  const color = styles.getPropertyValue(error ? "--status-error" : "--status-ok").trim();
  els.statusMessage.textContent = message || "";
  els.statusMessage.style.color = color || (error ? "#ba1a1a" : "#0759d6");
}

async function fetchCard() {
  if (!state.token) {
    throw new Error("Token de carnet no encontrado.");
  }
  const response = await fetch(`/api/public/affiliates/${encodeURIComponent(state.token)}/card`, {
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "No se pudo cargar el carnet.");
  }
  return data;
}

function renderLedger(rows = []) {
  if (!els.ledgerList) return;
  if (!rows.length) {
    els.ledgerList.innerHTML = '<p class="empty-state">Todavía no hay movimientos de puntos.</p>';
    return;
  }
  els.ledgerList.innerHTML = rows.map((row) => `
    <div class="ledger-item">
      <div>
        <b>${text(row.reason, "Compra registrada")}</b>
        <span>${formatDate(row.created_at)}</span>
      </div>
      <strong>+${Number(row.points_awarded || 0)} pts</strong>
    </div>
  `).join("");
}

function renderCard(data) {
  const affiliate = data.affiliate || {};
  const businessSettings = affiliate.business_settings || {};
  const businessName = text(affiliate.business_name || businessSettings.name, "Sales Machine");
  const points = Number(affiliate.points_total || affiliate.ledger_points || 0);
  const active = String(affiliate.status || "ACTIVE").toUpperCase() !== "INACTIVE";

  document.body.classList.toggle("brand-pano-ingles", isPanoInglesBusiness(businessName));
  els.affiliateName.textContent = text(affiliate.full_name, "Afiliado");
  els.businessName.textContent = businessName;
  els.cardStatus.textContent = active ? "Activo" : "Inactivo";
  els.cardStatus.classList.toggle("inactive", !active);
  els.photoInitials.textContent = initials(affiliate.full_name);
  els.pointsTotal.textContent = String(points);
  els.lastUpdate.textContent = `Actualizado ${formatDate(data.server_time || new Date().toISOString())}`;
  els.documentId.textContent = text(affiliate.document_id, "Sin documento");
  els.phone.textContent = text(affiliate.phone, "Sin teléfono");
  els.email.textContent = text(affiliate.email, "Sin email");
  els.eventsCount.textContent = String(Number(affiliate.point_events || 0));
  els.tokenShort.textContent = affiliate.qr_token
    ? `Token ${String(affiliate.qr_token).slice(0, 12).toUpperCase()}...`
    : "Carnet activo";

  if (affiliate.photo_data_url) {
    els.affiliatePhoto.src = affiliate.photo_data_url;
    els.affiliatePhoto.hidden = false;
    els.photoInitials.hidden = true;
  } else {
    els.affiliatePhoto.hidden = true;
    els.photoInitials.hidden = false;
  }
  renderLedger(data.ledger || []);
}

async function refreshCard(manual = false) {
  try {
    if (manual) setStatus("Actualizando carnet...");
    const data = await fetchCard();
    renderCard(data);
    setStatus("Carnet digital en línea. Los puntos se actualizan automáticamente.");
  } catch (error) {
    setStatus(error.message || "No se pudo cargar el carnet.", true);
  } finally {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => refreshCard(false), state.refreshMs);
  }
}

els.refreshButton?.addEventListener("click", () => refreshCard(true));
refreshCard(true);
