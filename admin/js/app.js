const SESSION_KEY = "market_games_admin_session_v1";

const loginPanel = document.getElementById("loginPanel");
const workspace = document.getElementById("workspace");
const loginForm = document.getElementById("loginForm");
const businessForm = document.getElementById("businessForm");
const campaignForm = document.getElementById("campaignForm");
const deliveryForm = document.getElementById("deliveryForm");
const creditForm = document.getElementById("creditForm");
const userForm = document.getElementById("userForm");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const markReadyButton = document.getElementById("markReadyButton");
const campaignsTable = document.getElementById("campaignsTable");
const businessCampaignsTable = document.getElementById("businessCampaignsTable");
const campaignTimelineTable = document.getElementById("campaignTimelineTable");
const campaignSnapshotsTable = document.getElementById("campaignSnapshotsTable");
const summaryGrid = document.getElementById("summaryGrid");
const adminStatsGrid = document.getElementById("adminStatsGrid");
const creditStrip = document.getElementById("creditStrip");
const creditDashboard = document.getElementById("creditDashboard");
const creditLedgerTable = document.getElementById("creditLedgerTable");
const clientsTable = document.getElementById("clientsTable");
const usersTable = document.getElementById("usersTable");
const packageRequestsTable = document.getElementById("packageRequestsTable");
const campaignReportGrid = document.getElementById("campaignReportGrid");
const businessFilter = document.getElementById("businessFilter");
const userBusinessId = document.getElementById("userBusinessId");
const userBusinessField = document.getElementById("userBusinessField");
const userRole = document.getElementById("userRole");
const userCrossBusiness = document.getElementById("userCrossBusiness");
const loginMessage = document.getElementById("loginMessage");
const businessMessage = document.getElementById("businessMessage");
const campaignMessage = document.getElementById("campaignMessage");
const creditMessage = document.getElementById("creditMessage");
const userMessage = document.getElementById("userMessage");
const packageRequestMessage = document.getElementById("packageRequestMessage");
const deliveryMessage = document.getElementById("deliveryMessage");
const selectedCampaignLabel = document.getElementById("selectedCampaignLabel");
const campaignBusinessId = document.getElementById("campaignBusinessId");

const state = {
  businesses: [],
  campaigns: [],
  users: [],
  packageRequests: [],
  selectedBusinessId: "",
  selectedCampaignId: "",
  selectedBusinessSummary: null,
  selectedCampaignReport: null,
  selectedCredits: null,
};

const INTERNAL_UNIT_PRICE_COP = 1000;

let session = loadSession();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function pct(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value || 0).toFixed(1)}%`;
}

function ratio(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value || 0).toFixed(2)}x`;
}

function number(value) {
  return Number(value || 0).toLocaleString("es-CO");
}

function internalValue(qrAmount, unitPrice = INTERNAL_UNIT_PRICE_COP) {
  return Number(qrAmount || 0) * Number(unitPrice || INTERNAL_UNIT_PRICE_COP);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status) {
  const labels = {
    DRAFT: "Borrador",
    READY_FOR_CLIENT_SETUP: "Lista para cliente",
    SCHEDULED: "Programada",
    ACTIVE: "Activa",
    PAUSED: "Pausada",
    FINISHED: "Finalizada",
    ARCHIVED: "Archivada",
  };
  return labels[status] || status || "-";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Error de API");
  return data;
}

function renderShell() {
  const logged = Boolean(session?.token);
  loginPanel.classList.toggle("hidden", logged);
  workspace.classList.toggle("hidden", !logged);
  if (logged) loadWorkspace();
}

function checklistReady() {
  return [
    document.getElementById("checkBrief").checked,
    document.getElementById("checkCopies").checked,
    document.getElementById("checkCreatives").checked,
    document.getElementById("checkLinks").checked,
    document.getElementById("checkQa").checked,
    document.getElementById("checkShared").checked,
  ].every(Boolean);
}

async function login(event) {
  event.preventDefault();
  loginMessage.textContent = "";
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("emailInput").value,
        password: document.getElementById("passwordInput").value,
      }),
    });
    session = data;
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    renderShell();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
}

