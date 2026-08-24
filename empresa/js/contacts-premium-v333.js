/* global api, apiSafe, authHeaders, bindContactDirectoryControls, closeCustomerCsvImportModal,
  escapeHtml, formatDateShort, leadDirectoryAudience, leadDirectoryAudienceLabel,
  leadDirectoryChannel, leadDirectoryCurrentFilters, leadDirectoryFilterOptionMarkup,
  leadDirectoryFilterOptions, leadDirectoryFilteredResult, leadDirectoryHasCommercialPotential,
  leadDirectoryIsCustomer, leadDirectoryMetadata, leadDirectorySegmentRows, leadDirectorySalesSummary,
  leadOriginText, leadPriorityChipClass, money, openLeadDetail, renderLeadsView, session,
  setButtonLoading, setContactCenterTab, showFeedback, state, syncLeadDirectoryAudienceTabs */

(() => {
  const visibleContactTabs = ["overview", "directory", "manual", "agenda"];
  const csvState = { file: null, text: "", preview: null, importing: false, batchId: "", idempotencyKey: "", lastFocus: null };

  state.leadDirectoryVisibleLimit = Number(state.leadDirectoryVisibleLimit || 24);
  state.leadDirectoryAudienceTotals = state.leadDirectoryAudienceTotals || { customers: 0, leads: 0 };
  state.leadDirectoryAudienceLoading = state.leadDirectoryAudienceLoading || { customers: false, leads: false };

  normalizeContactCenterTab = (tab = "directory") => visibleContactTabs.includes(tab) ? tab : "directory";

  function prepareContactCenter() {
    visibleContactTabs.forEach((key) => {
      document.querySelectorAll(`[data-contact-center-tab="${key}"]`).forEach((button) => {
        button.hidden = false;
        button.removeAttribute("hidden");
      });
    });
    const summary = document.getElementById("contactCenterSummaryGrid");
    const overview = document.querySelector('[data-contact-center-panel="overview"]');
    if (summary && overview && summary.parentElement !== overview) overview.prepend(summary);
    const collector = document.getElementById("rmsCollectorModal");
    const intro = collector?.querySelector(".modal-head p");
    const identityHelp = document.getElementById("rmsCollectorLeadDocumentInput")?.parentElement?.querySelector("small");
    const identityNotice = collector?.querySelector(".rms-collector-identity-notice");
    if (intro) intro.textContent = "Registra nombre, un medio de contacto y la identificación necesaria para reconocer al lead y evitar duplicados.";
    if (identityHelp) identityHelp.textContent = "Obligatorio para ingresar el lead al Recolector RMS.";
    if (identityNotice) identityNotice.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">badge</span>Tipo y número de documento requeridos para reconocer al lead y evitar duplicados.';
  }

  const premiumLoadLeadCrmData = async (options = {}) => {
    if (!session?.user?.business_id) {
      state.leadCrmRows = [];
      state.leadCrmLoaded = true;
      return;
    }
    if (state.leadCrmLoaded && !options.force) return;
    if (state.leadCrmLoading && !options.force) return;
    state.leadCrmLoading = true;
    try {
      const [customerData, leadData] = await Promise.all([
        apiSafe("/api/business/leads/crm?audience_type=CLIENT&limit=120&offset=0", { headers: authHeaders(), noClientCache: Boolean(options.force) }, { leads: [], pagination: { total: 0 } }),
        apiSafe("/api/business/leads/crm?audience_type=LEAD&limit=120&offset=0", { headers: authHeaders(), noClientCache: Boolean(options.force) }, { leads: [], pagination: { total: 0 } }),
      ]);
      state.leadCrmRows = [...(customerData.leads || []), ...(leadData.leads || [])];
      state.leadDirectoryAudienceTotals = {
        customers: Number(customerData.pagination?.total || 0),
        leads: Number(leadData.pagination?.total || 0),
      };
      state.leadCrmPagination = {
        total: state.leadDirectoryAudienceTotals.customers + state.leadDirectoryAudienceTotals.leads,
        limit: 240,
        offset: 0,
        has_more: Boolean(customerData.pagination?.has_more || leadData.pagination?.has_more),
      };
      state.leadDirectoryVisibleLimit = 24;
      state.leadCrmLoaded = true;
    } finally {
      state.leadCrmLoading = false;
    }
  };
  loadLeadCrmData = premiumLoadLeadCrmData;

  bindContactDirectoryControls = (board) => {
    const filters = leadDirectoryCurrentFilters();
    const searchInput = board.querySelector("#contactDirectorySearchInput");
    const signalFilter = board.querySelector("#contactDirectorySignalFilter");
    const sortSelect = board.querySelector("#contactDirectorySortSelect");
    const clearButton = board.querySelector("#contactDirectoryClearFilters");
    const refreshMatches = () => {
      const audience = leadDirectoryAudience();
      const { baseRows, filteredRows, sortedRows } = leadDirectoryFilteredResult(state.leadCrmRows || [], audience);
      const visibleRows = sortedRows.slice(0, Math.max(24, Number(state.leadDirectoryVisibleLimit || 24)));
      const audienceTotal = Number(state.leadDirectoryAudienceTotals?.[audience] || baseRows.length);
      const hasFilters = Boolean(String(filters.search || "").trim() || filters.signal);
      const empty = audience === "customers"
        ? (hasFilters ? "No hay clientes que coincidan con los filtros." : "Aún no hay clientes con una venta registrada.")
        : (hasFilters ? "No hay leads que coincidan con los filtros." : "Aún no hay leads activos.");
      const list = board.querySelector(".contact-directory-list");
      if (list) {
        list.innerHTML = visibleRows.length
          ? visibleRows.map((item) => premiumCard(item, audience === "customers" ? "customer" : "lead")).join("")
          : `<div class="empty-state compact">${escapeHtml(empty)}</div>`;
        list.querySelectorAll("[data-lead-id]").forEach((row) => {
          const open = () => openLeadDetail({ id: row.dataset.leadId, source_type: row.dataset.sourceType || "PLAYER" });
          row.addEventListener("click", open);
          row.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); open(); } });
        });
      }
      const note = board.querySelector(".contact-directory-result-note");
      if (note) note.textContent = `Mostrando ${visibleRows.length.toLocaleString("es-CO")} de ${filteredRows.length.toLocaleString("es-CO")} coincidencias cargadas · ${audienceTotal.toLocaleString("es-CO")} ${leadDirectoryAudienceLabel(audience).toLowerCase()} en total.`;
      if (clearButton) clearButton.disabled = !(hasFilters || filters.sort !== "recommended");
      const more = board.querySelector(".contact-directory-more");
      if (more) more.hidden = !(visibleRows.length < filteredRows.length || baseRows.length < audienceTotal);
    };
    searchInput?.addEventListener("input", () => {
      filters.search = searchInput.value;
      refreshMatches();
    });
    signalFilter?.addEventListener("change", () => {
      filters.signal = signalFilter.value;
      refreshMatches();
    });
    sortSelect?.addEventListener("change", () => {
      filters.sort = sortSelect.value || "recommended";
      refreshMatches();
    });
    clearButton?.addEventListener("click", () => {
      filters.search = "";
      filters.signal = "";
      filters.sort = "recommended";
      if (searchInput) searchInput.value = "";
      if (signalFilter) signalFilter.value = "";
      if (sortSelect) sortSelect.value = "recommended";
      refreshMatches();
      searchInput?.focus();
    });
  };

  const baseSortRows = leadDirectorySortRows;
  leadDirectorySortRows = (rows = [], sortKey = "recommended") => {
    if (sortKey === "purchase_recent") return rows.slice().sort((a, b) => new Date(b.last_purchase_at || 0) - new Date(a.last_purchase_at || 0) || String(a.name || "").localeCompare(String(b.name || ""), "es"));
    if (sortKey === "purchase_count") return rows.slice().sort((a, b) => Number(b.purchase_count || 0) - Number(a.purchase_count || 0) || String(a.name || "").localeCompare(String(b.name || ""), "es"));
    return baseSortRows(rows, sortKey);
  };

  function premiumCard(item = {}, segment = "lead") {
    const isCustomer = segment === "customer" || leadDirectoryIsCustomer(item);
    const sales = leadDirectorySalesSummary(item);
    const metadata = leadDirectoryMetadata(item);
    const company = String(item.company || metadata.manual_company || "").trim() || "Sin empresa";
    const channel = String(item.preferred_channel || leadDirectoryChannel(item) || "").trim() || "Sin canal";
    const owner = String(metadata.commercial_owner_name || "").trim() || "Sin responsable";
    const stateLabel = String(item.commercial_status_label || item.commercial_status || (isCustomer ? "Cliente" : "Lead"));
    const nextAction = String(item.recommended_action || (isCustomer ? "Revisar recompra o postventa" : "Definir siguiente contacto"));
    return `<article class="contact-directory-card-row" role="button" tabindex="0" data-lead-id="${escapeHtml(item.id)}" data-source-type="${escapeHtml(item.source_type || "PLAYER")}" aria-label="Abrir ficha comercial de ${escapeHtml(item.name || "contacto")}">
      <div class="contact-directory-name"><span><strong>${escapeHtml(item.name || "Contacto sin nombre")}</strong><small>${escapeHtml(leadDirectoryContactLine(item))}</small></span><span class="contact-directory-badges"><span class="status-chip ${isCustomer ? "ok" : leadPriorityChipClass(item.care_priority)}">${isCustomer ? "Cliente" : escapeHtml(item.care_priority_label || "Lead")}</span></span></div>
      <div class="contact-directory-cell"><strong>${escapeHtml(company)}</strong><small>${escapeHtml(channel)}</small></div>
      <div class="contact-directory-cell"><strong>${escapeHtml(isCustomer ? sales.label : stateLabel)}</strong><small>${escapeHtml(isCustomer ? sales.meta : leadOriginText(item))}</small></div>
      <div class="contact-directory-cell"><strong>${escapeHtml(nextAction)}</strong><small>${escapeHtml(`${owner} · ${stateLabel}`)}</small></div>
      <span class="contact-directory-open">Abrir <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></span>
    </article>`;
  }
  leadDirectoryCardMarkup = premiumCard;

  async function loadMoreRows() {
    const audience = leadDirectoryAudience();
    const loaded = leadDirectorySegmentRows(state.leadCrmRows || [], audience);
    const total = Number(state.leadDirectoryAudienceTotals?.[audience] || loaded.length);
    state.leadDirectoryVisibleLimit = Number(state.leadDirectoryVisibleLimit || 24) + 24;
    if (state.leadDirectoryVisibleLimit <= loaded.length || loaded.length >= total || state.leadDirectoryAudienceLoading[audience]) {
      renderContactDirectoryCards(state.leadCrmRows || []);
      return;
    }
    state.leadDirectoryAudienceLoading[audience] = true;
    const button = document.getElementById("contactDirectoryLoadMore");
    if (button) setButtonLoading(button, true, "Cargando...");
    try {
      const type = audience === "customers" ? "CLIENT" : "LEAD";
      const data = await api(`/api/business/leads/crm?audience_type=${type}&limit=120&offset=${loaded.length}`, { headers: authHeaders(), noClientCache: true });
      const keys = new Set((state.leadCrmRows || []).map((item) => `${item.source_type || "PLAYER"}:${item.id}`));
      (data.leads || []).forEach((item) => {
        const key = `${item.source_type || "PLAYER"}:${item.id}`;
        if (!keys.has(key)) { state.leadCrmRows.push(item); keys.add(key); }
      });
      state.leadDirectoryAudienceTotals[audience] = Number(data.pagination?.total || total);
    } catch (error) {
      showFeedback(error.message || "No se pudieron cargar más contactos.", "error", { title: "Contactos" });
    } finally {
      state.leadDirectoryAudienceLoading[audience] = false;
      renderContactDirectoryCards(state.leadCrmRows || []);
    }
  }

  function premiumRenderDirectory(rows = state.leadCrmRows || []) {
    prepareContactCenter();
    const card = document.querySelector(".lead-directory-card");
    if (!card) return;
    const tabs = document.getElementById("leadDirectoryAudienceTabs");
    let board = document.getElementById("contactDirectoryVisualBoard");
    if (!board) {
      board = document.createElement("section");
      board.id = "contactDirectoryVisualBoard";
      board.className = "contact-directory-visual-board";
      if (tabs?.parentElement === card) card.insertBefore(board, tabs.nextSibling);
      else card.prepend(board);
    }
    const allRows = Array.isArray(rows) ? rows : [];
    const customers = allRows.filter(leadDirectoryIsCustomer);
    const leads = allRows.filter(leadDirectoryHasCommercialPotential);
    const audience = leadDirectoryAudience();
    const filters = leadDirectoryCurrentFilters();
    const options = leadDirectoryFilterOptions(audience);
    if (!options.some(([value]) => String(value) === String(filters.signal || ""))) filters.signal = "";
    const { baseRows, filteredRows, sortedRows } = leadDirectoryFilteredResult(allRows, audience);
    const visibleRows = sortedRows.slice(0, Math.max(24, Number(state.leadDirectoryVisibleLimit || 24)));
    const customersTotal = Number(state.leadDirectoryAudienceTotals.customers || customers.length);
    const leadsTotal = Number(state.leadDirectoryAudienceTotals.leads || leads.length);
    const audienceTotal = audience === "customers" ? customersTotal : leadsTotal;
    const loadedRevenue = customers.reduce((sum, item) => sum + Number(item.total_spent || 0), 0);
    const followUps = allRows.filter((item) => ["HIGH", "URGENT"].includes(String(item.care_priority || item.priority || "").toUpperCase())).length;
    const inactiveCustomers = customers.filter((item) => { const date = new Date(item.last_purchase_at || item.last_interaction_at || 0).getTime(); return date > 0 && Date.now() - date > 90 * 86400000; }).length;
    const hasFilters = Boolean(String(filters.search || "").trim() || filters.signal);
    const empty = audience === "customers" ? (hasFilters ? "No hay clientes que coincidan con los filtros." : "Aún no hay clientes con una venta registrada.") : (hasFilters ? "No hay leads que coincidan con los filtros." : "Aún no hay leads activos.");
    syncLeadDirectoryAudienceTabs(allRows);
    document.querySelectorAll("[data-lead-directory-audience]").forEach((button) => {
      const count = button.dataset.leadDirectoryAudience === "customers" ? customersTotal : leadsTotal;
      const small = button.querySelector("small");
      if (small) small.textContent = button.dataset.leadDirectoryAudience === "customers" ? `${count.toLocaleString("es-CO")} clientes con compra` : `${count.toLocaleString("es-CO")} oportunidades abiertas`;
    });
    board.innerHTML = `<div class="contact-directory-hero">
      <div><h3>${audience === "customers" ? "Clientes" : "Leads"}</h3><p>${audience === "customers" ? "Compradores respaldados por ventas reales. La ficha existente reúne compras, beneficios, activaciones, comunicaciones, notas y movimientos." : "Prospectos sin compra registrada. Prioriza la siguiente acción sin confundir intención con conversión."}</p></div>
      <div class="contact-directory-hero-actions">${audience === "customers" ? '<button class="solid-button" id="customerCsvImportOpenButton" type="button"><span class="material-symbols-outlined" aria-hidden="true">upload_file</span>Importar clientes CSV</button>' : '<button class="solid-button" id="contactDirectoryAddLeadButton" type="button"><span class="material-symbols-outlined" aria-hidden="true">person_add</span>Agregar contacto</button>'}</div>
      <div class="contact-directory-summary" aria-label="Resumen con datos reales"><span><small>Contactos</small><strong>${(customersTotal + leadsTotal).toLocaleString("es-CO")}</strong></span><span><small>Clientes con compras</small><strong>${customersTotal.toLocaleString("es-CO")}</strong></span><span><small>Leads activos</small><strong>${leadsTotal.toLocaleString("es-CO")}</strong></span><span><small>Seguimiento pendiente</small><strong>${followUps.toLocaleString("es-CO")}</strong></span><span><small>Revenue cargado</small><strong>${escapeHtml(money(loadedRevenue))}</strong></span>${audience === "customers" ? `<span><small>Sin actividad 90 días</small><strong>${inactiveCustomers.toLocaleString("es-CO")}</strong></span>` : ""}</div>
    </div>
    <section class="contact-directory-toolbar" aria-label="Búsqueda y filtros del directorio"><label class="contact-directory-search-control"><span class="material-symbols-outlined" aria-hidden="true">search</span><input id="contactDirectorySearchInput" type="search" value="${escapeHtml(filters.search || "")}" placeholder="Buscar nombre, documento, correo, teléfono o empresa"></label><label class="contact-directory-select-control"><span>Filtro</span><select id="contactDirectorySignalFilter">${leadDirectoryFilterOptionMarkup(options, filters.signal)}</select></label><label class="contact-directory-select-control"><span>Ordenar</span><select id="contactDirectorySortSelect">${leadDirectoryFilterOptionMarkup([["recommended","Recomendado"],["purchase_recent","Compra más reciente"],["purchase_count","Cantidad de compras"],["revenue","Valor acumulado"],["priority","Prioridad"],["activations","Activaciones"],["tickets","Tickets activos"],["name","Nombre A-Z"]], filters.sort || "recommended")}</select></label><button class="ghost-button contact-directory-clear" id="contactDirectoryClearFilters" type="button" ${hasFilters || filters.sort !== "recommended" ? "" : "disabled"}>Limpiar</button><small class="contact-directory-result-note" aria-live="polite">Mostrando ${visibleRows.length.toLocaleString("es-CO")} de ${filteredRows.length.toLocaleString("es-CO")} coincidencias cargadas · ${audienceTotal.toLocaleString("es-CO")} ${leadDirectoryAudienceLabel(audience).toLowerCase()} en total.</small></section>
    <div class="contact-directory-list-head" aria-hidden="true"><span>Contacto</span><span>Empresa / canal</span><span>${audience === "customers" ? "Historial comercial" : "Estado"}</span><span>Próxima acción / responsable</span><span>Ficha</span></div><div class="contact-directory-list contact-directory-unified-list">${visibleRows.length ? visibleRows.map((item) => premiumCard(item, audience === "customers" ? "customer" : "lead")).join("") : `<div class="empty-state compact">${escapeHtml(empty)}</div>`}</div>${(visibleRows.length < filteredRows.length || baseRows.length < audienceTotal) ? '<div class="contact-directory-more"><button class="ghost-button" id="contactDirectoryLoadMore" type="button">Cargar más</button></div>' : ""}`;
    const pagination = document.getElementById("leadCrmPaginationLabel");
    if (pagination) pagination.textContent = `${(customersTotal + leadsTotal).toLocaleString("es-CO")} contactos`;
    board.querySelectorAll("[data-lead-id]").forEach((row) => {
      const open = () => openLeadDetail({ id: row.dataset.leadId, source_type: row.dataset.sourceType || "PLAYER" });
      row.addEventListener("click", open);
      row.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); open(); } });
    });
    board.querySelector("#customerCsvImportOpenButton")?.addEventListener("click", openCsvModal);
    board.querySelector("#contactDirectoryAddLeadButton")?.addEventListener("click", () => setContactCenterTab("manual"));
    board.querySelector("#contactDirectoryLoadMore")?.addEventListener("click", loadMoreRows);
    bindContactDirectoryControls(board);
  }
  renderContactDirectoryCards = premiumRenderDirectory;

  const elements = () => {
    const get = (id) => document.getElementById(id);
    return { modal:get("customerCsvImportModal"),card:document.querySelector("#customerCsvImportModal .customer-csv-modal-card"),close:get("customerCsvImportClose"),cancel:get("customerCsvCancelButton"),template:get("customerCsvTemplateButton"),dropzone:get("customerCsvDropzone"),input:get("customerCsvFileInput"),summary:get("customerCsvFileSummary"),name:get("customerCsvFileName"),size:get("customerCsvFileSize"),remove:get("customerCsvFileRemove"),progress:get("customerCsvProgress"),counters:get("customerCsvCounters"),previewSection:get("customerCsvPreviewSection"),previewBody:get("customerCsvPreviewBody"),result:get("customerCsvResult"),message:get("customerCsvMessage"),submit:get("customerCsvSubmitButton"),errors:get("customerCsvErrorsButton") };
  };
  function message(text = "", type = "") { const node = elements().message; if (node) { node.textContent = text; node.className = `form-message customer-csv-message ${type}`.trim(); } }
  function progress(percent = 0, label = "") { const node = elements().progress; if (!node) return; node.classList.toggle("hidden", percent <= 0); node.style.setProperty("--csv-progress", `${Math.max(0,Math.min(100,percent))}%`); node.setAttribute("aria-valuenow", String(Math.round(percent))); if (label && node.querySelector("small")) node.querySelector("small").textContent = label; }
  function resetFile() { const ui=elements(); Object.assign(csvState,{file:null,text:"",preview:null,batchId:"",idempotencyKey:""}); if(ui.input)ui.input.value=""; [ui.summary,ui.counters,ui.previewSection,ui.result,ui.errors].forEach((node)=>node?.classList.add("hidden")); if(ui.submit)ui.submit.disabled=true; progress(0); message(""); }
  function openCsvModal() { const ui=elements(); if(!ui.modal)return; csvState.lastFocus=document.activeElement; resetFile(); ui.modal.classList.remove("hidden"); ui.modal.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); requestAnimationFrame(()=>ui.card?.focus()); }
  function closeCsvModal() { const ui=elements(); if(!ui.modal||csvState.importing)return; ui.modal.classList.add("hidden"); ui.modal.setAttribute("aria-hidden","true"); document.body.classList.remove("modal-open"); csvState.lastFocus?.focus?.(); }
  async function readCsvText(file) { const utf8=await file.text(); if(!utf8.includes("\uFFFD"))return utf8; return new TextDecoder("windows-1252").decode(await file.arrayBuffer()); }
  function renderPreview(data = {}) {
    const ui = elements();
    ui.counters.innerHTML = [
      [data.total_rows, "Filas"],
      [data.customer_rows, "Clientes listos"],
      [data.customer_history_pending_rows, "Historial pendiente"],
      [data.duplicate_rows, "Duplicadas"],
      [data.invalid_rows, "Con errores"],
    ].map(([value, label]) => `<article><strong>${Number(value || 0).toLocaleString("es-CO")}</strong><small>${label}</small></article>`).join("");
    ui.counters.classList.remove("hidden");
    ui.previewBody.innerHTML = (data.rows || []).slice(0, 8).map((row) => {
      const raw = row.data || {};
      const isCustomer = row.status === "VALID_CUSTOMER";
      const tone = isCustomer ? "ok" : row.status === "DUPLICATE" ? "pending" : "danger";
      const label = isCustomer ? (row.normalized?.has_commercial_evidence ? "Cliente con historial" : "Cliente · historial pendiente") : row.status === "DUPLICATE" ? "Duplicada" : "Error";
      const detail = [...(row.reasons || []), ...(row.warnings || [])].join(" ");
      const owner = row.normalized?.commercial_owner?.name || raw.responsable_comercial || "Sin responsable";
      return `<tr><td>${row.row_number}</td><td><strong>${escapeHtml([raw.nombre, raw.apellido].filter(Boolean).join(" ") || "—")}</strong><small>${escapeHtml(`${raw.empresa || "Sin empresa"} · Responsable: ${owner}`)}</small></td><td>${escapeHtml(raw.numero_documento || raw.correo || raw.telefono || "Sin identificador")}</td><td>${escapeHtml(isCustomer ? `${raw.total_compras || 0} compra(s) · ${raw.valor_acumulado || "0"}` : "Completar después")}</td><td><span class="status-chip ${tone}">${label}</span><small>${escapeHtml(detail)}</small></td></tr>`;
    }).join("");
    ui.previewSection.classList.remove("hidden");
    ui.submit.disabled = !Number(data.valid_rows || 0);
    const ignored = (data.ignored_headers || []).length ? ` Se ignorarán columnas no reconocidas: ${data.ignored_headers.join(", ")}.` : "";
    message(data.valid_rows ? `Archivo validado con separador ${data.separator || ","}.${ignored}` : "No hay filas válidas para importar.", data.valid_rows ? "success" : "error");
  }
  async function readFile(file) { const ui=elements(); resetFile(); if(!file)return; if(!/\.csv$/i.test(file.name)){message("Selecciona un archivo con extensión .csv.","error");return;} if(!file.size||file.size>2*1024*1024){message("El CSV debe pesar entre 1 byte y 2 MB.","error");return;} csvState.file=file;csvState.idempotencyKey=crypto.randomUUID();ui.name.textContent=file.name;ui.size.textContent=`${(file.size/1024).toLocaleString("es-CO",{maximumFractionDigits:1})} KB`;ui.summary.classList.remove("hidden");progress(25,"Leyendo archivo...");try{csvState.text=await readCsvText(file);progress(60,"Validando encabezados, evidencia y duplicados...");csvState.preview=await api("/api/business/contacts/customers/import-csv/preview",{method:"POST",headers:authHeaders(),body:JSON.stringify({file_name:file.name,file_size:file.size,mime_type:file.type||"text/csv",csv_text:csvState.text})});progress(100,"Validación completada");renderPreview(csvState.preview);setTimeout(()=>progress(0),500);}catch(error){progress(0);message(error.message||"No se pudo validar el CSV.","error");} }
  async function download(path,name) { const response=await fetch(path,{headers:authHeaders()});if(!response.ok)throw new Error(`No se pudo descargar el archivo (${response.status}).`);const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url); }
  async function submit() {
    const ui = elements();
    if (!csvState.file || !csvState.preview?.valid_rows || csvState.importing) return;
    csvState.importing = true;
    ui.submit.disabled = true;
    ui.cancel.disabled = true;
    ui.close.disabled = true;
    setButtonLoading(ui.submit, true, "Importando...");
    progress(35, "Creando clientes y contactos por lotes de 50...");
    try {
      const result = await api("/api/business/contacts/customers/import-csv", { method: "POST", headers: authHeaders(), body: JSON.stringify({ file_name: csvState.file.name, file_size: csvState.file.size, mime_type: csvState.file.type || "text/csv", csv_text: csvState.text, idempotency_key: csvState.idempotencyKey }) });
      const batch = result.batch || {};
      csvState.batchId = batch.id || "";
      progress(100, "Importación completada");
      const created = (result.rows || []).filter((row) => row.outcome === "CREATED");
      ui.result.innerHTML = `<strong>Lote procesado</strong><div class="customer-csv-result-grid"><span><strong>${Number(batch.total_rows || 0)}</strong><small>filas procesadas</small></span><span><strong>${Number(batch.created_customer_count || 0)}</strong><small>clientes creados</small></span><span><strong>${Number(batch.customer_history_pending_count || 0)}</strong><small>historial pendiente</small></span><span><strong>${Number(batch.duplicate_count || 0)}</strong><small>duplicados omitidos</small></span><span><strong>${Number(batch.error_count || 0)}</strong><small>filas con errores</small></span></div>${created.length ? `<div class="customer-csv-created-links">${created.slice(0, 8).map((row) => `<button class="text-button" type="button" data-open-imported-customer="${escapeHtml(row.contact_source_id)}" data-source-type="${escapeHtml(row.contact_source_type || "MANUAL")}">Abrir cliente de la fila ${row.row_number}</button>`).join("")}</div>` : ""}`;
      ui.result.classList.remove("hidden");
      ui.errors.classList.toggle("hidden", !(Number(batch.duplicate_count || 0) + Number(batch.error_count || 0)));
      message("Clientes actualizados sin recargar la página.", "success");
      state.leadCrmLoaded = false;
      await premiumLoadLeadCrmData({ force: true, quiet: true });
      renderLeadsView();
      ui.result.querySelectorAll("[data-open-imported-customer]").forEach((button) => button.addEventListener("click", () => { closeCsvModal(); openLeadDetail({ id: button.dataset.openImportedCustomer, source_type: button.dataset.sourceType || "MANUAL" }); }));
    } catch (error) {
      progress(0);
      message(error.message || "No se pudo completar la importación.", "error");
      ui.submit.disabled = false;
    } finally {
      csvState.importing = false;
      ui.cancel.disabled = false;
      ui.close.disabled = false;
      setButtonLoading(ui.submit, false);
      ui.submit.disabled = Boolean(csvState.batchId);
      setTimeout(() => progress(0), 600);
    }
  }
  function initCsv() { const ui=elements();if(!ui.modal||ui.modal.dataset.bound==="true")return;ui.modal.dataset.bound="true";ui.close.addEventListener("click",closeCsvModal);ui.cancel.addEventListener("click",closeCsvModal);ui.remove.addEventListener("click",resetFile);ui.submit.addEventListener("click",submit);ui.template.addEventListener("click",()=>download("/api/business/contacts/customers/import-template.csv","plantilla-clientes.csv").catch((error)=>message(error.message,"error")));ui.errors.addEventListener("click",()=>csvState.batchId&&download(`/api/business/contacts/customers/imports/${encodeURIComponent(csvState.batchId)}/errors.csv`,`errores-clientes-${csvState.batchId}.csv`).catch((error)=>message(error.message,"error")));ui.input.addEventListener("change",()=>readFile(ui.input.files?.[0]));ui.dropzone.addEventListener("keydown",(event)=>{if(["Enter"," "].includes(event.key)){event.preventDefault();ui.input.click();}});["dragenter","dragover"].forEach((type)=>ui.dropzone.addEventListener(type,(event)=>{event.preventDefault();ui.dropzone.classList.add("is-dragover");}));["dragleave","drop"].forEach((type)=>ui.dropzone.addEventListener(type,(event)=>{event.preventDefault();ui.dropzone.classList.remove("is-dragover");}));ui.dropzone.addEventListener("drop",(event)=>readFile(event.dataTransfer?.files?.[0]));ui.modal.addEventListener("click",(event)=>{if(event.target===ui.modal)closeCsvModal();});ui.modal.addEventListener("keydown",(event)=>{if(event.key==="Escape"){event.preventDefault();closeCsvModal();return;}if(event.key!=="Tab")return;const focusable=Array.from(ui.modal.querySelectorAll('button:not([disabled]):not(.hidden),input:not([disabled]),[tabindex="0"]')).filter((node)=>!node.closest(".hidden"));if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}); }

  prepareContactCenter();
  initCsv();
  document.querySelectorAll("[data-lead-directory-audience]").forEach((button) => button.addEventListener("click", () => { state.leadDirectoryVisibleLimit = 24; }));
  document.addEventListener("click", (event) => {
    const nav = event.target.closest('[data-view="leads"], [data-contact-center-nav]');
    if (!nav) return;
    setTimeout(() => {
      prepareContactCenter();
      if (state.currentView === "leads" && (!state.leadCrmLoaded || !state.leadDirectoryAudienceTotals.customers && !state.leadDirectoryAudienceTotals.leads)) {
        state.leadCrmLoaded = false;
        premiumLoadLeadCrmData({ force: true, quiet: true }).then(renderLeadsView).catch((error) => showFeedback(error.message, "error"));
      }
    }, 0);
  });
})();
