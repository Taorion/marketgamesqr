(() => {
  const refKey = (contact) => `${contact?.source_type || "PLAYER"}:${contact?.source_id || contact?.id || ""}`;
  const esc = (value) => escapeHtml(value == null ? "" : String(value));
  const selectedRecipients = () => {
    const selected = new Set(state.communicationSelectedRefs || []);
    return (state.communicationAudience || []).filter((contact) => selected.has(refKey(contact)));
  };
  const typeLabel = (type) => ({ EMAIL: "Email", SOCIAL: "Publicación", MIXED: "Email + publicación" }[String(type || "").toUpperCase()] || "Comunicación");
  const statusLabel = (status) => ({ DRAFT: "Borrador", READY: "Lista", SENT: "Enviada", ARCHIVED: "Archivada" }[String(status || "").toUpperCase()] || "Borrador");

  async function loadCommunications(options = {}) {
    if (!session?.user?.business_id || state.communicationsLoading || (state.communicationsLoaded && !options.force)) return;
    state.communicationsLoading = true;
    try {
      const data = await api("/api/business/communications", { headers: authHeaders() });
      state.communications = data.communications || [];
      state.communicationsLoaded = true;
      if (!state.selectedCommunicationId && state.communications[0]?.id) state.selectedCommunicationId = state.communications[0].id;
    } finally { state.communicationsLoading = false; }
  }

  async function loadAudience() {
    const query = new URLSearchParams();
    Object.entries(state.communicationAudienceFilters || {}).forEach(([key, value]) => { if (String(value || "").trim()) query.set(key, String(value).trim()); });
    const data = await api(`/api/business/communications/audience${query.toString() ? `?${query}` : ""}`, { headers: authHeaders() });
    state.communicationAudience = data.contacts || [];
    state.communicationAudienceTotal = Number(data.total || state.communicationAudience.length);
    state.communicationAudienceCapped = Boolean(data.capped);
    const shown = new Set(state.communicationAudience.map(refKey));
    state.communicationSelectedRefs = (state.communicationSelectedRefs || []).filter((id) => shown.has(id));
  }

  function renderOptions() {
    const options = (items, label) => (items || []).map((item) => `<option value="${esc(item.id)}">${esc(label(item))}</option>`).join("");
    const campaign = document.getElementById("communicationCampaignInput");
    const channel = document.getElementById("communicationChannelInput");
    const activation = document.getElementById("communicationActivationInput");
    if (campaign) campaign.innerHTML = '<option value="">Sin campaña</option>' + options(state.campaigns, (item) => item.name || item.title || "Campaña");
    if (channel) channel.innerHTML = '<option value="">Sin canal</option>' + options(state.acquisitionChannels, (item) => item.name || item.channel_name || "Canal");
    if (activation) activation.innerHTML = '<option value="">Sin activación</option>' + options(state.triviaLaunchers, (item) => item.title || "Activación");
  }

  function render() {
    const list = document.getElementById("businessCommunicationsList");
    const audience = document.getElementById("communicationAudienceList");
    const summary = document.getElementById("communicationAudienceSummary");
    const selectedSummary = document.getElementById("communicationSelectionSummary");
    const sendBar = document.getElementById("communicationSendBar");
    if (!list || !audience || !summary || !selectedSummary || !sendBar) return;
    const communications = state.communications || [];
    list.innerHTML = communications.length ? communications.map((item) => `<article class="communication-list-item ${String(item.id) === String(state.selectedCommunicationId) ? "is-selected" : ""}" data-communication-select="${esc(item.id)}"><div><span class="mono-label">${esc(typeLabel(item.communication_type))} · ${esc(statusLabel(item.status))}</span><strong>${esc(item.title)}</strong><p>${esc(item.campaign_name || item.channel_name || item.activation_title || "Sin relación comercial")}</p></div><div class="communication-list-item-meta"><strong>${Number(item.recipients_total || 0)}</strong><small>destinatarios</small><span class="material-symbols-outlined">arrow_forward</span></div></article>`).join("") : '<div class="communication-empty-state"><span class="material-symbols-outlined">mail</span><strong>Aún no has creado comunicaciones.</strong><p>Crea una pieza y úsala en email, redes o ambos canales.</p></div>';
    const selected = new Set(state.communicationSelectedRefs || []);
    summary.textContent = `${state.communicationAudienceTotal || state.communicationAudience.length} contactos${state.communicationAudienceCapped ? " · se muestran los primeros 120" : ""}`;
    audience.innerHTML = state.communicationAudience.length ? state.communicationAudience.map((contact) => `<label class="communication-contact-row ${selected.has(refKey(contact)) ? "is-selected" : ""}"><input type="checkbox" data-communication-recipient value="${esc(refKey(contact))}" ${selected.has(refKey(contact)) ? "checked" : ""}><span class="communication-contact-avatar">${esc((contact.name || "C").slice(0, 1).toUpperCase())}</span><span class="communication-contact-copy"><strong>${esc(contact.name || "Contacto sin nombre")}</strong><small>${esc(contact.email || "Sin email")} · ${esc(contact.top_interest || "Sin interés registrado")}</small></span><span class="communication-contact-metrics"><strong>${Number(contact.purchase_count || 0)}</strong><small>compras</small></span></label>`).join("") : '<div class="communication-empty-state compact"><strong>No encontramos contactos con estos filtros.</strong><p>Prueba removiendo un filtro.</p></div>';
    const recipients = selectedRecipients();
    selectedSummary.textContent = `${recipients.length} seleccionado${recipients.length === 1 ? "" : "s"}`;
    const active = communications.find((item) => String(item.id) === String(state.selectedCommunicationId));
    if (!active) { sendBar.innerHTML = '<span class="material-symbols-outlined">touch_app</span><p>Elige una comunicación para preparar su envío.</p>'; return; }
    if (String(active.communication_type).toUpperCase() === "SOCIAL") {
      sendBar.innerHTML = `<span class="material-symbols-outlined">share</span><div><strong>Esta es una publicación para redes</strong><p>Copia el texto y compártelo desde la red que elijas.</p></div><button class="solid-button compact" type="button" data-copy-communication-social="${esc(active.id)}">Copiar publicación</button>`;
      return;
    }
    sendBar.innerHTML = `<span class="material-symbols-outlined">send</span><div><strong>${esc(active.title)}</strong><p>${recipients.length ? `${recipients.length} destinatario${recipients.length === 1 ? "" : "s"} seleccionado${recipients.length === 1 ? "" : "s"}.` : "Selecciona contactos para enviarla."}</p></div><label class="communication-consent"><input id="communicationConsentInput" type="checkbox"> Confirmo que aceptaron recibir comunicaciones.</label><button class="solid-button compact" type="button" data-send-communication="${esc(active.id)}" ${recipients.length ? "" : "disabled"}>Enviar email</button>`;
  }

  function toggleComposer() {
    const type = document.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL";
    document.querySelectorAll(".communication-email-fields").forEach((node) => node.classList.toggle("hidden", type === "SOCIAL"));
    document.querySelectorAll(".communication-social-fields").forEach((node) => node.classList.toggle("hidden", type === "EMAIL"));
    const preview = document.getElementById("communicationComposerPreview");
    if (preview) preview.textContent = type === "SOCIAL" ? "Vista previa de publicación" : "Vista previa de email";
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("communicationComposerMessage");
    const payload = {
      title: form.querySelector("#communicationTitleInput")?.value.trim(), communication_type: form.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL",
      campaign_id: form.querySelector("#communicationCampaignInput")?.value || null, channel_id: form.querySelector("#communicationChannelInput")?.value || null, activation_id: form.querySelector("#communicationActivationInput")?.value || null,
      subject: form.querySelector("#communicationSubjectInput")?.value.trim() || null, email_body: form.querySelector("#communicationEmailBodyInput")?.value.trim() || null, social_copy: form.querySelector("#communicationSocialCopyInput")?.value.trim() || null,
      image_url: form.querySelector("#communicationImageInput")?.value.trim() || null, action_url: form.querySelector("#communicationActionUrlInput")?.value.trim() || null,
    };
    try {
      message.textContent = "Guardando comunicación…";
      const data = await api("/api/business/communications", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      state.communicationsLoaded = false; await loadCommunications({ force: true }); state.selectedCommunicationId = data.communication?.id || state.selectedCommunicationId;
      document.getElementById("communicationComposerModal")?.classList.add("hidden"); render(); showFeedback("La comunicación quedó lista para seleccionar su audiencia.", "success", { title: "Comunicación creada" });
    } catch (error) { message.textContent = error.message || "No se pudo guardar la comunicación."; }
  }

  document.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-open-communication-composer]"); const close = event.target.closest("[data-close-communication-composer]"); const pick = event.target.closest("[data-communication-select]"); const all = event.target.closest("[data-communication-select-loaded]"); const send = event.target.closest("[data-send-communication]"); const copy = event.target.closest("[data-copy-communication-social]");
    if (open) { renderOptions(); document.getElementById("communicationComposerForm")?.reset(); document.getElementById("communicationComposerModal")?.classList.remove("hidden"); toggleComposer(); return; }
    if (close) { document.getElementById("communicationComposerModal")?.classList.add("hidden"); return; }
    if (pick) { state.selectedCommunicationId = pick.dataset.communicationSelect; render(); return; }
    if (all) { state.communicationSelectedRefs = state.communicationAudience.map(refKey); render(); return; }
    if (copy) { const item = state.communications.find((row) => String(row.id) === String(copy.dataset.copyCommunicationSocial)); const content = [item?.social_copy, item?.action_url].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(content); showFeedback("Publicación copiada.", "success", { title: "Texto copiado" }); } catch { window.prompt("Copia esta publicación", content); } return; }
    if (send) { const recipients = selectedRecipients(); if (!document.getElementById("communicationConsentInput")?.checked) { showFeedback("Confirma el consentimiento antes de enviar.", "info", { title: "Consentimiento requerido" }); return; } try { showFeedback("Enviando emails…", "loading", { title: "Comunicación", timeout: 0 }); const data = await api(`/api/business/communications/${send.dataset.sendCommunication}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) }); state.communicationsLoaded = false; await loadCommunications({ force: true }); render(); showFeedback(`Envío finalizado: ${data.summary?.sent || 0} enviados, ${data.summary?.failed || 0} fallidos y ${data.summary?.skipped || 0} sin email.`, "success", { title: "Comunicación enviada" }); } catch (error) { showFeedback(error.message || "No se pudo completar el envío.", "error", { title: "Comunicación" }); } }
  });
  document.addEventListener("change", (event) => { if (event.target.matches("[data-communication-recipient]")) { const selected = new Set(state.communicationSelectedRefs || []); if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value); state.communicationSelectedRefs = Array.from(selected); render(); } if (event.target.matches('input[name="communicationType"]')) toggleComposer(); });
  document.getElementById("communicationAudienceFilters")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; state.communicationAudienceFilters = { search: form.querySelector("#communicationAudienceSearch")?.value.trim() || "", interest: form.querySelector("#communicationAudienceInterest")?.value.trim() || "", city: form.querySelector("#communicationAudienceCity")?.value.trim() || "", has_purchases: form.querySelector("#communicationAudiencePurchases")?.value || "", score_min: form.querySelector("#communicationAudienceScore")?.value || "" }; state.communicationSelectedRefs = []; try { await loadAudience(); render(); } catch (error) { showFeedback(error.message || "No se pudo filtrar la audiencia.", "error", { title: "Audiencia" }); } });
  document.getElementById("communicationComposerForm")?.addEventListener("submit", save);
  document.getElementById("communicationComposerForm")?.addEventListener("input", toggleComposer);
  window.renderCommunicationsView = render;
  window.loadBusinessCommunications = loadCommunications;
  window.loadCommunicationAudience = loadAudience;
})();