async function createBusiness(event) {
  event.preventDefault();
  businessMessage.textContent = "";
  try {
    const data = await api("/api/admin/businesses", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("businessName").value.trim(),
        slug: document.getElementById("businessSlug").value.trim(),
        owner_email: document.getElementById("ownerEmail").value.trim() || undefined,
        owner_password: document.getElementById("ownerPassword").value.trim() || undefined,
        package_size: document.getElementById("initialPackageSize").value
          ? Number(document.getElementById("initialPackageSize").value)
          : undefined,
        public_label: document.getElementById("initialPublicLabel").value.trim() || undefined,
        package_notes: document.getElementById("initialPackageNotes").value.trim() || undefined,
      }),
    });
    businessMessage.textContent = `Negocio creado: ${data.business.name}`;
    businessForm.reset();
    await loadBusinesses();
    if (data.business?.id) {
      state.selectedBusinessId = data.business.id;
      businessFilter.value = data.business.id;
      campaignBusinessId.value = data.business.id;
      await loadBusinessSummary(data.business.id);
    }
  } catch (error) {
    businessMessage.textContent = error.message;
  }
}

async function createCampaign(event) {
  event.preventDefault();
  campaignMessage.textContent = "";
  try {
    await api("/api/admin/campaigns", {
      method: "POST",
      body: JSON.stringify({
        business_id: campaignBusinessId.value,
        name: document.getElementById("campaignName").value.trim(),
        slug: document.getElementById("campaignSlug").value.trim(),
        type: document.getElementById("campaignType").value,
        budget_total: Number(document.getElementById("campaignBudget").value || 0),
        expected_sales_goal: Number(document.getElementById("campaignGoal").value || 0),
        objective: document.getElementById("campaignObjective").value.trim() || null,
        strategy_summary: document.getElementById("campaignStrategy").value.trim() || null,
        status: document.getElementById("campaignStatus").value,
      }),
    });
    campaignMessage.textContent = "Campana creada.";
    campaignForm.reset();
    campaignBusinessId.value = state.selectedBusinessId || campaignBusinessId.value;
    document.getElementById("campaignStatus").value = "DRAFT";
    document.getElementById("campaignType").value = "GAME";
    await loadCampaigns();
    if (state.selectedBusinessId) await loadBusinessSummary(state.selectedBusinessId);
  } catch (error) {
    campaignMessage.textContent = error.message;
  }
}

async function createUser(event) {
  event.preventDefault();
  userMessage.textContent = "";
  try {
    const role = userRole.value;
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        full_name: document.getElementById("userFullName").value.trim(),
        email: document.getElementById("userEmail").value.trim(),
        password: document.getElementById("userPassword").value.trim(),
        role,
        business_id: role === "ADMIN_MARKET_GAMES" ? null : userBusinessId.value,
        can_redeem_cross_business: role === "VALIDATOR" && userCrossBusiness.checked,
      }),
    });
    userMessage.textContent = "Usuario creado.";
    userForm.reset();
    syncUserRoleFields();
    await loadUsers();
    await loadBusinesses();
  } catch (error) {
    userMessage.textContent = error.message;
  }
}

async function loadWorkspace() {
  await Promise.all([loadBusinesses(), loadUsers(), loadPackageRequests()]);
  const businessId = state.selectedBusinessId || state.businesses[0]?.id || "";
  if (businessId) {
    businessFilter.value = businessId;
    state.selectedBusinessId = businessId;
    campaignBusinessId.value = businessId;
    userBusinessId.value = businessId;
    await Promise.all([loadBusinessSummary(businessId), loadCampaigns()]);
  } else {
    await loadCampaigns();
    renderBusinessSummary();
  }
}

async function loadBusinesses() {
  const data = await api("/api/admin/businesses");
  state.businesses = data.businesses || [];
  renderBusinessOptions();
  renderAdminStats();
  renderClientsTable();
}

async function loadUsers() {
  const data = await api("/api/admin/users");
  state.users = data.users || [];
  renderUsers();
}

async function loadPackageRequests() {
  const data = await api("/api/admin/package-requests");
  state.packageRequests = data.requests || [];
  renderPackageRequests();
}

function renderBusinessOptions() {
  const options = state.businesses.map((business) =>
    `<option value="${escapeHtml(business.id)}">${escapeHtml(business.name)}</option>`
  ).join("");

  businessFilter.innerHTML = options || '<option value="">Sin clientes</option>';
  campaignBusinessId.innerHTML = options || '<option value="">Sin clientes</option>';
  userBusinessId.innerHTML = options || '<option value="">Sin clientes</option>';

  if (state.selectedBusinessId && state.businesses.some((business) => business.id === state.selectedBusinessId)) {
    businessFilter.value = state.selectedBusinessId;
    campaignBusinessId.value = state.selectedBusinessId;
    userBusinessId.value = state.selectedBusinessId;
  } else if (state.businesses[0]) {
    state.selectedBusinessId = state.businesses[0].id;
    businessFilter.value = state.selectedBusinessId;
    campaignBusinessId.value = state.selectedBusinessId;
    userBusinessId.value = state.selectedBusinessId;
  }
}

