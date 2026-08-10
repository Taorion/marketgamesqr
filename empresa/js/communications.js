(() => {
  const MAX_MEDIA_FILES = 3;
  const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
  const AUDIENCE_PAGE_SIZE = 120;
  const MAX_EMAIL_RECIPIENTS = 120;
  const rmsPhaseLabel = (phase) => ({ recoleccion: "Leads recolectados", alimentacion: "Curaduría", curaduria: "Clasificador", clasificacion: "Activación 1", preprocesamiento: "Control de calidad 1", procesamiento: "Evaluación", accion_correctiva: "Negociación", control_anti_fuga: "Riesgos de fuga", cierre: "Ventas atribuidas", revenue_generado: "Control de calidad 2", postventa: "Activación 2", inteligencia: "Inteligencia RMS" }[String(phase || "").toLowerCase()] || "Leads recolectados");
  const metricMoney = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));
  const refKey = (contact) => `${contact?.source_type || "PLAYER"}:${contact?.source_id || contact?.id || ""}`;
  const esc = (value) => escapeHtml(value == null ? "" : String(value));
  const typeLabel = (type) => ({ EMAIL: "Email", SOCIAL: "Publicación", MIXED: "Email + publicación" }[String(type || "").toUpperCase()] || "Comunicación");
  const statusLabel = (status) => ({ DRAFT: "Borrador", READY: "Lista", SENT: "Enviada", ARCHIVED: "Archivada" }[String(status || "").toUpperCase()] || "Borrador");
  const readJson = (value, fallback = []) => { try { const parsed = JSON.parse(value || ""); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; } };
  const isSocialCommunication = (item) => ["SOCIAL", "MIXED"].includes(String(item?.communication_type || "").toUpperCase());
  const isEmailCommunication = (item) => ["EMAIL", "MIXED"].includes(String(item?.communication_type || "").toUpperCase());
  const publicationLabel = (item) => isSocialCommunication(item)
    ? (String(item?.publication_status || "").toUpperCase() === "PUBLISHED" ? "Publicada" : "Por publicar")
    : statusLabel(item?.status);
  const mediaInput = () => document.getElementById("communicationMediaAssetsInput");
  const composerModal = () => document.getElementById("communicationComposerModal");
  const composerIsOpen = () => Boolean(composerModal() && !composerModal().classList.contains("hidden"));
  const rootComposerModal = () => {
    const modal = composerModal();
    if (modal && modal.parentElement !== document.body) document.body.appendChild(modal);
    return modal;
  };
  const uploadedMedia = () => readJson(mediaInput()?.value);
  const setUploadedMedia = (items) => { const input = mediaInput(); if (input) input.value = JSON.stringify(items.slice(0, MAX_MEDIA_FILES)); renderMediaPreview(); };
  const hasEmail = (contact) => Boolean(String(contact?.email || "").trim());
  const selectedRecipients = () => {
    const selected = new Set(state.communicationSelectedRefs || []);
    return (state.communicationAudience || []).filter((contact) => selected.has(refKey(contact)) && hasEmail(contact));
  };
  const emailReadyContacts = () => (state.communicationAudience || []).filter(hasEmail);
  const setAudienceSelection = (mode = "email") => {
    const current = new Set(state.communicationSelectedRefs || []);
    if (mode === "clear") {
      state.communicationSelectedRefs = [];
      return 0;
    }
    const available = Math.max(0, MAX_EMAIL_RECIPIENTS - current.size);
    emailReadyContacts().filter((contact) => !current.has(refKey(contact))).slice(0, available).forEach((contact) => current.add(refKey(contact)));
    state.communicationSelectedRefs = Array.from(current);
    return available;
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
  const socialShareContent = (item) => [item?.social_copy, item?.tracking_url || item?.action_url].filter(Boolean).join("\n\n");

  async function shareSocialPublication(item) {
    const content = socialShareContent(item);
    if (!content) throw new Error("La publicación aún no tiene texto ni enlace para compartir.");
    if (navigator.share) {
      await navigator.share({ title: item.title || "Publicación Qori", text: item.social_copy || "", url: item.tracking_url || item.action_url || undefined });
      return "shared";
    }
    await navigator.clipboard.writeText(content);
    return "copied";
  }

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

  async function loadAudience(options = {}) {
    const append = Boolean(options.append);
    const offset = append ? Number(state.communicationAudienceNextOffset || (state.communicationAudience || []).length) : 0;
    state.communicationAudienceLoading = true;
    const query = new URLSearchParams();
    Object.entries(state.communicationAudienceFilters || {}).forEach(([key, value]) => { if (String(value || "").trim()) query.set(key, String(value).trim()); });
    query.set("limit", String(AUDIENCE_PAGE_SIZE));
    query.set("offset", String(offset));
    try {
      const data = await api(`/api/business/communications/audience${query.toString() ? `?${query}` : ""}`, { headers: authHeaders() });
      const contacts = data.contacts || [];
      state.communicationAudience = append
        ? Array.from(new Map([...(state.communicationAudience || []), ...contacts].map((contact) => [refKey(contact), contact])).values())
        : contacts;
      state.communicationAudienceTotal = Number(data.total || state.communicationAudience.length);
      state.communicationAudienceCapped = false;
      state.communicationAudienceNextOffset = offset + contacts.length;
      state.communicationAudienceHasMore = Boolean(data.pagination?.has_more);
      if (!append) {
        const shown = new Set(state.communicationAudience.map(refKey));
        state.communicationSelectedRefs = (state.communicationSelectedRefs || []).filter((id) => shown.has(id));
      }
    } finally {
      state.communicationAudienceLoading = false;
    }
  }

  function renderOptions() {
    const options = (items, label) => (items || []).map((item) => `<option value="${esc(item.id)}">${esc(label(item))}</option>`).join("");
    const campaign = document.getElementById("communicationCampaignInput");
    const channel = document.getElementById("communicationChannelInput");
    const activation = document.getElementById("communicationActivationInput");
    if (campaign) campaign.innerHTML = '<option value="">Sin campaña</option>' + options(state.campaigns, (item) => item.name || item.title || "Campaña");
    if (channel) channel.innerHTML = '<option value="">Sin canal</option>' + options(state.acquisitionChannels, (item) => [item.name || item.channel_name || "Canal", item.platform].filter(Boolean).join(" · "));
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

  function renderComposerAudience() {
    const list = document.getElementById("communicationComposerAudienceList");
    const count = document.getElementById("communicationComposerAudienceCount");
    if (!list || !count) return;
    const selected = new Set(state.communicationSelectedRefs || []);
    const contacts = state.communicationAudience || [];
    const ready = emailReadyContacts();
    const recipients = selectedRecipients();
    count.textContent = state.communicationAudienceLoading
      ? "Cargando contactos…"
      : contacts.length
        ? `${recipients.length} de ${MAX_EMAIL_RECIPIENTS} seleccionado${recipients.length === 1 ? "" : "s"} · mostrando ${contacts.length} de ${state.communicationAudienceTotal || contacts.length} contactos (${ready.length} con email)`
        : "Usa los filtros para encontrar contactos.";
    list.innerHTML = state.communicationAudienceLoading
      ? '<div class="communication-composer-audience-empty"><span class="material-symbols-outlined">hourglass_top</span><span>Cargando contactos disponibles…</span></div>'
      : contacts.length
        ? contacts.map((contact) => {
          const deliverable = hasEmail(contact);
          const selectedContact = selected.has(refKey(contact));
          const profile = contact.audience_type === "CLIENT" ? "Cliente" : "Lead";
          return `<label class="communication-composer-contact ${selectedContact ? "is-selected" : ""} ${deliverable ? "" : "is-unavailable"}"><input type="checkbox" data-communication-recipient value="${esc(refKey(contact))}" ${selectedContact ? "checked" : ""} ${deliverable ? "" : "disabled"}><span class="communication-contact-avatar">${esc((contact.name || "C").slice(0, 1).toUpperCase())}</span><span class="communication-composer-contact-copy"><strong>${esc(contact.name || "Contacto sin nombre")}</strong><small>${esc([profile, contact.interest || "Sin interés registrado", `RMS: ${rmsPhaseLabel(contact.rms_phase)}`].join(" · "))}</small></span><span class="communication-contact-delivery ${deliverable ? "is-ready" : ""}">${deliverable ? esc(contact.email) : "Sin email"}</span></label>`;
        }).join("") + (state.communicationAudienceHasMore ? `<div class="communication-composer-audience-more"><span>Hay más contactos que coinciden con estos filtros.</span><button type="button" class="text-button" data-load-more-composer-audience>Cargar los siguientes</button></div>` : "")
        : '<div class="communication-composer-audience-empty"><span class="material-symbols-outlined">group</span><span>No encontramos contactos para estos filtros.</span></div>';
  }

  function hydrateComposerAudienceFilters() {
    const filters = state.communicationAudienceFilters || {};
    const fields = {
      communicationComposerAudienceSearch: filters.search || "",
      communicationComposerAudienceType: filters.audience_type || "",
      communicationComposerAudienceInterest: filters.interest || "",
      communicationComposerAudiencePurchasedProduct: filters.purchased_product || "",
      communicationComposerAudienceRmsPhase: filters.rms_phase || "",
    };
    Object.entries(fields).forEach(([id, value]) => { const field = document.getElementById(id); if (field) field.value = value; });
  }

  async function prepareComposerRelations() {
    if (typeof loadAcquisitionChannels === "function") {
      await loadAcquisitionChannels({ force: true, quiet: true });
    }
  }

  function positionComposerAudience() {
    const form = document.getElementById("communicationComposerForm");
    const foundation = form?.querySelector(".communication-composer-foundation");
    const audience = document.getElementById("communicationComposerAudience");
    if (!form || !foundation || !audience || foundation.nextElementSibling === audience) return;
    foundation.insertAdjacentElement("afterend", audience);
    const audienceStep = audience.querySelector(".communication-composer-step");
    if (audienceStep) audienceStep.textContent = "02";
    form.querySelectorAll(".communication-email-fields .communication-composer-step, .communication-social-fields .communication-composer-step").forEach((step) => { step.textContent = "03"; });
    form.querySelectorAll(".communication-media-section .communication-composer-step").forEach((step) => { step.textContent = "04"; });
  }

  async function refreshComposerAudience() {
    const search = document.getElementById("communicationComposerAudienceSearch")?.value.trim() || "";
    const audienceType = document.getElementById("communicationComposerAudienceType")?.value || "";
    const interest = document.getElementById("communicationComposerAudienceInterest")?.value.trim() || "";
    const purchasedProduct = document.getElementById("communicationComposerAudiencePurchasedProduct")?.value.trim() || "";
    const rmsPhase = document.getElementById("communicationComposerAudienceRmsPhase")?.value || "";
    state.communicationAudienceFilters = { ...(state.communicationAudienceFilters || {}), search, audience_type: audienceType, interest, purchased_product: purchasedProduct, rms_phase: rmsPhase };
    await loadAudience();
    render();
    renderComposerAudience();
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
      return `<article class="communication-list-item ${String(item.id) === String(state.selectedCommunicationId) ? "is-selected" : ""}" data-communication-select="${esc(item.id)}"><div><span class="mono-label">${esc(typeLabel(item.communication_type))} · ${esc(publicationLabel(item))}</span><strong>${esc(item.title)}</strong><p>${esc(item.campaign_name || item.channel_name || item.activation_name || "Sin relación comercial")}</p></div><div class="communication-list-item-meta">${media.length ? `<span class="communication-media-count"><span class="material-symbols-outlined">image</span>${media.length}</span>` : ""}<strong>${Number(item.recipients_total || 0)}</strong><small>destinatarios</small><span class="material-symbols-outlined">arrow_forward</span></div></article>`;
    }).join("") : '<div class="communication-empty-state"><span class="material-symbols-outlined">mail</span><strong>Aún no has creado comunicaciones.</strong><p>Crea una pieza y úsala en email, redes o ambos canales.</p></div>';
    const selected = new Set(state.communicationSelectedRefs || []);
    const ready = emailReadyContacts();
    summary.textContent = state.communicationAudienceLoading
      ? "Cargando contactos…"
      : `${state.communicationAudienceTotal || state.communicationAudience.length} contactos · ${ready.length} con email${state.communicationAudienceCapped ? " · se muestran los primeros 120" : ""}`;
    audience.innerHTML = state.communicationAudienceLoading
      ? '<div class="communication-empty-state compact"><span class="material-symbols-outlined">hourglass_top</span><strong>Cargando contactos disponibles…</strong></div>'
      : state.communicationAudience.length
        ? state.communicationAudience.map((contact) => {
          const deliverable = hasEmail(contact);
          const selectedContact = selected.has(refKey(contact));
          return `<label class="communication-contact-row ${selectedContact ? "is-selected" : ""} ${deliverable ? "" : "is-unavailable"}"><input type="checkbox" data-communication-recipient value="${esc(refKey(contact))}" ${selectedContact ? "checked" : ""} ${deliverable ? "" : "disabled"}><span class="communication-contact-avatar">${esc((contact.name || "C").slice(0, 1).toUpperCase())}</span><span class="communication-contact-copy"><strong>${esc(contact.name || "Contacto sin nombre")}</strong><small>${esc(contact.interest || "Sin interés registrado")}</small></span><span class="communication-contact-delivery ${deliverable ? "is-ready" : ""}">${deliverable ? esc(contact.email) : "Sin email"}</span><span class="communication-contact-metrics"><strong>${Number(contact.purchase_count || 0)}</strong><small>compras</small></span></label>`;
        }).join("")
        : '<div class="communication-empty-state compact"><strong>No encontramos contactos con estos filtros.</strong><p>Prueba removiendo un filtro.</p></div>';
    const recipients = selectedRecipients();
    selectedSummary.textContent = `${recipients.length} con email seleccionado${recipients.length === 1 ? "" : "s"}`;
    const active = communications.find((item) => String(item.id) === String(state.selectedCommunicationId));
    if (!active) { sendBar.innerHTML = '<span class="material-symbols-outlined">touch_app</span><p>Elige una comunicación para preparar su envío.</p>'; return; }
    const media = mediaFor(active);
    if (selectedPiece && active) selectedPiece.innerHTML = `<div><span class="mono-label">Pieza seleccionada</span><strong>${esc(active.title)}</strong><p>${esc(active.subject || active.social_copy || "Aún sin texto de salida.")}</p><div class="communication-delivery-metrics"><span><b>${Number(active.recipients_total || 0)}</b> destinatarios</span><span><b>${Number(active.recipients_sent || 0)}</b> enviados</span><span><b>${Number(active.recipients_failed || 0)}</b> fallidos</span><span><b>${Number(active.views || 0)}</b> visitas</span><span><b>${Number(active.leads || 0)}</b> leads</span><span><b>${Number(active.completions || 0)}</b> activaciones</span><span><b>${Number(active.sales || 0)}</b> ventas</span><span><b>${metricMoney(active.revenue)}</b> revenue</span><span><b>${active.cac === null ? "—" : metricMoney(active.cac)}</b> CAC</span><span><b>${active.roi === null ? "—" : `${(Number(active.roi) * 100).toFixed(0)}%`}</b> ROI</span></div></div><div class="communication-selected-actions"><button class="ghost-button compact" type="button" data-edit-communication="${esc(active.id)}">Editar</button><button class="ghost-button compact" type="button" data-duplicate-communication="${esc(active.id)}">Duplicar</button><button class="ghost-button compact" type="button" data-archive-communication="${esc(active.id)}" ${String(active.status).toUpperCase() === "ARCHIVED" ? "disabled" : ""}>Archivar</button></div>`;
    const mediaNote = media.length ? `${media.length} imagen${media.length === 1 ? "" : "es"} adjunta${media.length === 1 ? "" : "s"}.` : "Sin adjuntos.";
    if (String(active.status).toUpperCase() === "ARCHIVED") { sendBar.innerHTML = '<span class="material-symbols-outlined">inventory_2</span><div><strong>Comunicación archivada</strong><p>Conserva su historial de entrega. Duplícala para crear una nueva versión enviable.</p></div>'; return; }
    if (isSocialCommunication(active)) {
      const published = String(active.publication_status).toUpperCase() === "PUBLISHED";
      const trackingLink = published && active.tracking_url
        ? `<a class="communication-measured-link" href="${esc(active.tracking_url)}" target="_blank" rel="noopener">Abrir enlace medido</a>`
        : "";
      const socialRoute = `<section class="communication-delivery-route communication-social-route"><span class="material-symbols-outlined">share</span><div><strong>${published ? "Publicación medida y activa" : "Publicación lista para registrar"}</strong><p>${published ? "Cada visita, activación, lead, QR y venta atribuida alimenta esta pieza, su canal y su campaña." : "Registra la publicación antes de compartirla: Qori crea el enlace medido y conserva la inversión para calcular CAC y ROI."}</p>${trackingLink}</div><label class="communication-publish-field"><span>Inversión COP</span><input id="communicationPublicationInvestment" type="number" min="0" value="${Number(active.investment || 0)}"></label><label class="communication-publish-field"><span>URL publicada (opcional)</span><input id="communicationPublicationUrl" type="url" value="${esc(active.external_publication_url || "")}" placeholder="https://..."></label><div class="communication-social-actions"><button class="ghost-button compact" type="button" data-download-communication-media="${esc(active.id)}" ${media.length ? "" : "disabled"}>Descargar imágenes</button><button class="ghost-button compact" type="button" data-copy-communication-social="${esc(active.id)}" ${published ? "" : "disabled"}>Copiar publicación</button><button class="ghost-button compact" type="button" data-share-communication-social="${esc(active.id)}" ${published ? "" : "disabled"}>Compartir</button><button class="solid-button compact" type="button" data-publish-communication="${esc(active.id)}">${published ? "Actualizar publicación" : "Registrar publicación medida"}</button></div></section>`;
      if (!isEmailCommunication(active)) { sendBar.innerHTML = socialRoute; return; }
      const emailRoute = `<section class="communication-delivery-route communication-email-route"><span class="material-symbols-outlined">send</span><div><strong>Enviar por email</strong><p>${recipients.length ? `${recipients.length} destinatario${recipients.length === 1 ? "" : "s"} seleccionado${recipients.length === 1 ? "" : "s"}.` : "Selecciona contactos para enviar esta versión."} ${mediaNote}</p></div><label class="communication-consent"><input id="communicationConsentInput" type="checkbox"> Confirmo que aceptaron recibir comunicaciones.</label><button class="solid-button compact" type="button" data-send-communication="${esc(active.id)}" ${recipients.length ? "" : "disabled"}>Enviar email</button></section>`;
      sendBar.innerHTML = `<div class="communication-delivery-routes">${socialRoute}${emailRoute}</div>`;
      return;
    }
    sendBar.innerHTML = `<span class="material-symbols-outlined">send</span><div><strong>${esc(active.title)}</strong><p>${recipients.length ? `${recipients.length} destinatario${recipients.length === 1 ? "" : "s"} seleccionado${recipients.length === 1 ? "" : "s"}.` : "Selecciona contactos para enviarla."} ${mediaNote}</p></div><label class="communication-consent"><input id="communicationConsentInput" type="checkbox"> Confirmo que aceptaron recibir comunicaciones.</label>${String(active.communication_type).toUpperCase() === "MIXED" ? `<button class="ghost-button compact" type="button" data-copy-communication-social="${esc(active.id)}">Copiar para redes</button>` : ""}<button class="solid-button compact" type="button" data-send-communication="${esc(active.id)}" ${recipients.length ? "" : "disabled"}>Enviar email</button>`;
    if (composerIsOpen()) renderComposerAudience();
  }

  function toggleComposer() {
    positionComposerAudience();
    const type = document.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL";
    document.querySelectorAll(".communication-email-fields").forEach((node) => node.classList.toggle("hidden", type === "SOCIAL"));
    document.querySelectorAll(".communication-social-fields").forEach((node) => node.classList.toggle("hidden", type === "EMAIL"));
    document.getElementById("communicationComposerAudience")?.classList.toggle("hidden", type === "SOCIAL");
    const subject = document.getElementById("communicationSubjectInput");
    const emailBody = document.getElementById("communicationEmailBodyInput");
    const socialCopy = document.getElementById("communicationSocialCopyInput");
    if (subject) subject.required = type !== "SOCIAL";
    if (emailBody) emailBody.required = type !== "SOCIAL";
    if (socialCopy) socialCopy.required = type !== "EMAIL";
    const send = document.getElementById("communicationComposerSaveAndSendButton");
    if (send) send.classList.toggle("hidden", type === "SOCIAL");
    const publish = document.getElementById("communicationComposerSaveAndPublishButton");
    if (publish) publish.classList.toggle("hidden", type === "EMAIL");
    renderMediaPreview();
    renderComposerPreview();
    renderComposerAudience();
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
    const action = event.submitter?.dataset.communicationSaveAction || "DRAFT";
    const type = form.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL";
    const recipients = selectedRecipients();
    if (action === "SEND" && !recipients.length) { message.textContent = "Selecciona al menos un contacto antes de enviar."; return; }
    if (action === "SEND" && !document.getElementById("communicationComposerConsentInput")?.checked) { message.textContent = "Confirma el consentimiento antes de enviar."; return; }
    const payload = {
      title: form.querySelector("#communicationTitleInput")?.value.trim(), communication_type: form.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL",
      campaign_id: form.querySelector("#communicationCampaignInput")?.value || null, channel_id: form.querySelector("#communicationChannelInput")?.value || null, activation_id: form.querySelector("#communicationActivationInput")?.value || null,
      subject: form.querySelector("#communicationSubjectInput")?.value.trim() || null, email_body: form.querySelector("#communicationEmailBodyInput")?.value.trim() || null, social_copy: form.querySelector("#communicationSocialCopyInput")?.value.trim() || null,
      image_url: media[0]?.source || null, action_url: form.querySelector("#communicationActionUrlInput")?.value.trim() || null,
      audience_filters: { ...(state.communicationAudienceFilters || {}) }, metadata: { media_assets: media },
    };
    if (action === "PUBLISH" && (!payload.activation_id || !payload.channel_id)) {
      const reason = "Para registrar una publicación medida, selecciona la activación y el canal que la distribuye.";
      message.textContent = reason;
      showFeedback(reason, "info", { title: "Falta conectar la publicación" });
      return;
    }
    try {
      message.textContent = action === "SEND" ? "Guardando y preparando el envío…" : action === "PUBLISH" ? "Guardando y creando el enlace medido…" : "Guardando comunicación…";
      const editingId = state.editingCommunicationId;
      const data = await api(editingId ? `/api/business/communications/${editingId}` : "/api/business/communications", { method: editingId ? "PATCH" : "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      if (action === "SEND" && type !== "SOCIAL") {
        message.textContent = "Enviando emails…";
        const sent = await api(`/api/business/communications/${data.communication.id}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) });
        const sentCount = Number(sent.results?.sent || 0);
        showFeedback(`Envío finalizado: ${sentCount} enviados, ${sent.results?.failed || 0} fallidos y ${sent.results?.skipped || 0} sin email.`, sentCount ? "success" : "error", { title: sentCount ? "Comunicación enviada" : "No se enviaron correos" });
      }
      if (action === "PUBLISH") {
        message.textContent = "Registrando la publicación medida…";
        await api(`/api/business/communications/${data.communication.id}/publish`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ investment_amount: 0, external_publication_url: "" }) });
      }
      state.communicationsLoaded = false; await loadCommunications({ force: true }); state.selectedCommunicationId = data.communication?.id || state.selectedCommunicationId;
      if (action === "SEND") state.communicationSelectedRefs = [];
      state.editingCommunicationId = null; composerModal()?.classList.add("hidden"); document.body.classList.remove("communication-composer-open"); render();
      if (action === "PUBLISH") showFeedback("La publicación quedó registrada con enlace medido. Ahora puedes copiarla, descargar imágenes o usar Compartir.", "success", { title: "Publicación medida lista" });
      else if (action !== "SEND") {
        const selectedChannel = form.querySelector("#communicationChannelInput option:checked")?.textContent?.trim();
        const channelNote = payload.channel_id ? ` También quedó vinculada automáticamente a Publicaciones y esfuerzos${selectedChannel ? ` del canal ${selectedChannel}` : ""}.` : "";
        showFeedback(`${editingId ? "La comunicación quedó actualizada." : "La comunicación quedó guardada. Puedes volver a abrirla para enviar o publicar."}${channelNote}`, "success", { title: editingId ? "Comunicación actualizada" : "Comunicación creada" });
      }
    } catch (error) { const reason = error.message || "No se pudo guardar la comunicación."; message.textContent = reason; showFeedback(reason, "error", { title: action === "PUBLISH" ? "No se pudo registrar la publicación" : "No se pudo guardar la comunicación" }); }
  }

  document.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-open-communication-composer]"); const close = event.target.closest("[data-close-communication-composer]"); const pick = event.target.closest("[data-communication-select]"); const all = event.target.closest("[data-communication-select-loaded]"); const clearSelection = event.target.closest("[data-communication-clear-selection]"); const send = event.target.closest("[data-send-communication]"); const copy = event.target.closest("[data-copy-communication-social]"); const share = event.target.closest("[data-share-communication-social]"); const download = event.target.closest("[data-download-communication-media]"); const publish = event.target.closest("[data-publish-communication]"); const removeMedia = event.target.closest("[data-remove-communication-media]"); const clearUrl = event.target.closest("[data-clear-communication-media-url]"); const edit = event.target.closest("[data-edit-communication]"); const duplicate = event.target.closest("[data-duplicate-communication]"); const archive = event.target.closest("[data-archive-communication]"); const loadComposerAudience = event.target.closest("[data-load-composer-audience]"); const loadMoreComposerAudience = event.target.closest("[data-load-more-composer-audience]"); const selectComposerAudience = event.target.closest("[data-composer-select-audience]"); const clearComposerAudience = event.target.closest("[data-composer-clear-audience]");
    if (open || edit || duplicate) { try { await prepareComposerRelations(); } catch (error) { console.warn("No se pudieron actualizar los canales para comunicaciones.", error); } renderOptions(); positionComposerAudience(); }
    if (open || edit || duplicate) { const key = edit?.dataset.editCommunication || duplicate?.dataset.duplicateCommunication; const item = key ? state.communications.find((row) => String(row.id) === String(key)) : null; renderOptions(); const form = document.getElementById("communicationComposerForm"); form?.reset(); state.editingCommunicationId = edit ? item?.id : null; if (!edit && !duplicate) state.communicationSelectedRefs = []; if (item && form) { form.querySelector("#communicationTitleInput").value = duplicate ? `${item.title} (copia)` : item.title || ""; form.querySelector("#communicationCampaignInput").value = item.campaign_id || ""; form.querySelector("#communicationChannelInput").value = item.channel_id || ""; form.querySelector("#communicationActivationInput").value = item.activation_id || ""; form.querySelector("#communicationSubjectInput").value = item.subject || ""; form.querySelector("#communicationEmailBodyInput").value = item.email_body || ""; form.querySelector("#communicationSocialCopyInput").value = item.social_copy || ""; form.querySelector("#communicationActionUrlInput").value = item.action_url || ""; const radio = form.querySelector(`input[name="communicationType"][value="${item.communication_type || "EMAIL"}"]`); if (radio) radio.checked = true; const assets = mediaFor(item); setUploadedMedia(assets.filter((asset) => String(asset.source || "").startsWith("data:"))); form.querySelector("#communicationImageInput").value = assets.find((asset) => !String(asset.source || "").startsWith("data:"))?.source || ""; } else { setUploadedMedia([]); } document.getElementById("communicationComposerTitle").textContent = edit ? "Edita tu comunicación" : duplicate ? "Reutiliza esta comunicación" : "Crea un mensaje listo para enviar"; document.getElementById("communicationComposerSaveButton").textContent = edit ? "Guardar cambios" : duplicate ? "Guardar copia" : "Guardar borrador"; rootComposerModal()?.classList.remove("hidden"); document.body.classList.add("communication-composer-open"); hydrateComposerAudienceFilters(); try { await refreshComposerAudience(); } catch (error) { showFeedback(error.message || "No se pudo cargar la audiencia.", "error", { title: "Audiencia" }); } toggleComposer(); requestAnimationFrame(() => document.getElementById("communicationTitleInput")?.focus()); return; }
    if (close) { composerModal()?.classList.add("hidden"); document.body.classList.remove("communication-composer-open"); return; }
    if (loadComposerAudience) { try { await refreshComposerAudience(); } catch (error) { showFeedback(error.message || "No se pudo cargar la audiencia.", "error", { title: "Audiencia" }); } return; }
    if (loadMoreComposerAudience) { try { await loadAudience({ append: true }); render(); renderComposerAudience(); } catch (error) { showFeedback(error.message || "No se pudieron cargar más contactos.", "error", { title: "Audiencia" }); } return; }
    if (selectComposerAudience || all) { const available = setAudienceSelection(); render(); renderComposerAudience(); if (!available) showFeedback(`Ya seleccionaste el máximo de ${MAX_EMAIL_RECIPIENTS} contactos por envío.`, "info", { title: "Destinatarios" }); return; }
    if (clearComposerAudience || clearSelection) { setAudienceSelection("clear"); render(); renderComposerAudience(); return; }
    if (archive) { const item = state.communications.find((row) => String(row.id) === String(archive.dataset.archiveCommunication)); if (!item || !window.confirm(`¿Archivar “${item.title}”? Se conserva el historial, pero deja de quedar disponible para nuevos envíos.`)) return; await api(`/api/business/communications/${item.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: "ARCHIVED" }) }); state.communicationsLoaded = false; await loadCommunications({ force: true }); state.selectedCommunicationId = state.communications.find((row) => String(row.status).toUpperCase() !== "ARCHIVED")?.id || state.communications[0]?.id || null; render(); showFeedback(item.channel_id ? "La comunicación y su esfuerzo asociado quedaron archivados." : "La comunicación quedó archivada.", "success", { title: "Comunicación archivada" }); return; }
    if (removeMedia) { const media = uploadedMedia(); media.splice(Number(removeMedia.dataset.removeCommunicationMedia), 1); setUploadedMedia(media); renderComposerPreview(); return; }
    if (clearUrl) { const input = document.getElementById("communicationImageInput"); if (input) input.value = ""; toggleComposer(); return; }
    if (pick) { state.selectedCommunicationId = pick.dataset.communicationSelect; render(); return; }
    if (download) { const item = state.communications.find((row) => String(row.id) === String(download.dataset.downloadCommunicationMedia)); downloadMedia(item); return; }
    if (copy) { const item = state.communications.find((row) => String(row.id) === String(copy.dataset.copyCommunicationSocial)); const content = [item?.social_copy, item?.tracking_url || item?.action_url].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(content); showFeedback("Publicación copiada con su enlace medido.", "success", { title: "Texto copiado" }); } catch { window.prompt("Copia esta publicación", content); } return; }
    if (share) { const item = state.communications.find((row) => String(row.id) === String(share.dataset.shareCommunicationSocial)); try { const result = await shareSocialPublication(item); showFeedback(result === "shared" ? "Se abrió el selector de compartir del dispositivo." : "La publicación medida quedó copiada para compartirla.", "success", { title: "Compartir publicación" }); } catch (error) { if (error?.name !== "AbortError") showFeedback(error.message || "No se pudo preparar la publicación para compartir.", "error", { title: "Compartir publicación" }); } return; }
    if (publish) { try { const investment = document.getElementById("communicationPublicationInvestment")?.value || 0; const externalUrl = document.getElementById("communicationPublicationUrl")?.value.trim() || ""; const data = await api(`/api/business/communications/${publish.dataset.publishCommunication}/publish`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ investment_amount: Number(investment), external_publication_url: externalUrl }) }); const item = state.communications.find((row) => String(row.id) === String(publish.dataset.publishCommunication)); if (item) Object.assign(item, data.communication); state.communicationsLoaded = false; await loadCommunications({ force: true }); render(); showFeedback("Publicación registrada. Usa el texto copiado con el enlace medido de Qori.", "success", { title: "Publicación medida" }); } catch (error) { showFeedback(error.message || "No se pudo registrar la publicación.", "error", { title: "Publicación" }); } return; }
    if (send) { const recipients = selectedRecipients(); if (!recipients.length) { showFeedback("Selecciona al menos un contacto que tenga email.", "info", { title: "Destinatarios" }); return; } if (!document.getElementById("communicationConsentInput")?.checked) { showFeedback("Confirma el consentimiento antes de enviar.", "info", { title: "Consentimiento requerido" }); return; } try { showFeedback("Enviando emails…", "loading", { title: "Comunicación", timeout: 0 }); const data = await api(`/api/business/communications/${send.dataset.sendCommunication}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) }); state.communicationSelectedRefs = []; state.communicationsLoaded = false; await loadCommunications({ force: true }); render(); const results = data.results || {}; const feedbackType = Number(results.sent || 0) ? "success" : "error"; showFeedback(`Envío finalizado: ${results.sent || 0} enviados, ${results.failed || 0} fallidos.`, feedbackType, { title: Number(results.sent || 0) ? "Comunicación enviada" : "No se enviaron correos" }); } catch (error) { showFeedback(error.message || "No se pudo completar el envío.", "error", { title: "Comunicación" }); } }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-communication-recipient]")) { const selected = new Set(state.communicationSelectedRefs || []); if (event.target.checked && selected.size >= MAX_EMAIL_RECIPIENTS) { event.target.checked = false; showFeedback(`Puedes seleccionar hasta ${MAX_EMAIL_RECIPIENTS} contactos por envío.`, "info", { title: "Destinatarios" }); return; } if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value); state.communicationSelectedRefs = Array.from(selected); render(); renderComposerAudience(); }
    if (event.target.matches('input[name="communicationType"]')) toggleComposer();
    if (event.target.matches("#communicationImageUploadInput")) addMediaFiles(event.target.files).finally(() => { event.target.value = ""; });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && composerIsOpen()) { composerModal()?.classList.add("hidden"); document.body.classList.remove("communication-composer-open"); }
  });
  document.addEventListener("click", (event) => {
    const modal = composerModal();
    if (modal && event.target === modal) { modal.classList.add("hidden"); document.body.classList.remove("communication-composer-open"); }
  });
  document.getElementById("communicationAudienceFilters")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; state.communicationAudienceFilters = { search: form.querySelector("#communicationAudienceSearch")?.value.trim() || "", interest: form.querySelector("#communicationAudienceInterest")?.value.trim() || "", city: form.querySelector("#communicationAudienceCity")?.value.trim() || "", has_purchases: form.querySelector("#communicationAudiencePurchases")?.value || "", score_min: form.querySelector("#communicationAudienceScore")?.value || "" }; state.communicationSelectedRefs = []; try { await loadAudience(); render(); } catch (error) { showFeedback(error.message || "No se pudo filtrar la audiencia.", "error", { title: "Audiencia" }); } });
  document.getElementById("communicationComposerForm")?.addEventListener("submit", save);
  document.getElementById("communicationComposerForm")?.addEventListener("input", (event) => { if (event.target.matches("#communicationImageInput") || event.target.matches("#communicationActionUrlInput")) toggleComposer(); });
  window.renderCommunicationsView = render;
  window.loadBusinessCommunications = loadCommunications;
  window.loadCommunicationAudience = loadAudience;
})();
