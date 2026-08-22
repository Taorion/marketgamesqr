(() => {
  "use strict";

  const originalSummaryMarkup = rmsCommercialStationSummaryMarkup;
  let summaryLoading = false;
  let summaryLoadedAt = 0;

  function selectedActivationRows() {
    return rmsActivationBulkSelectedRows();
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function dispatchKey(payload) {
    const signature = JSON.stringify({ activation_id: payload.activation_id, subject: payload.subject, message: payload.message, recipients: payload.recipients.map((item) => `${item.source_type}:${item.source_id}`).sort() });
    const storageKey = `qori:rms-activation-email:${activeBusinessId() || "business"}`;
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || "null"); } catch (_error) { saved = null; }
    if (saved?.signature === signature && saved?.key) return saved.key;
    const key = crypto.randomUUID?.() || `rms-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ signature, key })); } catch (_error) { /* storage can be disabled */ }
    return key;
  }

  async function refreshStationEmailSummary(force = false) {
    if (summaryLoading || (!force && Date.now() - summaryLoadedAt < 5000)) return;
    summaryLoading = true;
    try {
      const response = await apiSafe("/api/business/rms-machine/activation-email/summary", { headers: authHeaders() }, { summary: {} });
      state.rmsActivationEmailSummary = response.summary || {};
      summaryLoadedAt = Date.now();
      if (document.querySelector('#rmsStationWorkspace [data-rms-station-summary][aria-expanded="true"]')) renderRmsStationOnly();
    } finally {
      summaryLoading = false;
    }
  }

  async function loadActivationCatalog(select) {
    if (!select || select.dataset.loaded === "1") return;
    select.dataset.loaded = "1";
    select.disabled = true;
    try {
      const activations = await listRmsActivationCatalogOptions();
      select.innerHTML = `<option value="">Selecciona una activación publicada</option>${activations.map((activation) => {
        const url = activation.public_url || activation.share_url || activation.claim_url || "";
        const label = activation.title || activation.name || "Activación publicada";
        return `<option value="${escapeHtml(activation.id)}" data-url="${escapeHtml(url)}">${escapeHtml(label)} · ${escapeHtml(activation.campaign_name || activation.type || "Activación")}</option>`;
      }).join("")}`;
      select.disabled = !activations.length;
      if (!activations.length) select.innerHTML = '<option value="">No hay activaciones publicadas</option>';
    } catch (_error) {
      select.innerHTML = '<option value="">No se pudieron cargar las activaciones</option>';
    }
  }

  rmsActivationBulkComposerMarkup = function rmsActivationBulkComposerMarkupResend(selectedRows = []) {
    const queue = state.rmsActivationBulkQueue?.phase === "clasificacion" ? state.rmsActivationBulkQueue : null;
    const result = queue?.results || {};
    return `<section class="rms-activation-bulk-composer" aria-label="Envío colectivo de Activación 1">
      <header><div><span class="mono-label">ENVÍO COLECTIVO CON RESEND</span><h4>Una activación para ${selectedRows.length.toLocaleString("es-CO")} lead${selectedRows.length === 1 ? "" : "s"}</h4><p>Una pulsación envía un correo individual a cada destinatario, deduplica direcciones y conserva el resultado por lead.</p></div><span class="material-symbols-outlined" aria-hidden="true">mark_email_read</span></header>
      <div class="rms-activation-bulk-grid">
        <label class="span-2"><span>Activación publicada</span><select data-rms-resend-activation-catalog required><option value="">Cargando activaciones…</option></select></label>
        <label class="span-2"><span>Asunto</span><input type="text" maxlength="220" value="Tenemos una activación preparada para ti" data-rms-resend-subject></label>
        <label class="span-2"><span>URL o CTA</span><input type="url" readonly placeholder="Se completa con la activación" data-rms-resend-action-url></label>
        <label class="span-2"><span>Contenido del correo</span><textarea rows="5" data-rms-resend-message>Hola {{nombre}},\n\nTenemos una propuesta preparada para ti. ¿Te la comparto y resolvemos el siguiente paso?</textarea><small>Usa <code>{{nombre}}</code> para personalizar cada correo.</small></label>
      </div>
      <label class="rms-activation-bulk-consent"><input type="checkbox" data-rms-resend-consent> Confirmo que todos los leads seleccionados autorizaron contacto comercial.</label>
      <div class="rms-activation-bulk-actions"><button class="solid-button" type="button" data-rms-prepare-bulk-activation ${selectedRows.length && !queue?.processing ? "" : "disabled"}><span class="material-symbols-outlined" aria-hidden="true">send</span>${queue?.processing ? "Enviando…" : "Enviar activación a seleccionados"}</button><button class="ghost-button" type="button" data-rms-open-resend-settings>Configurar remitente</button><button class="ghost-button" type="button" data-rms-close-bulk-activation>Cerrar</button></div>
      ${queue?.results ? `<aside class="rms-activation-bulk-queue" aria-live="polite"><div><strong>${result.accepted || 0} aceptados por Resend · ${result.pending_confirmation || 0} pendientes de confirmación · ${result.failed || 0} fallidos · ${result.skipped || 0} omitidos</strong><small>Aceptado no significa entregado. Sin webhook de email, permanece pendiente de confirmación.</small></div>${result.failed ? '<button class="solid-button compact" type="button" data-rms-dispatch-next-bulk-activation><span class="material-symbols-outlined" aria-hidden="true">refresh</span>Reintentar solo fallidos</button>' : ""}</aside>` : ""}
    </section>`;
  };

  prepareRmsBulkActivation = async function prepareRmsBulkActivationResend(root = rmsStationWorkspace) {
    const rows = selectedActivationRows();
    const activationId = root?.querySelector("[data-rms-resend-activation-catalog]")?.value || "";
    const subject = String(root?.querySelector("[data-rms-resend-subject]")?.value || "").trim();
    const message = String(root?.querySelector("[data-rms-resend-message]")?.value || "").trim();
    const actionUrl = String(root?.querySelector("[data-rms-resend-action-url]")?.value || "").trim();
    const consent = Boolean(root?.querySelector("[data-rms-resend-consent]")?.checked);
    if (!rows.length) return showFeedback("Selecciona al menos un lead.", "info", { title: "Activación 1" });
    if (!activationId) return showFeedback("Selecciona una activación publicada.", "info", { title: "Activación 1" });
    if (!subject || !message) return showFeedback("Completa el asunto y el contenido del correo.", "info", { title: "Activación 1" });
    if (!consent) return showFeedback("Confirma la autorización comercial de los seleccionados.", "info", { title: "Activación 1" });
    if (!rows.some((item) => validEmail(item.email))) return showFeedback("Ningún lead seleccionado tiene un correo válido.", "info", { title: "Activación 1" });
    const payload = { activation_id: activationId, subject, message, action_url: actionUrl || null, recipients: rows.map((item) => ({ source_id: item.source_id, source_type: item.source_type || "PLAYER" })) };
    const idempotencyKey = dispatchKey(payload);
    const button = root?.querySelector("[data-rms-prepare-bulk-activation]");
    if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); button.lastChild.textContent = "Enviando…"; }
    state.rmsActivationBulkQueue = { phase: "clasificacion", processing: true, payload, idempotencyKey };
    showFeedback(`Enviando la activación a ${rows.length.toLocaleString("es-CO")} seleccionados…`, "loading", { title: "Activación 1", timeout: 0 });
    try {
      const response = await api("/api/business/rms-machine/activation-email/bulk-send", { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }) });
      state.rmsActivationEmailSummary = response.station_summary || {};
      state.rmsActivationBulkQueue = { phase: "clasificacion", processing: false, payload, idempotencyKey, results: response.results || {} };
      renderRmsStationOnly();
      const result = response.results || {};
      showFeedback(`${result.accepted || 0} aceptados por Resend · ${result.pending_confirmation || 0} pendientes de confirmación · ${result.failed || 0} fallidos · ${result.skipped || 0} omitidos`, result.failed ? "info" : "success", { title: "Activación 1" });
    } catch (error) {
      state.rmsActivationBulkQueue = { phase: "clasificacion", processing: false, payload, idempotencyKey };
      renderRmsStationOnly();
      throw error;
    }
  };

  dispatchNextRmsBulkActivation = async function retryFailedRmsActivationEmails() {
    const queue = state.rmsActivationBulkQueue;
    if (!queue?.results?.failed || !queue.results.communication_id || queue.processing) return;
    const retryAttempt = Number(queue.retryAttempt || 0) + 1;
    const retryIdempotencyKey = queue.retryIdempotencyKey
      || `${queue.idempotencyKey}:retry:${retryAttempt}`.slice(0, 180);
    queue.processing = true;
    queue.retryIdempotencyKey = retryIdempotencyKey;
    renderRmsStationOnly();
    try {
      const response = await api("/api/business/rms-machine/activation-email/bulk-send", { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...queue.payload, communication_id: queue.results.communication_id, retry_failed_only: true, idempotency_key: retryIdempotencyKey }) });
      state.rmsActivationEmailSummary = response.station_summary || {};
      state.rmsActivationBulkQueue = { ...queue, processing: false, retryAttempt, retryIdempotencyKey: null, results: response.results || {} };
      renderRmsStationOnly();
    } catch (error) {
      queue.processing = false;
      renderRmsStationOnly();
      throw error;
    }
  };

  rmsCommercialStationSummaryMarkup = function rmsCommercialStationSummaryMarkupWithEmail(rows = [], phase = "") {
    if (phase !== "clasificacion") return originalSummaryMarkup(rows, phase);
    const dispatch = state.rmsActivationEmailSummary || {};
    const selected = rows.filter((item) => (state.rmsMachineSelectedIds || []).includes(item.id)).length;
    const metrics = [["Leads en Activación 1", rows.length], ["Leads seleccionados", selected], ["Correos aceptados por Resend", dispatch.accepted || 0], ["Pendientes de confirmación", dispatch.pending_confirmation || 0], ["Entregados confirmados", dispatch.delivered || 0], ["Fallidos", dispatch.failed || 0], ["Omitidos", dispatch.skipped || 0], ["Leads listos para Evaluación", rows.filter((item) => rmsActivationReadyForEvaluation(item)).length]];
    return `<section class="rms-commercial-station-summary" aria-label="Resumen estación"><header><div><span class="mono-label">Resumen estación</span><h4>Activación 1 · ${rows.length.toLocaleString("es-CO")} leads</h4><p>Aceptado por Resend no significa entregado.</p></div><button class="ghost-button compact" type="button" data-rms-station-summary aria-expanded="true"><span class="material-symbols-outlined" aria-hidden="true">visibility_off</span> Ocultar resumen</button></header><div class="rms-commercial-summary-table-wrap rms-activation-summary-metrics"><table><thead><tr><th>Métrica</th><th>Resultado</th></tr></thead><tbody>${metrics.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td><strong>${Number(value).toLocaleString("es-CO")}</strong></td></tr>`).join("")}</tbody></table></div></section>`;
  };

  moveSelectedRmsActivationsToEvaluation = async function moveSelectedRmsActivationsToEvaluationWithResult() {
    const selectedIds = new Set(state.rmsMachineSelectedIds || []);
    const rows = rmsStationRows("clasificacion", state.rmsMachine?.opportunities || []).filter((item) => selectedIds.has(item.id));
    const ready = rows.filter((item) => rmsActivationReadyForEvaluation(item));
    const omitted = rows.filter((item) => !ready.includes(item));
    if (!rows.length) return showFeedback("Selecciona al menos un lead de Activación 1.", "info", { title: "Activación 1" });
    if (!ready.length) return showFeedback("Los seleccionados todavía no cumplen los requisitos para Evaluación.", "info", { title: "Activación 1" });
    if (!confirm(`¿Confirmas enviar ${ready.length} lead${ready.length === 1 ? "" : "s"} a Evaluación?${omitted.length ? ` ${omitted.length} será omitido por requisitos incompletos.` : ""}`)) return;
    const results = await runBulkRequests(ready, (item) => api("/api/business/rms-machine/lead/phase", { method: "PATCH", headers: authHeaders(), body: JSON.stringify(rmsActivationEvaluationMovePayload(item)) }), { concurrency: 6 });
    const moved = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);
    state.rmsActivationEvaluationResult = { success: moved.length, failed: failed.length, omitted: omitted.length, items: [...results.map((result) => ({ name: result.item?.name || "Lead", status: result.ok ? "Enviado" : "Error", detail: result.ok ? "Movimiento persistido de Activación 1 a Evaluación." : result.error?.message || "No se pudo mover." })), ...omitted.map((item) => ({ name: item.name || "Lead", status: "Omitido", detail: "Falta contacto, seguimiento o respuesta." }))] };
    state.rmsMachineSelectedIds = [...omitted.map((item) => item.id), ...failed.map((result) => result.item.id)];
    state.rmsMachineLoaded = false;
    await loadRmsMachineData({ force: true, quiet: true, lite: true, stationPhase: "clasificacion" });
    openRmsStation("clasificacion", { source: "activation-bulk-evaluation" });
    showFeedback(`${moved.length} enviados a Evaluación · ${failed.length} con error · ${omitted.length} omitidos`, failed.length || omitted.length ? "info" : "success", { title: "Activación 1" });
  };

  function enhanceActivationStation() {
    const workspace = document.getElementById("rmsStationWorkspace");
    if (!workspace || workspace.dataset.stationTheme !== "activation") return;
    refreshStationEmailSummary();
    loadActivationCatalog(workspace.querySelector("[data-rms-resend-activation-catalog]"));
    const actions = workspace.querySelector(".rms-lean-station-actions");
    if (actions && !actions.querySelector("[data-rms-select-visible-activation]")) actions.insertAdjacentHTML("afterbegin", '<button class="ghost-button compact" type="button" data-rms-select-visible-activation><span class="material-symbols-outlined" aria-hidden="true">select_all</span>Seleccionar todos</button>');
    const summaryButton = workspace.querySelector('[data-rms-station-summary][aria-expanded="false"]');
    if (summaryButton) summaryButton.lastChild.textContent = " Ver resumen";
    const evaluationButton = workspace.querySelector("[data-rms-send-selected-activation-evaluation]");
    if (evaluationButton) {
      const count = evaluationButton.textContent.match(/\([^)]*\)\s*$/)?.[0] || "";
      evaluationButton.childNodes[evaluationButton.childNodes.length - 1].textContent = ` Enviar seleccionados a Evaluación ${count}`;
    }
    const priorResult = workspace.querySelector(".rms-activation-bulk-result");
    if (!priorResult && state.rmsActivationEvaluationResult?.items?.length) {
      const result = state.rmsActivationEvaluationResult;
      workspace.querySelector(".rms-lean-station-head")?.insertAdjacentHTML("afterend", `<section class="rms-activation-bulk-result"><header><h4>${result.success} enviados · ${result.failed} con error · ${result.omitted} omitidos</h4><button class="ghost-button compact" type="button" data-rms-hide-evaluation-result>Ocultar</button></header><div class="rms-commercial-summary-table-wrap"><table><thead><tr><th>Lead</th><th>Resultado</th><th>Detalle</th></tr></thead><tbody>${result.items.map((entry) => `<tr><td>${escapeHtml(entry.name)}</td><td>${escapeHtml(entry.status)}</td><td>${escapeHtml(entry.detail)}</td></tr>`).join("")}</tbody></table></div></section>`);
    }
  }

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-rms-resend-activation-catalog]")) document.querySelector("[data-rms-resend-action-url]").value = event.target.selectedOptions[0]?.dataset.url || "";
  });
  document.addEventListener("click", (event) => {
    const selectVisible = event.target.closest("[data-rms-select-visible-activation]");
    if (selectVisible) {
      const visibleIds = [...document.querySelectorAll("#rmsStationWorkspace [data-rms-select]")].map((input) => input.getAttribute("data-rms-select")).filter(Boolean);
      const selected = new Set(state.rmsMachineSelectedIds || []);
      const allSelected = visibleIds.length && visibleIds.every((id) => selected.has(id));
      visibleIds.forEach((id) => allSelected ? selected.delete(id) : selected.add(id));
      state.rmsMachineSelectedIds = [...selected];
      renderRmsStationOnly();
    }
    if (event.target.closest("[data-rms-open-resend-settings]")) { setView("account"); setTimeout(() => document.getElementById("accountEmailConnectionTitle")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80); }
    if (event.target.closest("[data-rms-hide-evaluation-result]")) { state.rmsActivationEvaluationResult = null; renderRmsStationOnly(); }
  });
  new MutationObserver(enhanceActivationStation).observe(document.getElementById("rmsStationWorkspace") || document.body, { childList: true, subtree: true });
  enhanceActivationStation();
})();