function renderAdminStats() {
  const totals = state.businesses.reduce((acc, business) => {
    const balance = Number(business.qr_balance || 0);
    const used = Number(business.qr_used_total || 0);
    const purchased = Number(business.qr_purchased_total || 0);
    const unit = Number(business.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP);
    acc.balance += balance;
    acc.used += used;
    acc.purchased += purchased;
    acc.balanceValue += internalValue(balance, unit);
    acc.usedValue += internalValue(used, unit);
    if (balance <= 0 && purchased > 0) acc.exhausted += 1;
    if (balance > 0 && balance <= Math.max(10, Math.ceil(Number(business.current_package_size || 0) * 0.1))) acc.low += 1;
    return acc;
  }, { balance: 0, used: 0, purchased: 0, balanceValue: 0, usedValue: 0, exhausted: 0, low: 0 });

  const items = [
    ["Clientes activos", state.businesses.length, `${totals.exhausted} agotados`],
    ["Trafico disponible", `${number(totals.balance)} creditos`, money(totals.balanceValue)],
    ["Trafico consumido", `${number(totals.used)} / ${number(totals.purchased)}`, money(totals.usedValue)],
  ];

  adminStatsGrid.innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");
}

function renderClientsTable() {
  clientsTable.innerHTML = state.businesses.map((business) => {
    const balance = Number(business.qr_balance || 0);
    const purchased = Number(business.qr_purchased_total || 0);
    const used = Number(business.qr_used_total || 0);
    const unit = Number(business.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP);
    const usedRate = purchased ? ((used / purchased) * 100).toFixed(1) : "0.0";
    const lowBalance = balance > 0 && balance <= Math.max(10, Math.ceil(Number(business.current_package_size || 0) * 0.1));
    const rowClass = purchased && balance <= 0 ? "danger-row" : lowBalance ? "warning-row" : "";
    return `
      <tr class="${rowClass}" data-business-id="${escapeHtml(business.id)}">
        <td><strong>${escapeHtml(business.name)}</strong><br><small>${escapeHtml(business.slug)}</small></td>
        <td>${business.current_package_size ? `${number(business.current_package_size)} QR` : "Legacy"}</td>
        <td>${number(balance)} trafico</td>
        <td>${number(used)} / ${number(purchased)}<br><small>${usedRate}% usado</small></td>
        <td>${money(internalValue(balance, unit))}</td>
        <td>${number(business.validators_count || 0)}<br><small>${number(business.users_count || 0)} usuarios</small></td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="6">Sin clientes registrados.</td></tr>';

  clientsTable.querySelectorAll("[data-business-id]").forEach((row) => {
    row.addEventListener("click", async () => {
      state.selectedBusinessId = row.dataset.businessId;
      businessFilter.value = state.selectedBusinessId;
      campaignBusinessId.value = state.selectedBusinessId;
      userBusinessId.value = state.selectedBusinessId;
      await loadBusinessSummary(state.selectedBusinessId);
      await loadCampaigns();
    });
  });
}

function renderUsers() {
  usersTable.innerHTML = state.users.slice(0, 12).map((user) => `
    <tr>
      <td><strong>${escapeHtml(user.full_name)}</strong><br><small>${escapeHtml(user.email)}</small></td>
      <td>${escapeHtml(user.role)}</td>
      <td>${escapeHtml(user.business_name || "Interno")}</td>
    </tr>
  `).join("") || '<tr><td colspan="3">Sin usuarios cargados.</td></tr>';
}

function requestStatusChip(isDone, doneLabel, pendingLabel) {
  return `<span class="status-chip ${isDone ? "" : "warning"}">${escapeHtml(isDone ? doneLabel : pendingLabel)}</span>`;
}

function renderPackageRequests() {
  packageRequestsTable.innerHTML = state.packageRequests.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.company_name)}</strong><br>
        <small>NIT: ${escapeHtml(item.nit || "-")} · ${escapeHtml(formatDate(item.created_at))}</small>
      </td>
      <td>
        <strong>${escapeHtml(item.package_code)}</strong><br>
        <small>${escapeHtml(item.package_title)} · ${money(item.price_cop)}</small>
      </td>
      <td>
        ${escapeHtml(item.contact_name)}<br>
        <small>${escapeHtml(item.phone)} · ${escapeHtml(item.email)}</small>
      </td>
      <td>
        <label class="checkbox-row">
          <input type="checkbox" data-request-toggle="${escapeHtml(item.id)}" data-field="payment_confirmed" ${item.payment_confirmed ? "checked" : ""}>
          <span>${requestStatusChip(item.payment_confirmed, "Pago confirmado", "Pago pendiente")}</span>
        </label>
      </td>
      <td>
        <label class="checkbox-row">
          <input type="checkbox" data-request-toggle="${escapeHtml(item.id)}" data-field="service_assigned" ${item.service_assigned ? "checked" : ""}>
          <span>${requestStatusChip(item.service_assigned, "Disfrutando", "Sin asignar")}</span>
        </label>
        <small>${escapeHtml(item.assigned_business_name || "")}</small>
      </td>
      <td>
        <button class="secondary-button compact" type="button" data-use-request="${escapeHtml(item.id)}">Usar datos</button>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="6">Sin solicitudes de paquetes.</td></tr>';

  packageRequestsTable.querySelectorAll("[data-request-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      const patch = { [input.dataset.field]: input.checked };
      if (input.dataset.field === "service_assigned" && input.checked && state.selectedBusinessId) {
        patch.assigned_business_id = state.selectedBusinessId;
      }
      updatePackageRequest(input.dataset.requestToggle, patch);
    });
  });

  packageRequestsTable.querySelectorAll("[data-use-request]").forEach((button) => {
    button.addEventListener("click", () => usePackageRequest(button.dataset.useRequest));
  });
}

async function updatePackageRequest(id, patch) {
  packageRequestMessage.textContent = "Actualizando solicitud...";
  try {
    await api(`/api/admin/package-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    packageRequestMessage.textContent = "Solicitud actualizada.";
    await loadPackageRequests();
  } catch (error) {
    packageRequestMessage.textContent = error.message;
    await loadPackageRequests();
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "cliente";
}

function usePackageRequest(id) {
  const item = state.packageRequests.find((request) => request.id === id);
  if (!item) return;

  document.getElementById("businessName").value = item.company_name;
  document.getElementById("businessSlug").value = slugify(item.company_name);
  document.getElementById("ownerEmail").value = item.email;
  document.getElementById("initialPackageSize").value = String(item.package_size);
  document.getElementById("initialPublicLabel").value = `${item.package_title} · trafico inicial`;
  document.getElementById("initialPackageNotes").value = [
    `Solicitud landing ${item.package_code}`,
    `Precio cliente ${money(item.price_cop)}`,
    `Contacto ${item.contact_name} ${item.phone}`,
    item.nit ? `NIT ${item.nit}` : "",
    item.website ? `Web ${item.website}` : "",
  ].filter(Boolean).join(" · ");
  packageRequestMessage.textContent = "Datos copiados al formulario de crear cliente. Crea el cliente y luego marca servicio asignado.";
  businessForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncUserRoleFields() {
  const isInternal = userRole.value === "ADMIN_MARKET_GAMES";
  userBusinessField.classList.toggle("hidden", isInternal);
  userCrossBusiness.closest("label").classList.toggle("hidden", userRole.value !== "VALIDATOR");
  userBusinessId.required = !isInternal;
}

async function loadCampaigns() {
  const path = state.selectedBusinessId
    ? `/api/admin/campaigns?business_id=${encodeURIComponent(state.selectedBusinessId)}`
    : "/api/admin/campaigns";
  const [filteredData, allData] = await Promise.all([
    api(path),
    api("/api/admin/campaigns"),
  ]);
  state.campaigns = allData.campaigns || [];
  renderGlobalCampaigns();
  renderBusinessCampaigns(filteredData.campaigns || []);
}

function renderGlobalCampaigns() {
  campaignsTable.innerHTML = state.campaigns.map((item) => `
    <tr data-campaign-id="${escapeHtml(item.id)}">
      <td>${escapeHtml(item.business_name)}</td>
      <td>${item.qr_balance === null || item.qr_balance === undefined ? "-" : `${number(item.qr_balance)} trafico`}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.type)}</td>
      <td><span class="status-chip">${escapeHtml(statusLabel(item.status))}</span></td>
      <td>${money(item.budget_total || 0)}</td>
      <td>${escapeHtml(item.objective || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="7">Sin campanas.</td></tr>';

  campaignsTable.querySelectorAll("[data-campaign-id]").forEach((row) => {
    row.addEventListener("click", () => selectCampaign(row.dataset.campaignId));
  });
}

function renderBusinessCampaigns(campaigns) {
  businessCampaignsTable.innerHTML = campaigns.map((item) => `
    <tr data-campaign-id="${escapeHtml(item.id)}">
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(statusLabel(item.status))}</td>
      <td>${escapeHtml(item.total_leads || 0)}</td>
      <td>${escapeHtml(item.total_qr_redeemed || 0)}</td>
      <td>${money(item.attributed_revenue || 0)}</td>
      <td>${ratio(item.estimated_roi)}</td>
    </tr>
  `).join("") || '<tr><td colspan="6">Sin campanas para este cliente.</td></tr>';

  businessCampaignsTable.querySelectorAll("[data-campaign-id]").forEach((row) => {
    row.addEventListener("click", () => selectCampaign(row.dataset.campaignId));
  });
}

async function loadBusinessSummary(businessId) {
  const [data, credits] = await Promise.all([
    api(`/api/admin/businesses/${businessId}/summary`),
    api(`/api/admin/businesses/${businessId}/credits`),
  ]);
  state.selectedBusinessSummary = data;
  state.selectedCredits = credits;
  renderBusinessSummary();
  renderCredits();
}

function renderBusinessSummary() {
  const summary = state.selectedBusinessSummary?.summary;
  if (!summary) {
    summaryGrid.innerHTML = "";
    creditStrip.innerHTML = "";
    businessCampaignsTable.innerHTML = '<tr><td colspan="6">Selecciona un cliente.</td></tr>';
    return;
  }

  const items = [
    ["Campanas activas", summary.active_campaigns, "En ejecucion"],
    ["Listas para cliente", summary.ready_for_client_setup, "Pendientes de configuracion"],
    ["Leads", summary.total_leads, "Acumulado cliente"],
    ["QR redimidos", summary.total_qr_redeemed, `${pct(summary.redemption_rate)} tasa`],
    ["Ingreso atribuido", money(summary.attributed_revenue), ratio(summary.estimated_roi)],
    ["Inversion total", money(summary.total_investment), money(summary.sales_uplift)],
  ];

  summaryGrid.innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  const account = state.selectedBusinessSummary?.credit_account || state.selectedCredits?.credit_account;
  creditStrip.innerHTML = account ? `
    <article class="credit-strip-card ${account.exhausted ? "danger" : account.low_balance ? "warning" : ""}">
      <span>Saldo visible para cliente</span>
      <strong>${number(account.qr_balance)} creditos de trafico</strong>
      <small>${number(account.qr_used_total)} usados de ${number(account.qr_purchased_total)} comprados · ${account.used_rate}% consumido</small>
    </article>
  ` : `
    <article class="credit-strip-card warning">
      <span>Sin cuenta de trafico</span>
      <strong>Cliente legacy</strong>
      <small>Asigna un paquete para activar control de saldo.</small>
    </article>
  `;
}

function renderCredits() {
  const account = state.selectedCredits?.credit_account;
  if (!state.selectedBusinessId) {
    creditDashboard.innerHTML = '<p class="helper-text">Selecciona un cliente.</p>';
    creditLedgerTable.innerHTML = '<tr><td colspan="5">Sin cliente seleccionado.</td></tr>';
    return;
  }

  creditDashboard.innerHTML = account ? `
    <div class="credit-meter ${account.exhausted ? "danger" : account.low_balance ? "warning" : ""}">
      <div>
        <span class="mono-label">Trafico disponible</span>
        <strong>${number(account.qr_balance)}</strong>
        <p>${escapeHtml(account.public_label || "Creditos de trafico")}</p>
      </div>
      <div>
        <span class="mono-label">Uso interno</span>
        <strong>${number(account.qr_used_total)} / ${number(account.qr_purchased_total)}</strong>
        <p>${account.used_rate}% consumido · paquete ${number(account.current_package_size)}</p>
      </div>
    </div>
  ` : `
    <div class="empty-credit">
      <strong>Sin paquete asignado</strong>
      <p>Este cliente opera como legacy. Asigna un paquete para activar consumo por QR.</p>
    </div>
  `;

  creditLedgerTable.innerHTML = (state.selectedCredits?.ledger || []).map((item) => `
    <tr>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
      <td>${escapeHtml(item.entry_type)}</td>
      <td>${escapeHtml(number(item.delta_qr))}</td>
      <td>${escapeHtml(number(item.balance_after))}</td>
      <td>${escapeHtml(item.notes || item.public_label || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="5">Sin movimientos.</td></tr>';
}

async function addCredits(event) {
  event.preventDefault();
  if (!state.selectedBusinessId) {
    creditMessage.textContent = "Selecciona un cliente.";
    return;
  }

  creditMessage.textContent = "Asignando paquete...";
  try {
    const packageSize = Number(document.getElementById("creditPackageSize").value);
    await api(`/api/admin/businesses/${state.selectedBusinessId}/credits`, {
      method: "POST",
      body: JSON.stringify({
        package_size: packageSize,
        public_label: document.getElementById("creditPublicLabel").value.trim() || `Recarga de ${packageSize} creditos de trafico`,
        notes: document.getElementById("creditNotes").value.trim() || null,
      }),
    });
    creditMessage.textContent = "Paquete asignado.";
    creditForm.reset();
    await loadBusinesses();
    await loadBusinessSummary(state.selectedBusinessId);
  } catch (error) {
    creditMessage.textContent = error.message;
  }
}

async function selectCampaign(campaignId) {
  state.selectedCampaignId = campaignId;
  selectedCampaignLabel.textContent = "Cargando campana...";
  deliveryMessage.textContent = "";
  const report = await api(`/api/admin/campaigns/${campaignId}/report`);
  state.selectedCampaignReport = report;
  state.selectedBusinessId = report.business?.id || state.selectedBusinessId;
  businessFilter.value = state.selectedBusinessId;
  campaignBusinessId.value = state.selectedBusinessId;
  hydrateDeliveryForm(report.campaign);
  renderCampaignReport(report);
  await loadBusinessSummary(state.selectedBusinessId);
  await loadCampaigns();
}

function hydrateDeliveryForm(campaign) {
  const assets = campaign?.delivered_assets || {};
  const checklist = assets.checklist || {};
  selectedCampaignLabel.textContent = `${campaign.name} · ${campaign.business_name || state.selectedBusinessSummary?.business?.name || ""}`;
  document.getElementById("assetLandingUrl").value = assets.landing_url || "";
  document.getElementById("assetValidatorUrl").value = assets.validator_url || "";
  document.getElementById("assetGameUrl").value = assets.game_url || "";
  document.getElementById("assetPrimaryLink").value = assets.primary_link || "";
  document.getElementById("assetQrLandingUrl").value = assets.qr_landing_url || "";
  document.getElementById("assetNotes").value = assets.creative_notes || "";
  document.getElementById("checkBrief").checked = Boolean(checklist.brief_ready);
  document.getElementById("checkCopies").checked = Boolean(checklist.copies_ready);
  document.getElementById("checkCreatives").checked = Boolean(checklist.creatives_ready);
  document.getElementById("checkLinks").checked = Boolean(checklist.links_ready);
  document.getElementById("checkQa").checked = Boolean(checklist.qa_ready);
  document.getElementById("checkShared").checked = Boolean(checklist.client_shared);
}

function renderCampaignReport(report) {
  const campaign = report?.campaign;
  if (!campaign) {
    campaignReportGrid.innerHTML = "";
    campaignTimelineTable.innerHTML = '<tr><td colspan="4">Selecciona una campana.</td></tr>';
    campaignSnapshotsTable.innerHTML = '<tr><td colspan="4">Sin snapshots.</td></tr>';
    return;
  }

  const items = [
    ["Estado", statusLabel(campaign.status), campaign.type],
    ["Leads", campaign.total_leads, `${campaign.direct_sales_count} ventas`],
    ["QR", campaign.total_qr_generated, `${campaign.total_qr_redeemed} redimidos`],
    ["Ingreso", money(campaign.attributed_revenue), ratio(campaign.estimated_roi)],
    ["Meta", money(campaign.expected_sales_goal), money(campaign.sales_uplift)],
    ["Costo por lead", money(campaign.cost_per_lead || 0), money(campaign.cost_per_redeemed_qr || 0)],
  ];

  campaignReportGrid.innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  const salesByDay = new Map((report.sales_by_day || []).map((item) => [item.date, item]));
  const redemptionsByDay = new Map((report.redemptions_by_day || []).map((item) => [item.date, item]));
  const dates = [...new Set([...salesByDay.keys(), ...redemptionsByDay.keys()])].sort();
  campaignTimelineTable.innerHTML = dates.map((date) => {
    const sales = salesByDay.get(date) || {};
    const redemptions = redemptionsByDay.get(date) || {};
    return `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(redemptions.count || 0)}</td>
        <td>${escapeHtml(sales.sales || 0)}</td>
        <td>${money(sales.revenue || 0)}</td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="4">Sin actividad diaria aun.</td></tr>';

  campaignSnapshotsTable.innerHTML = (report.sales_snapshots || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.period_type)}</td>
      <td>${escapeHtml(formatDate(item.start_date))} - ${escapeHtml(formatDate(item.end_date))}</td>
      <td>${money(item.total_sales_amount || 0)}</td>
      <td>${escapeHtml(item.total_orders || 0)}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sin snapshots comerciales.</td></tr>';
}

async function saveDelivery(event) {
  event.preventDefault();
  if (!state.selectedCampaignId) {
    deliveryMessage.textContent = "Selecciona una campana primero.";
    return;
  }

  deliveryMessage.textContent = "Guardando...";
  const currentAssets = state.selectedCampaignReport?.campaign?.delivered_assets || {};

  try {
    const result = await api(`/api/admin/campaigns/${state.selectedCampaignId}`, {
      method: "PATCH",
      body: JSON.stringify({
        delivered_assets: {
          ...currentAssets,
          landing_url: document.getElementById("assetLandingUrl").value.trim() || null,
          validator_url: document.getElementById("assetValidatorUrl").value.trim() || null,
          game_url: document.getElementById("assetGameUrl").value.trim() || null,
          primary_link: document.getElementById("assetPrimaryLink").value.trim() || null,
          qr_landing_url: document.getElementById("assetQrLandingUrl").value.trim() || null,
          creative_notes: document.getElementById("assetNotes").value.trim() || null,
          checklist: {
            brief_ready: document.getElementById("checkBrief").checked,
            copies_ready: document.getElementById("checkCopies").checked,
            creatives_ready: document.getElementById("checkCreatives").checked,
            links_ready: document.getElementById("checkLinks").checked,
            qa_ready: document.getElementById("checkQa").checked,
            client_shared: document.getElementById("checkShared").checked,
          },
        },
      }),
    });
    deliveryMessage.textContent = "Assets actualizados.";
    state.selectedCampaignReport.campaign = result.campaign;
    hydrateDeliveryForm(result.campaign);
    await loadCampaigns();
  } catch (error) {
    deliveryMessage.textContent = error.message;
  }
}

async function markReady() {
  if (!state.selectedCampaignId) {
    deliveryMessage.textContent = "Selecciona una campana primero.";
    return;
  }
  if (!checklistReady()) {
    deliveryMessage.textContent = "Completa todo el checklist antes de marcar la campana como lista para cliente.";
    return;
  }

  deliveryMessage.textContent = "Marcando...";
  try {
    await api(`/api/admin/campaigns/${state.selectedCampaignId}/mark-ready`, {
      method: "POST",
    });
    deliveryMessage.textContent = "Campana marcada como lista para cliente.";
    await selectCampaign(state.selectedCampaignId);
  } catch (error) {
    deliveryMessage.textContent = error.message;
  }
}

loginForm.addEventListener("submit", login);
businessForm.addEventListener("submit", createBusiness);
campaignForm.addEventListener("submit", createCampaign);
deliveryForm.addEventListener("submit", saveDelivery);
creditForm.addEventListener("submit", addCredits);
userForm.addEventListener("submit", createUser);
refreshButton.addEventListener("click", loadWorkspace);
businessFilter.addEventListener("change", async (event) => {
  state.selectedBusinessId = event.target.value;
  campaignBusinessId.value = event.target.value;
  userBusinessId.value = event.target.value;
  await loadBusinessSummary(state.selectedBusinessId);
  await loadCampaigns();
});
markReadyButton.addEventListener("click", markReady);
userRole.addEventListener("change", syncUserRoleFields);
logoutButton.addEventListener("click", () => {
  session = null;
  localStorage.removeItem(SESSION_KEY);
  renderShell();
});

syncUserRoleFields();
renderShell();
