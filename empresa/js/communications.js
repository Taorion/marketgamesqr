(() => {
  const MAX_MEDIA_FILES = 3;
  const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
  const refKey = (contact) => `${contact?.source_type || "PLAYER"}:${contact?.source_id || contact?.id || ""}`;
  const esc = (value) => escapeHtml(value == null ? "" : String(value));
  const typeLabel = (type) => ({ EMAIL: "Email", SOCIAL: "Publicación", MIXED: "Email + publicación" }[String(type || "").toUpperCase()] || "Comunicación");
  const statusLabel = (status) => ({ DRAFT: "Borrador", READY: "Lista", SENT: "Enviada", ARCHIVED: "Archivada" }[String(status || "").toUpperCase()] || "Borrador");
  const readJson = (value, fallback = []) => { try { const parsed = JSON.parse(value || ""); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; } };
  const mediaInput = () => document.getElementById("communicationMediaAssetsInput");
  const uploadedMedia = () => readJson(mediaInput()?.value);
  const setUploadedMedia = (items) => { const input = mediaInput(); if (input) input.value = JSON.stringify(items.slice(0, MAX_MEDIA_FILES)); renderMediaPreview(); };
  const selectedRecipients = () => {
    const selected = new Set(state.communicationSelectedRefs || []);
    return (state.communicationAudience || []).filter((contact) => selected.has(refKey(contact)));
  };
  const mediaFor = (item) => {
    const saved = Array.isArray(item?.metadata?.media_assets) ? item.metadata.media_assets : [];
    const sources = [...saved, item?.image_url ? { source: item.image_url } : null].filter(Boolean);
    const seen = new Set();
    return sources.filter((asset) => {
      const source = String(asset?.source || "").trim();
      if (!source || seen.has(source)) return false;
      seen.add(source);
      return true;
    }).slice(0, MAX_MEDIA_FILES);
  };

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

  function renderMediaPreview() {
    const preview = document.getElementById("communicationMediaPreview");
    if (!preview) return;
    const uploaded = uploadedMedia();
    const url = document.getElementById("communicationImageInput")?.value.trim();
    const cards = uploaded.map((asset, index) => `<figure class="communication-media-preview-item"><img src="${esc(asset.source)}" alt="${esc(asset.name || "Imagen adjunta")}"><figcaption><span>${esc(asset.name || `Imagen ${index + 1}`)}</span><button type="button" class="icon-button" data-remove-communication-media="${index}" aria-label="Quitar imagen"><span class="material-symbols-outlined">close</span></button></figcaption></figure>`);
    if (url) cards.push(`<figure class="communication-media-preview-item is-url"><img src="${esc(url)}" alt="Vista previa de la URL"><figcaption><span>Imagen desde URL</span><button type="button" class="icon-button" data-clear-communication-media-url aria-label="Quitar URL"><span class="material-symbols-outlined">close</span></button></figcaption></figure>`);
    preview.innerHTML = cards.length ? cards.join("") : '<div class="communication-media-empty"><span class="material-symbols-outlined">image</span><span>Aún no agregas imágenes.</span></div>';
  }

  function renderComposerPreview() {
    const preview = document.getElementById("communicationComposerPreview");
    if (!preview) return;
    const type = document.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL";
    const mediaCount = uploadedMedia().length + (document.getElementById("communicationImageInput")?.value.trim() ? 1 : 0);
    preview.innerHTML = `<span class="material-symbols-outlined">${type === "SOCIAL" ? "share" : "mail"}</span><div><strong>${type === "SOCIAL" ? "Publicación preparada para redes" : type === "MIXED" ? "Pieza preparada para email y redes" : "Email listo para personalizar"}</strong><small>${mediaCount ? `${mediaCount} imagen${mediaCount === 1 ? "" : "es"} lista${mediaCount === 1 ? "" : "s"} para adjuntar o publicar.` : "Puedes añadir imágenes ahora o continuar solo con texto."}</small></div>`;
  }

  function render() {
    const list = document.getElementById("businessCommunicationsList");
    const audience = document.getElementById("communicationAudienceList");
    const summary = document.getElementById("communicationAudienceSummary");
    const selectedSummary = document.getElementById("communicationSelectionSummary");
    const sendBar = document.getElementById("communicationSendBar");
    const selectedPiece = document.getElementById("communicationSelectedSummary");
    if (!list || !audience || !summary || !selectedSummary || !sendBar) return;
    const communications = state.communications || [];
    list.innerHTML = communications.length ? communications.map((item) => {
      const media = mediaFor(item);
      return `<article class="communication-list-item ${String(item.id) === String(state.selectedCommunicationId) ? "is-selected" : ""}" data-communication-select="${esc(item.id)}"><div><span class="mono-label">${esc(typeLabel(item.communication_type))} · ${esc(statusLabel(item.status))}</span><strong>${esc(item.title)}</strong><p>${esc(item.campaign_name || item.channel_name || item.activation_name || "Sin relación comercial")}</p></div><div class="communication-list-item-meta">${media.length ? `<span class="communication-media-count"><span class="material-symbols-outlined">image</span>${media.length}</span>` : ""}<strong>${Number(item.recipients_total || 0)}</strong><small>destinatarios</small><span class="material-symbols-outlined">arrow_forward</span></div></article>`;
    }).join("") : '<div class="communication-empty-state"><span class="material-symbols-outlined">mail</span><strong>Aún no has creado comunicaciones.</strong><p>Crea una pieza y úsala en email, redes o ambos canales.</p></div>';
    const selected = new Set(state.communicationSelectedRefs || []);
    summary.textContent = `${state.communicationAudienceTotal || state.communicationAudience.length} contactos${state.communicationAudienceCapped ? " · se muestran los primeros 120" : ""}`;
    audience.innerHTML = state.communicationAudience.length ? state.communicationAudience.map((contact) => `<label class="communication-contact-row ${selected.has(refKey(contact)) ? "is-selected" : ""}"><input type="checkbox" data-communication-recipient value="${esc(refKey(contact))}" ${selected.has(refKey(contact)) ? "checked" : ""}><span class="communication-contact-avatar">${esc((contact.name || "C").slice(0, 1).toUpperCase())}</span><span class="communication-contact-copy"><strong>${esc(contact.name || "Contacto sin nombre")}</strong><small>${esc(contact.email || "Sin email")} · ${esc(contact.interest || "Sin interés registrado")}</small></span><span class="communication-contact-metrics"><strong>${Number(contact.purchase_count || 0)}</strong><small>compras</small></span></label>`).join("") : '<div class="communication-empty-state compact"><strong>No encontramos contactos con estos filtros.</strong><p>Prueba removiendo un filtro.</p></div>';
    const recipients = selectedRecipients();
    selectedSummary.textContent = `${recipients.length} seleccionado${recipients.length === 1 ? "" : "s"}`;
    const active = communications.find((item) => String(item.id) === String(state.selectedCommunicationId));
    if (!active) { sendBar.innerHTML = '<span class="material-symbols-outlined">touch_app</span><p>Elige una comunicación para preparar su envío.</p>'; return; }
    const media = mediaFor(active);
    if (selectedPiece && active) selectedPiece.innerHTML = `<div><span class="mono-label">Pieza seleccionada</span><strong>${esc(active.title)}</strong><p>${esc(active.subject || active.social_copy || "Aún sin texto de salida.")}</p><div class="communication-delivery-metrics"><span><b>${Number(active.recipients_total || 0)}</b> destinatarios</span><span><b>${Number(active.recipients_sent || 0)}</b> enviados</span><span><b>${Number(active.recipients_failed || 0)}</b> fallidos</span></div></div><div class="communication-selected-actions"><button class="ghost-button compact" type="button" data-edit-communication="${esc(active.id)}">Editar</button><button class="ghost-button compact" type="button" data-duplicate-communication="${esc(active.id)}">Duplicar</button><button class="ghost-button compact" type="button" data-archive-communication="${esc(active.id)}" ${String(active.status).toUpperCase() === "ARCHIVED" ? "disabled" : ""}>Archivar</button></div>`;
    const mediaNote = media.length ? `${media.length} imagen${media.length === 1 ? "" : "es"} adjunta${media.length === 1 ? "" : "s"}.` : "Sin adjuntos.";
    if (String(active.status).toUpperCase() === "ARCHIVED") { sendBar.innerHTML = '<span class="material-symbols-outlined">inventory_2</span><div><strong>Comunicación archivada</strong><p>Conserva su historial de entrega. Duplícala para crear una nueva versión enviable.</p></div>'; return; }
    if (String(active.communication_type).toUpperCase() === "SOCIAL") {
      sendBar.innerHTML = `<span class="material-symbols-outlined">share</span><div><strong>Publicación lista para redes</strong><p>${mediaNote} Copia el texto y descarga las imágenes para subirlas a la red que elijas.</p></div><button class="ghost-button compact" type="button" data-download-communication-media="${esc(active.id)}" ${media.length ? "" : "disabled"}>Descargar imágenes</button><button class="solid-button compact" type="button" data-copy-communication-social="${esc(active.id)}">Copiar publicación</button>`;
      return;
    }
    sendBar.innerHTML = `<span class="material-symbols-outlined">send</span><div><strong>${esc(active.title)}</strong><p>${recipients.length ? `${recipients.length} destinatario${recipients.length === 1 ? "" : "s"} seleccionado${recipients.length === 1 ? "" : "s"}.` : "Selecciona contactos para enviarla."} ${mediaNote}</p></div><label class="communication-consent"><input id="communicationConsentInput" type="checkbox"> Confirmo que aceptaron recibir comunicaciones.</label>${String(active.communication_type).toUpperCase() === "MIXED" ? `<button class="ghost-button compact" type="button" data-copy-communication-social="${esc(active.id)}">Copiar para redes</button>` : ""}<button class="solid-button compact" type="button" data-send-communication="${esc(active.id)}" ${recipients.length ? "" : "disabled"}>Enviar email</button>`;
  }

  function toggleComposer() {
    const type = document.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL";
    document.querySelectorAll(".communication-email-fields").forEach((node) => node.classList.toggle("hidden", type === "SOCIAL"));
    document.querySelectorAll(".communication-social-fields").forEach((node) => node.classList.toggle("hidden", type === "EMAIL"));
    renderMediaPreview();
    renderComposerPreview();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("No pudimos leer la imagen.")); reader.readAsDataURL(file); });
  }

  async function addMediaFiles(files) {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    const current = uploadedMedia();
    if (current.length + incoming.length > MAX_MEDIA_FILES) { showFeedback("Puedes adjuntar hasta 3 imágenes por comunicación.", "info", { title: "Imágenes" }); return; }
    const invalid = incoming.find((file) => !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > MAX_MEDIA_BYTES);
    if (invalid) { showFeedback("Usa imágenes JPG, PNG, WEBP o GIF de hasta 3 MB.", "info", { title: "Imagen no compatible" }); return; }
    try {
      const converted = await Promise.all(incoming.map(async (file) => ({ source: await readFileAsDataUrl(file), name: file.name, type: file.type, size: file.size })));
      setUploadedMedia([...current, ...converted]);
      renderComposerPreview();
    } catch (error) { showFeedback(error.message || "No se pudo preparar la imagen.", "error", { title: "Imagen" }); }
  }

  function downloadMedia(item) {
    const media = mediaFor(item);
    media.forEach((asset, index) => {
      const link = document.createElement("a");
      link.href = asset.source;
      link.target = "_blank";
      if (asset.source.startsWith("data:")) link.download = asset.name || `comunicacion-${index + 1}.png`;
      document.body.appendChild(link); link.click(); link.remove();
    });
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("communicationComposerMessage");
    const url = form.querySelector("#communicationImageInput")?.value.trim() || "";
    const assets = uploadedMedia();
    const media = [...assets, ...(url ? [{ source: url, name: "Imagen desde URL" }] : [])].slice(0, MAX_MEDIA_FILES);
    const payload = {
      title: form.querySelector("#communicationTitleInput")?.value.trim(), communication_type: form.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL",
      campaign_id: form.querySelector("#communicationCampaignInput")?.value || null, channel_id: form.querySelector("#communicationChannelInput")?.value || null, activation_id: form.querySelector("#communicationActivationInput")?.value || null,
      subject: form.querySelector("#communicationSubjectInput")?.value.trim() || null, email_body: form.querySelector("#communicationEmailBodyInput")?.value.trim() || null, social_copy: form.querySelector("#communicationSocialCopyInput")?.value.trim() || null,
      image_url: media[0]?.source || null, action_url: form.querySelector("#communicationActionUrlInput")?.value.trim() || null, metadata: { media_assets: media },
    };
    try {
      message.textContent = "Guardando comunicación…";
      const editingId = state.editingCommunicationId;
      const data = await api(editingId ? `/api/business/communications/${editingId}` : "/api/business/communications", { method: editingId ? "PATCH" : "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      state.communicationsLoaded = false; await loadCommunications({ force: true }); state.selectedCommunicationId = data.communication?.id || state.selectedCommunicationId;
      state.editingCommunicationId = null; document.getElementById("communicationComposerModal")?.classList.add("hidden"); render(); showFeedback(editingId ? "La comunicación quedó actualizada." : "La comunicación quedó lista para seleccionar su audiencia.", "success", { title: editingId ? "Comunicación actualizada" : "Comunicación creada" });
    } catch (error) { message.textContent = error.message || "No se pudo guardar la comunicación."; }
  }

  document.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-open-communication-composer]"); const close = event.target.closest("[data-close-communication-composer]"); const pick = event.target.closest("[data-communication-select]"); const all = event.target.closest("[data-communication-select-loaded]"); const send = event.target.closest("[data-send-communication]"); const copy = event.target.closest("[data-copy-communication-social]"); const download = event.target.closest("[data-download-communication-media]"); const removeMedia = event.target.closest("[data-remove-communication-media]"); const clearUrl = event.target.closest("[data-clear-communication-media-url]"); const edit = event.target.closest("[data-edit-communication]"); const duplicate = event.target.closest("[data-duplicate-communication]"); const archive = event.target.closest("[data-archive-communication]");
    if (open || edit || duplicate) { const key = edit?.dataset.editCommunication || duplicate?.dataset.duplicateCommunication; const item = key ? state.communications.find((row) => String(row.id) === String(key)) : null; renderOptions(); const form = document.getElementById("communicationComposerForm"); form?.reset(); state.editingCommunicationId = edit ? item?.id : null; if (item && form) { form.querySelector("#communicationTitleInput").value = duplicate ? `${item.title} (copia)` : item.title || ""; form.querySelector("#communicationCampaignInput").value = item.campaign_id || ""; form.querySelector("#communicationChannelInput").value = item.channel_id || ""; form.querySelector("#communicationActivationInput").value = item.activation_id || ""; form.querySelector("#communicationSubjectInput").value = item.subject || ""; form.querySelector("#communicationEmailBodyInput").value = item.email_body || ""; form.querySelector("#communicationSocialCopyInput").value = item.social_copy || ""; form.querySelector("#communicationActionUrlInput").value = item.action_url || ""; const radio = form.querySelector(`input[name="communicationType"][value="${item.communication_type || "EMAIL"}"]`); if (radio) radio.checked = true; const assets = mediaFor(item); setUploadedMedia(assets.filter((asset) => String(asset.source || "").startsWith("data:"))); form.querySelector("#communicationImageInput").value = assets.find((asset) => !String(asset.source || "").startsWith("data:"))?.source || ""; } else { setUploadedMedia([]); } document.getElementById("communicationComposerTitle").textContent = edit ? "Edita tu comunicación" : duplicate ? "Reutiliza esta comunicación" : "Crea un mensaje listo para enviar"; document.getElementById("communicationComposerSaveButton").textContent = edit ? "Guardar cambios" : duplicate ? "Guardar copia" : "Guardar comunicación"; document.getElementById("communicationComposerModal")?.classList.remove("hidden"); toggleComposer(); return; }
    if (close) { document.getElementById("communicationComposerModal")?.classList.add("hidden"); return; }
    if (archive) { const item = state.communications.find((row) => String(row.id) === String(archive.dataset.archiveCommunication)); if (!item || !window.confirm(`¿Archivar “${item.title}”? Se conserva el historial, pero deja de quedar disponible para nuevos envíos.`)) return; await api(`/api/business/communications/${item.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: "ARCHIVED" }) }); state.communicationsLoaded = false; await loadCommunications({ force: true }); state.selectedCommunicationId = state.communications.find((row) => String(row.status).toUpperCase() !== "ARCHIVED")?.id || state.communications[0]?.id || null; render(); showFeedback("La comunicación quedó archivada.", "success", { title: "Comunicación archivada" }); return; }
    if (removeMedia) { const media = uploadedMedia(); media.splice(Number(removeMedia.dataset.removeCommunicationMedia), 1); setUploadedMedia(media); renderComposerPreview(); return; }
    if (clearUrl) { const input = document.getElementById("communicationImageInput"); if (input) input.value = ""; toggleComposer(); return; }
    if (pick) { state.selectedCommunicationId = pick.dataset.communicationSelect; render(); return; }
    if (all) { state.communicationSelectedRefs = state.communicationAudience.map(refKey); render(); return; }
    if (download) { const item = state.communications.find((row) => String(row.id) === String(download.dataset.downloadCommunicationMedia)); downloadMedia(item); return; }
    if (copy) { const item = state.communications.find((row) => String(row.id) === String(copy.dataset.copyCommunicationSocial)); const content = [item?.social_copy, item?.action_url].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(content); showFeedback("Publicación copiada.", "success", { title: "Texto copiado" }); } catch { window.prompt("Copia esta publicación", content); } return; }
    if (send) { const recipients = selectedRecipients(); if (!document.getElementById("communicationConsentInput")?.checked) { showFeedback("Confirma el consentimiento antes de enviar.", "info", { title: "Consentimiento requerido" }); return; } try { showFeedback("Enviando emails…", "loading", { title: "Comunicación", timeout: 0 }); const data = await api(`/api/business/communications/${send.dataset.sendCommunication}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) }); state.communicationsLoaded = false; await loadCommunications({ force: true }); render(); showFeedback(`Envío finalizado: ${data.results?.sent || 0} enviados, ${data.results?.failed || 0} fallidos y ${data.results?.skipped || 0} sin email.`, "success", { title: "Comunicación enviada" }); } catch (error) { showFeedback(error.message || "No se pudo completar el envío.", "error", { title: "Comunicación" }); } }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-communication-recipient]")) { const selected = new Set(state.communicationSelectedRefs || []); if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value); state.communicationSelectedRefs = Array.from(selected); render(); }
    if (event.target.matches('input[name="communicationType"]')) toggleComposer();
    if (event.target.matches("#communicationImageUploadInput")) addMediaFiles(event.target.files).finally(() => { event.target.value = ""; });
  });
  document.getElementById("communicationAudienceFilters")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; state.communicationAudienceFilters = { search: form.querySelector("#communicationAudienceSearch")?.value.trim() || "", interest: form.querySelector("#communicationAudienceInterest")?.value.trim() || "", city: form.querySelector("#communicationAudienceCity")?.value.trim() || "", has_purchases: form.querySelector("#communicationAudiencePurchases")?.value || "", score_min: form.querySelector("#communicationAudienceScore")?.value || "" }; state.communicationSelectedRefs = []; try { await loadAudience(); render(); } catch (error) { showFeedback(error.message || "No se pudo filtrar la audiencia.", "error", { title: "Audiencia" }); } });
  document.getElementById("communicationComposerForm")?.addEventListener("submit", save);
  document.getElementById("communicationComposerForm")?.addEventListener("input", (event) => { if (event.target.matches("#communicationImageInput") || event.target.matches("#communicationActionUrlInput")) toggleComposer(); });
  window.renderCommunicationsView = render;
  window.loadBusinessCommunications = loadCommunications;
  window.loadCommunicationAudience = loadAudience;
})();
