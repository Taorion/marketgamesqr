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
  const emailFailureNote = (results = {}) => {
    const reasons = Array.isArray(results.failure_reasons) ? results.failure_reasons : [];
    if (!reasons.length) return "";
    return ` Causa: ${reasons.slice(0, 2).map((item) => `${Number(item?.count || 0)}: ${String(item?.message || "Error de entrega")}`).join(" · ")}`;
  };
  const communicationHistorySelection = () => Array.from(new Set(state.communicationHistorySelectedIds || []));
  const runCommunicationBulkRequests = async (items, request, concurrency = 5) => {
    const queue = Array.from(items || []);
    const results = [];
    const workers = Array.from({ length: Math.min(Math.max(1, concurrency), queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift();
        try { results.push({ item, ok: true, value: await request(item) }); }
        catch (error) { results.push({ item, ok: false, error }); }
      }
    });
    await Promise.all(workers);
    return results;
  };
  const runCommunicationHistoryBulk = async (operation) => {
    const ids = communicationHistorySelection();
    if (!ids.length) return;
    const items = (state.communications || []).filter((item) => ids.includes(String(item.id)));
    if (!items.length) return;
    const isDelete = operation === "delete";
    const confirmation = isDelete
      ? `¿Borrar ${items.length} comunicación(es)? Se eliminarán sus destinatarios y su historial de entrega. No se borrarán contactos ni ventas.`
      : `¿Archivar ${items.length} comunicación(es)? Se conservará el historial, pero dejarán de estar disponibles para nuevos envíos.`;
    if (!window.confirm(confirmation)) return;
    showFeedback(`${isDelete ? "Borrando" : "Archivando"} ${items.length} comunicación(es)...`, "loading", { title: "Operación masiva", timeout: 0 });
    const results = await runCommunicationBulkRequests(items, (item) => api(`/api/business/communications/${encodeURIComponent(item.id)}`, {
      method: isDelete ? "DELETE" : "PATCH",
      headers: authHeaders(),
      ...(isDelete ? {} : { body: JSON.stringify({ status: "ARCHIVED" }) }),
    }));
    const completed = results.filter((result) => result.ok).map((result) => String(result.item.id));
    state.communicationHistorySelectedIds = [];
    state.communicationSelectedRefs = [];
    state.communicationWhatsAppQueue = null;
    state.communicationsLoaded = false;
    await loadCommunications({ force: true });
    state.selectedCommunicationId = state.communications.find((item) => String(item.id) === String(state.selectedCommunicationId))?.id
      || state.communications.find((item) => String(item.status || "").toUpperCase() !== "ARCHIVED")?.id
      || state.communications[0]?.id
      || null;
    render();
    const failed = results.length - completed.length;
    showFeedback(`${completed.length} comunicación(es) ${isDelete ? "borradas" : "archivadas"}${failed ? `. ${failed} no se pudieron procesar.` : "."}`, failed ? "info" : "success", { title: "Operación masiva" });
  };
  const readJson = (value, fallback = []) => { try { const parsed = JSON.parse(value || ""); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; } };
  const isSocialCommunication = (item) => ["SOCIAL", "MIXED"].includes(String(item?.communication_type || "").toUpperCase());
  const isEmailCommunication = (item) => ["EMAIL", "MIXED"].includes(String(item?.communication_type || "").toUpperCase());
  const isWhatsAppCommunication = (item) => String(item?.communication_type || "").toUpperCase() === "WHATSAPP";
  const communicationTypeLabel = (type) => ({ EMAIL: "Email", SOCIAL: "Publicación", MIXED: "Email + publicación", WHATSAPP: "WhatsApp" }[String(type || "").toUpperCase()] || "Comunicación");
  const communicationHistoryState = (item = {}) => {
    const status = String(item.status || "DRAFT").toUpperCase();
    const sent = Number(item.recipients_sent || 0);
    if (status === "ARCHIVED") return { label: "Archivada", tone: "archived", icon: "inventory_2" };
    if (isWhatsAppCommunication(item) && sent) return { label: "Enviada a Meta", tone: "sent", icon: "task_alt" };
    if (isSocialCommunication(item) && String(item.publication_status || "").toUpperCase() === "PUBLISHED") return { label: "Publicada", tone: "published", icon: "public" };
    if (status === "SENT" || sent) return { label: "Enviada", tone: "sent", icon: "task_alt" };
    if (status === "READY") return { label: "Lista para enviar", tone: "ready", icon: "schedule_send" };
    return { label: "Borrador", tone: "draft", icon: "edit_note" };
  };
  const communicationHistoryDate = (value) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin fecha" : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const whatsAppTemplateParameters = (value) => String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const whatsAppTemplateSelection = () => {
    const select = document.getElementById("communicationWhatsAppTemplateInput");
    const selected = select?.selectedOptions?.[0];
    return {
      name: String(select?.value || "").trim(),
      language: String(selected?.dataset.language || "es_CO").trim() || "es_CO",
      variable_count: Number(selected?.dataset.variables || 0),
      body_parameters: whatsAppTemplateParameters(document.getElementById("communicationWhatsAppTemplateParametersInput")?.value),
    };
  };
  const renderWhatsAppTemplateOptions = (selectedName = "", selectedParameters = []) => {
    const select = document.getElementById("communicationWhatsAppTemplateInput");
    if (!select) return;
    const templates = Array.isArray(state.communicationWhatsAppTemplates) ? state.communicationWhatsAppTemplates : [];
    select.innerHTML = `<option value="">${templates.length ? "Elige una plantilla aprobada" : "Conecta WhatsApp Business en Cuenta y carga plantillas"}</option>${templates.map((template) => `<option value="${esc(template.name)}" data-language="${esc(template.language || "es_CO")}" data-variables="${Number(template.variable_count || 0)}">${esc(template.name)} · ${esc(template.language || "es_CO")}${Number(template.variable_count || 0) ? ` · ${Number(template.variable_count)} variable(s)` : " · sin variables"}</option>`).join("")}`;
    select.value = selectedName || "";
    const parameters = document.getElementById("communicationWhatsAppTemplateParametersInput");
    if (parameters) parameters.value = Array.isArray(selectedParameters) ? selectedParameters.join("\n") : "";
    updateWhatsAppTemplateHelp();
  };
  const updateWhatsAppTemplateHelp = () => {
    const template = whatsAppTemplateSelection();
    const help = document.getElementById("communicationWhatsAppTemplateHelp");
    const field = document.getElementById("communicationWhatsAppTemplateParametersField");
    const label = document.getElementById("communicationWhatsAppTemplateParametersLabel");
    const input = document.getElementById("communicationWhatsAppTemplateParametersInput");
    const preview = document.getElementById("communicationWhatsAppTemplatePreview");
    const selectedTemplate = (state.communicationWhatsAppTemplates || []).find((item) => String(item.name) === template.name && String(item.language || "es_CO") === template.language);
    if (!help) return;
    if (preview) {
      preview.classList.toggle("hidden", !template.name);
      preview.innerHTML = template.name ? `<span class="material-symbols-outlined">preview</span><div><span class="mono-label">Vista de la plantilla aprobada</span><strong>${esc(template.name)} · ${esc(template.language)}</strong><p>${esc(selectedTemplate?.body || "Meta no entregó una vista previa del texto.")}</p></div>` : "";
    }
    if (!template.name) {
      field?.classList.remove("hidden");
      if (label) label.textContent = "Variables de plantilla, una por línea";
      help.textContent = "Selecciona una plantilla aprobada. Qori no enviará texto libre fuera de la ventana permitida por WhatsApp.";
      return;
    }
    if (!template.variable_count) {
      if (input) input.value = "";
      field?.classList.add("hidden");
      help.textContent = "Esta plantilla se envía tal como fue aprobada en Meta: no necesitas escribir variables ni mensaje adicional.";
      return;
    }
    field?.classList.remove("hidden");
    if (label) label.textContent = template.variable_count === 1 ? "Dato que reemplazará {{1}}" : `${template.variable_count} datos, una línea por cada variable`;
    help.textContent = `Meta espera ${template.variable_count} variable(s). Qori envía cada línea en orden. Puedes usar {{nombre}}, {{contacto}}, {{interes}} y {{enlace}}.`;
  };
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
  const normalizedWhatsAppPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
  };
  const hasWhatsApp = (contact) => Boolean(normalizedWhatsAppPhone(contact?.phone).length >= 7);
  const selectedRecipients = (channel = "email") => {
    const selected = new Set(state.communicationSelectedRefs || []);
    const isReady = channel === "whatsapp" ? hasWhatsApp : hasEmail;
    const phones = new Set();
    return (state.communicationAudience || []).filter((contact) => {
      if (!selected.has(refKey(contact)) || !isReady(contact)) return false;
      if (channel !== "whatsapp") return true;
      const phone = normalizedWhatsAppPhone(contact.phone);
      if (phones.has(phone)) return false;
      phones.add(phone);
      return true;
    });
  };
  const emailReadyContacts = (channel = "email") => {
    const phones = new Set();
    return (state.communicationAudience || []).filter((contact) => {
      if (channel !== "whatsapp") return hasEmail(contact);
      if (!hasWhatsApp(contact)) return false;
      const phone = normalizedWhatsAppPhone(contact.phone);
      if (phones.has(phone)) return false;
      phones.add(phone);
      return true;
    });
  };
  const setAudienceSelection = (mode = "email") => {
    const current = new Set(state.communicationSelectedRefs || []);
    if (mode === "clear") {
      state.communicationSelectedRefs = [];
      return 0;
    }
    const available = Math.max(0, MAX_EMAIL_RECIPIENTS - current.size);
    const phones = new Set();
    emailReadyContacts(mode).filter((contact) => {
      if (current.has(refKey(contact))) return false;
      if (mode !== "whatsapp") return true;
      const phone = normalizedWhatsAppPhone(contact.phone);
      if (phones.has(phone)) return false;
      phones.add(phone);
      return true;
    }).slice(0, available).forEach((contact) => current.add(refKey(contact)));
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
  const communicationActionUrl = (item) => item?.web_showcase_slug ? item.action_url || `${window.location.origin}/c/${encodeURIComponent(item.web_showcase_slug)}` : item?.tracking_url || item?.action_url || "";
  const socialShareContent = (item) => [item?.social_copy, communicationActionUrl(item)].filter(Boolean).join("\n\n");

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

  function communicationDeliveryCopy(item = {}) {
    if (isWhatsAppCommunication(item)) return item.whatsapp_body || item.metadata?.whatsapp_template?.body || (item.metadata?.whatsapp_template?.name ? `Plantilla de Meta: ${item.metadata.whatsapp_template.name}` : "Sin plantilla registrada.");
    if (isEmailCommunication(item)) return [item.subject, item.email_body].filter(Boolean).join("\n\n") || "Sin contenido registrado.";
    return item.social_copy || "Sin contenido registrado.";
  }

  function ensureCommunicationDeliverySummaryModal() {
    let modal = document.getElementById("communicationDeliverySummaryModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "communicationDeliverySummaryModal";
    modal.className = "modal-shell hidden communication-delivery-summary-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "communicationDeliverySummaryTitle");
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-close-communication-delivery-summary]")) {
        modal.classList.add("hidden");
        document.body.classList.remove("communication-delivery-summary-open");
      }
    });
    return modal;
  }

  function openCommunicationDeliverySummary(item) {
    if (!item) return;
    const modal = ensureCommunicationDeliverySummaryModal();
    const isWhatsApp = isWhatsAppCommunication(item);
    const whatsAppOfficial = isWhatsApp && Number(item.recipients_sent || 0) > 0;
    const deliveryLabel = isWhatsApp ? (whatsAppOfficial ? "WhatsApp masivo oficial" : "WhatsApp listo para enviar") : isEmailCommunication(item) ? "Email masivo" : "Publicación medida";
    const deliveryState = isWhatsApp && whatsAppOfficial
      ? `${Number(item.recipients_sent || 0)} aceptados por Meta · ${Number(item.recipients_delivered || 0)} entregados · ${Number(item.recipients_read || 0)} leídos · ${Number(item.recipients_failed || 0)} fallidos`
      : isWhatsApp
        ? `${Number(item.recipients_prepared || 0)} preparados · ${Number(item.recipients_queued || 0)} en cola`
      : `${Number(item.recipients_sent || 0)} enviados · ${Number(item.recipients_failed || 0)} fallidos`;
    const deliveryMetric = isWhatsApp
      ? `<article><span>${whatsAppOfficial ? "Aceptados" : "Preparados"}</span><strong>${whatsAppOfficial ? Number(item.recipients_sent || 0) : Number(item.recipients_prepared || 0)}</strong><small>${whatsAppOfficial ? "recibidos por Meta" : "WhatsApps abiertos"}</small></article>${whatsAppOfficial ? `<article><span>Entregados</span><strong>${Number(item.recipients_delivered || 0)}</strong><small>${Number(item.recipients_read || 0)} leídos</small></article>` : ""}`
      : `<article><span>Enviados</span><strong>${Number(item.recipients_sent || 0)}</strong><small>emails enviados</small></article>`;
    modal.innerHTML = `<article class="modal-card communication-delivery-summary-card"><header><div><span class="mono-label">Resumen de comunicación</span><h3 id="communicationDeliverySummaryTitle">${esc(item.title || "Comunicación")}</h3><p>${esc(deliveryLabel)} · ${esc(statusLabel(item.status))}</p></div><button class="icon-button" type="button" data-close-communication-delivery-summary aria-label="Cerrar resumen"><span class="material-symbols-outlined">close</span></button></header><section class="communication-delivery-summary-metrics"><article><span>Audiencia</span><strong>${Number(item.recipients_total || 0)}</strong><small>contactos del lote</small></article>${deliveryMetric}<article><span>Leads</span><strong>${Number(item.leads || 0)}</strong><small>desde la pieza</small></article><article><span>Ventas</span><strong>${Number(item.sales || 0)}</strong><small>${metricMoney(item.revenue)}</small></article><article><span>CAC</span><strong>${item.cac === null ? "—" : metricMoney(item.cac)}</strong><small>por cliente</small></article><article><span>ROI</span><strong>${item.roi === null ? "—" : `${(Number(item.roi) * 100).toFixed(0)}%`}</strong><small>resultado atribuido</small></article></section><section class="communication-delivery-summary-context"><div><span class="mono-label">Estado de entrega</span><strong>${esc(deliveryState)}</strong><small>${isWhatsApp ? (whatsAppOfficial ? "Meta aceptó el envío. Las entregas y lecturas aparecen cuando el webhook de WhatsApp recibe las actualizaciones." : "El lote aún no se ha enviado a Meta.") : "Los fallidos se registran para poder revisar la audiencia."}</small></div><div><span class="mono-label">Conexión comercial</span><strong>${esc(item.campaign_name || "Sin campaña")}</strong><small>${esc(item.channel_name || "Sin canal")} · ${esc(item.activation_name || "Sin activación")}</small></div></section><section class="communication-delivery-summary-message"><span class="mono-label">Mensaje enviado o preparado</span><pre>${esc(communicationDeliveryCopy(item))}</pre></section></article>`;
    modal.classList.remove("hidden");
    document.body.classList.add("communication-delivery-summary-open");
    modal.querySelector("[data-close-communication-delivery-summary]")?.focus();
  }

  async function loadCommunications(options = {}) {
    if (!session?.user?.business_id || state.communicationsLoading || (state.communicationsLoaded && !options.force)) return;
    state.communicationsLoading = true;
    try {
      if (!state.communicationWhatsAppConnectionLoaded && typeof window.loadCommunicationWhatsAppConnection === "function") await window.loadCommunicationWhatsAppConnection();
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
  if (!state.businessBranchesLoaded && !state.businessBranchesLoading && typeof window.loadBusinessBranches === "function") {
      window.loadBusinessBranches().then(() => renderOptions()).catch(() => {});
    }
    const options = (items, label) => (items || []).map((item) => `<option value="${esc(item.id)}">${esc(label(item))}</option>`).join("");
    const campaign = document.getElementById("communicationCampaignInput");
    const channel = document.getElementById("communicationChannelInput");
    const branch = document.getElementById("communicationBranchInput");
    const activation = document.getElementById("communicationActivationInput");
    const showcase = document.getElementById("communicationWebShowcaseInput");
    const product = document.getElementById("communicationWebShowcaseProductInput");
    const selectedCampaign = campaign?.value || "";
    const selectedChannel = channel?.value || "";
    const selectedBranch = branch?.value || "";
    const selectedActivation = activation?.value || "";
    const selectedShowcase = showcase?.value || state.communicationPendingShowcaseId || "";
    const selectedProduct = product?.value || product?.dataset.selectedProduct || state.communicationPendingProductId || "";
    if (campaign) campaign.innerHTML = '<option value="">Sin campaña</option>' + options(state.campaigns, (item) => item.name || item.title || "Campaña");
    if (channel) channel.innerHTML = '<option value="">Sin canal</option>' + options(state.acquisitionChannels, (item) => [item.name || item.channel_name || "Canal", item.platform].filter(Boolean).join(" · "));
    if (activation) activation.innerHTML = '<option value="">Sin activación</option>' + options(state.triviaLaunchers, (item) => item.title || "Activación");
    if (showcase) showcase.innerHTML = '<option value="">Sin vitrina web</option>' + options(state.smartCatalogs, (item) => `${item.title || "Vitrina web"}${String(item.status || "").toUpperCase() === "ACTIVE" ? "" : " · No publicada"}`);
    if (branch) branch.innerHTML = '<option value="">Sin sede asignada</option>' + options((state.businessBranches || []).filter((item) => item.is_active !== false), (item) => item.name || "Sede");
    if (campaign) campaign.value = selectedCampaign;
    if (channel) channel.value = selectedChannel;
    if (branch) branch.value = selectedBranch;
    if (activation) activation.value = selectedActivation;
    if (showcase) showcase.value = selectedShowcase;
    if (product) {
      const showcaseId = showcase?.value || "";
      const ready = showcaseId && String(state.communicationShowcaseProductsCatalogId || "") === String(showcaseId);
      product.disabled = !ready;
      product.innerHTML = ready
        ? '<option value="">Toda la vitrina web</option>' + options(state.communicationShowcaseProducts, (item) => `${item.name || "Producto"}${item.price !== null && item.price !== undefined ? ` · ${metricMoney(item.price)}` : ""}`)
        : `<option value="">${showcaseId ? "Cargando productos..." : "Primero elige una vitrina web"}</option>`;
      if (ready) product.value = selectedProduct;
    }
    const promotion = state.communicationPendingPromotion || null;
    const promotionEnabled = document.getElementById("communicationProductPromotionEnabledInput");
    if (promotionEnabled) promotionEnabled.checked = Boolean(promotion);
    if (promotion) {
      const startsAt = promotion.starts_at ? new Date(promotion.starts_at).toISOString().slice(0, 16) : "";
      const endsAt = promotion.ends_at ? new Date(promotion.ends_at).toISOString().slice(0, 16) : "";
      document.getElementById("communicationProductPromotionLabelInput").value = promotion.label || "";
      document.getElementById("communicationProductPromotionPriceInput").value = promotion.promotional_price ?? "";
      document.getElementById("communicationProductPromotionStartsAtInput").value = startsAt;
      document.getElementById("communicationProductPromotionEndsAtInput").value = endsAt;
    }
    toggleProductPromotionFields();
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
    const deliveryChannel = document.querySelector('input[name="communicationType"]:checked')?.value === "WHATSAPP" ? "whatsapp" : "email";
    const audienceSection = document.getElementById("communicationComposerAudience");
    const audienceTitle = document.getElementById("communicationComposerAudienceTitle");
    const audienceLabel = audienceSection?.querySelector(".communication-composer-section-head .mono-label");
    const audienceHelp = audienceSection?.querySelector(".communication-composer-section-head small");
    const selectAll = audienceSection?.querySelector("[data-composer-select-audience]");
    if (deliveryChannel === "whatsapp") {
      if (audienceLabel) audienceLabel.textContent = "Audiencia de WhatsApp";
      if (audienceTitle) audienceTitle.textContent = "Elige quién recibirá este WhatsApp";
      if (audienceHelp) audienceHelp.textContent = "Filtra y selecciona los contactos que aceptaron recibir WhatsApp. Qori enviará solo una vez por número.";
      if (selectAll) selectAll.textContent = `Seleccionar hasta ${MAX_EMAIL_RECIPIENTS} con WhatsApp`;
    } else {
      if (audienceLabel) audienceLabel.textContent = "Audiencia de email";
      if (audienceTitle) audienceTitle.textContent = "Elige quién recibirá esta comunicación";
      if (audienceHelp) audienceHelp.textContent = "Filtra primero y selecciona solo los contactos a los que quieres escribir. Este paso se oculta para una publicación exclusiva de redes.";
      if (selectAll) selectAll.textContent = `Seleccionar hasta ${MAX_EMAIL_RECIPIENTS} con email`;
    }
    const contacts = state.communicationAudience || [];
    const ready = emailReadyContacts(deliveryChannel);
    const recipients = selectedRecipients(deliveryChannel);
    count.textContent = state.communicationAudienceLoading
      ? "Cargando contactos…"
      : contacts.length
        ? `${recipients.length} de ${MAX_EMAIL_RECIPIENTS} seleccionado${recipients.length === 1 ? "" : "s"} · mostrando ${contacts.length} de ${state.communicationAudienceTotal || contacts.length} contactos (${ready.length} con ${deliveryChannel === "whatsapp" ? "WhatsApp" : "email"})`
        : "Usa los filtros para encontrar contactos.";
    list.innerHTML = state.communicationAudienceLoading
      ? '<div class="communication-composer-audience-empty"><span class="material-symbols-outlined">hourglass_top</span><span>Cargando contactos disponibles…</span></div>'
      : contacts.length
        ? contacts.map((contact) => {
          const deliverable = deliveryChannel === "whatsapp" ? hasWhatsApp(contact) : hasEmail(contact);
          const selectedContact = selected.has(refKey(contact));
          const profile = contact.audience_type === "CLIENT" ? "Cliente" : "Lead";
          return `<label class="communication-composer-contact ${selectedContact ? "is-selected" : ""} ${deliverable ? "" : "is-unavailable"}"><input type="checkbox" data-communication-recipient value="${esc(refKey(contact))}" ${selectedContact ? "checked" : ""} ${deliverable ? "" : "disabled"}><span class="communication-contact-avatar">${esc((contact.name || "C").slice(0, 1).toUpperCase())}</span><span class="communication-composer-contact-copy"><strong>${esc(contact.name || "Contacto sin nombre")}</strong><small>${esc([profile, contact.interest || "Sin interés registrado", `RMS: ${rmsPhaseLabel(contact.rms_phase)}`].join(" · "))}</small></span><span class="communication-contact-delivery ${deliverable ? "is-ready" : ""}">${deliverable ? esc(deliveryChannel === "whatsapp" ? contact.phone : contact.email) : deliveryChannel === "whatsapp" ? "Sin WhatsApp" : "Sin email"}</span></label>`;
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
    if (typeof loadSmartCatalogData === "function") {
      await loadSmartCatalogData({ force: true, quiet: true });
    }
  }

  async function loadCommunicationShowcaseProducts(catalogId) {
    state.communicationShowcaseProducts = [];
    state.communicationShowcaseProductsCatalogId = null;
    if (!catalogId) return;
    const data = await api(`/api/business/catalogs/${encodeURIComponent(catalogId)}`, { headers: authHeaders() });
    state.communicationShowcaseProducts = data.products || [];
    state.communicationShowcaseProductsCatalogId = catalogId;
  }

  function toggleProductPromotionFields() {
    const enabled = Boolean(document.getElementById("communicationProductPromotionEnabledInput")?.checked);
    const fields = document.getElementById("communicationProductPromotionFields");
    fields?.classList.toggle("hidden", !enabled);
    ["communicationProductPromotionLabelInput", "communicationProductPromotionPriceInput", "communicationProductPromotionStartsAtInput", "communicationProductPromotionEndsAtInput"].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.required = enabled;
    });
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
    if (type === "WHATSAPP") {
      const template = whatsAppTemplateSelection();
      preview.innerHTML = `<span class="material-symbols-outlined">chat</span><div><strong>${template.name ? `WhatsApp listo: ${esc(template.name)}` : "Elige una plantilla de WhatsApp"}</strong><small>${template.name ? "Qori enviará el texto aprobado por Meta; solo necesitas seleccionar la audiencia y confirmar el consentimiento." : "Carga y selecciona una plantilla aprobada antes de enviar."}</small></div>`;
      return;
    }
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
    const activeCommunication = communications.find((item) => String(item.id) === String(state.selectedCommunicationId));
    const audienceChannel = isWhatsAppCommunication(activeCommunication) ? "whatsapp" : "email";
    const canDeleteCommunications = ["BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_Qori"].includes(session?.user?.role);
    const sentHistory = communications.filter((item) => Number(item.recipients_sent || 0) > 0 || String(item.status || "").toUpperCase() === "SENT");
    const failedHistory = communications.reduce((total, item) => total + Number(item.recipients_failed || 0), 0);
    list.innerHTML = communications.length ? `<div class="communication-history-overview"><div><span class="mono-label">Historial</span><strong>${communications.length} comunicación${communications.length === 1 ? "" : "es"}</strong><small>Guardadas para consulta y reutilización</small></div><div><span>Enviadas</span><strong>${sentHistory.length}</strong></div><div><span>Fallidos</span><strong>${failedHistory}</strong></div></div>` + communications.map((item) => {
      const media = mediaFor(item);
      const historyState = communicationHistoryState(item);
      const deliveryLabel = isWhatsAppCommunication(item) ? "aceptados por Meta" : "enviados";
      return `<article class="communication-list-item communication-history-item is-${historyState.tone} ${String(item.id) === String(state.selectedCommunicationId) ? "is-selected" : ""}" data-communication-select="${esc(item.id)}"><span class="communication-history-icon material-symbols-outlined">${historyState.icon}</span><div class="communication-history-copy"><div class="communication-history-topline"><span class="communication-history-chip is-${historyState.tone}">${esc(historyState.label)}</span><span class="mono-label">${esc(communicationTypeLabel(item.communication_type))}</span></div><strong>${esc(item.title)}</strong><p>${esc(item.web_showcase_title ? `Vitrina web: ${item.web_showcase_title}` : item.campaign_name || item.channel_name || item.activation_name || "Sin relación comercial")}</p><div class="communication-history-foot"><span>${esc(communicationHistoryDate(item.updated_at || item.created_at))}</span>${media.length ? `<span><span class="material-symbols-outlined">image</span>${media.length}</span>` : ""}</div></div><div class="communication-list-item-meta"><strong>${Number(item.recipients_sent || 0)}</strong><small>${deliveryLabel}</small>${Number(item.recipients_failed || 0) ? `<em>${Number(item.recipients_failed || 0)} fallido${Number(item.recipients_failed || 0) === 1 ? "" : "s"}</em>` : `<span>${Number(item.recipients_total || 0)} destinatarios</span>`}<span class="material-symbols-outlined">arrow_forward</span></div></article>`;
    }).join("") : '<div class="communication-empty-state"><span class="material-symbols-outlined">mail</span><strong>Aún no has creado comunicaciones.</strong><p>Crea una pieza y úsala en email, redes o ambos canales.</p></div>';
    const historyIds = communications.map((item) => String(item.id));
    const historySelected = new Set(communicationHistorySelection().filter((id) => historyIds.includes(String(id))));
    state.communicationHistorySelectedIds = Array.from(historySelected);
    const historyOverview = list.querySelector(".communication-history-overview");
    if (historyOverview) {
      historyOverview.insertAdjacentHTML("beforeend", `<div class="communication-history-bulk" aria-live="polite"><strong>${historySelected.size} seleccionada${historySelected.size === 1 ? "" : "s"}</strong><div><button class="ghost-button compact" type="button" data-communication-history-select-visible>${historySelected.size === historyIds.length ? "Limpiar" : "Seleccionar visibles"}</button><button class="ghost-button compact" type="button" data-communication-history-archive ${historySelected.size ? "" : "disabled"}>Archivar</button>${canDeleteCommunications ? `<button class="communication-delete-button compact" type="button" data-communication-history-delete ${historySelected.size ? "" : "disabled"}>Borrar historial</button>` : ""}</div></div>`);
    }
    list.querySelectorAll("[data-communication-select]").forEach((item) => {
      const id = String(item.dataset.communicationSelect || "");
      const marked = historySelected.has(id);
      item.classList.toggle("is-bulk-selected", marked);
      item.insertAdjacentHTML("afterbegin", `<label class="communication-history-select" data-communication-history-select-control title="Seleccionar comunicación"><input type="checkbox" data-communication-history-select="${esc(id)}" aria-label="Seleccionar comunicación" ${marked ? "checked" : ""}><span></span></label>`);
    });
    const selected = new Set(state.communicationSelectedRefs || []);
    const ready = emailReadyContacts(audienceChannel);
    summary.textContent = state.communicationAudienceLoading
      ? "Cargando contactos…"
      : `${state.communicationAudienceTotal || state.communicationAudience.length} contactos · ${ready.length} con ${audienceChannel === "whatsapp" ? "WhatsApp" : "email"}${state.communicationAudienceCapped ? " · se muestran los primeros 120" : ""}`;
    audience.innerHTML = state.communicationAudienceLoading
      ? '<div class="communication-empty-state compact"><span class="material-symbols-outlined">hourglass_top</span><strong>Cargando contactos disponibles…</strong></div>'
      : state.communicationAudience.length
        ? state.communicationAudience.map((contact) => {
          const deliverable = audienceChannel === "whatsapp" ? hasWhatsApp(contact) : hasEmail(contact);
          const selectedContact = selected.has(refKey(contact));
          return `<label class="communication-contact-row ${selectedContact ? "is-selected" : ""} ${deliverable ? "" : "is-unavailable"}"><input type="checkbox" data-communication-recipient value="${esc(refKey(contact))}" ${selectedContact ? "checked" : ""} ${deliverable ? "" : "disabled"}><span class="communication-contact-avatar">${esc((contact.name || "C").slice(0, 1).toUpperCase())}</span><span class="communication-contact-copy"><strong>${esc(contact.name || "Contacto sin nombre")}</strong><small>${esc(contact.interest || "Sin interés registrado")}</small></span><span class="communication-contact-delivery ${deliverable ? "is-ready" : ""}">${deliverable ? esc(audienceChannel === "whatsapp" ? contact.phone : contact.email) : audienceChannel === "whatsapp" ? "Sin WhatsApp" : "Sin email"}</span><span class="communication-contact-metrics"><strong>${Number(contact.purchase_count || 0)}</strong><small>compras</small></span></label>`;
        }).join("")
        : '<div class="communication-empty-state compact"><strong>No encontramos contactos con estos filtros.</strong><p>Prueba removiendo un filtro.</p></div>';
    const recipients = selectedRecipients(audienceChannel);
    selectedSummary.textContent = `${recipients.length} con email seleccionado${recipients.length === 1 ? "" : "s"}`;
    if (audienceChannel === "whatsapp") selectedSummary.textContent = `${recipients.length} con WhatsApp seleccionado${recipients.length === 1 ? "" : "s"}`;
    const active = activeCommunication;
    if (!active) { sendBar.innerHTML = '<span class="material-symbols-outlined">touch_app</span><p>Elige una comunicación para preparar su envío.</p>'; return; }
    const media = mediaFor(active);
    if (selectedPiece && active) { const historyState = communicationHistoryState(active); selectedPiece.innerHTML = `<div><div class="communication-selected-status"><span class="communication-history-chip is-${historyState.tone}">${esc(historyState.label)}</span><span>${esc(communicationHistoryDate(active.updated_at || active.created_at))}</span></div><span class="mono-label">Pieza seleccionada</span><strong>${esc(active.title)}</strong><p>${esc(active.subject || active.social_copy || "Aún sin texto de salida.")}</p><div class="communication-delivery-metrics"><span><b>${Number(active.recipients_total || 0)}</b> destinatarios</span><span><b>${Number(active.recipients_sent || 0)}</b> enviados</span><span><b>${Number(active.recipients_failed || 0)}</b> fallidos</span><span><b>${Number(active.views || 0)}</b> visitas</span><span><b>${Number(active.leads || 0)}</b> leads</span><span><b>${Number(active.completions || 0)}</b> activaciones</span><span><b>${Number(active.sales || 0)}</b> ventas</span><span><b>${metricMoney(active.revenue)}</b> revenue</span><span><b>${active.cac === null ? "—" : metricMoney(active.cac)}</b> CAC</span><span><b>${active.roi === null ? "—" : `${(Number(active.roi) * 100).toFixed(0)}%`}</b> ROI</span></div></div><div class="communication-selected-actions"><button class="ghost-button compact" type="button" data-edit-communication="${esc(active.id)}">Editar</button><button class="ghost-button compact" type="button" data-duplicate-communication="${esc(active.id)}">Duplicar</button><button class="ghost-button compact" type="button" data-archive-communication="${esc(active.id)}" ${String(active.status).toUpperCase() === "ARCHIVED" ? "disabled" : ""}>Archivar</button>${canDeleteCommunications ? `<button class="communication-delete-button compact" type="button" data-delete-communication="${esc(active.id)}"><span class="material-symbols-outlined">delete</span>Borrar</button>` : ""}</div>`; }
    if (selectedPiece && Number(active.recipients_total || 0) > 0) {
      const actions = selectedPiece.querySelector(".communication-selected-actions");
      if (actions && !actions.querySelector("[data-open-communication-delivery-summary]")) actions.insertAdjacentHTML("afterbegin", `<button class="ghost-button compact" type="button" data-open-communication-delivery-summary="${esc(active.id)}">Ver resumen</button>`);
    }
    if (selectedPiece && isWhatsAppCommunication(active)) {
      const description = selectedPiece.querySelector("p");
      if (description) description.textContent = communicationDeliveryCopy(active);
      const metrics = selectedPiece.querySelector(".communication-delivery-metrics");
      if (metrics && Number(active.recipients_sent || 0) > 0) metrics.insertAdjacentHTML("beforeend", `<span><b>${Number(active.recipients_delivered || 0)}</b> entregados</span><span><b>${Number(active.recipients_read || 0)}</b> leídos</span>`);
    }
    const mediaNote = media.length ? `${media.length} imagen${media.length === 1 ? "" : "es"} adjunta${media.length === 1 ? "" : "s"}.` : "Sin adjuntos.";
    if (String(active.status).toUpperCase() === "ARCHIVED") { sendBar.innerHTML = '<span class="material-symbols-outlined">inventory_2</span><div><strong>Comunicación archivada</strong><p>Conserva su historial de entrega. Duplícala para crear una nueva versión enviable.</p></div>'; return; }
    if (isWhatsAppCommunication(active)) {
      const dispatch = state.communicationWhatsAppQueue?.communicationId === active.id ? state.communicationWhatsAppQueue : null;
      const next = dispatch?.queue?.find((item) => item.status === "QUEUED");
      const prepared = Number(dispatch?.prepared ?? active.recipients_prepared ?? 0);
      const queued = Number(dispatch?.queued ?? active.recipients_queued ?? 0);
      const template = active.metadata?.whatsapp_template || {};
      const connected = Boolean(state.communicationWhatsAppConnection?.ready);
      const templateReady = Boolean(template.name);
      const automaticCopy = !connected
        ? "Conecta WhatsApp Business en Cuenta para habilitar el envío oficial por lotes."
        : !templateReady
          ? "Esta pieza no tiene una plantilla aprobada. Edítala, elige una plantilla de Meta y guarda."
          : recipients.length
            ? `${recipients.length} contacto(s) seleccionados. Meta recibirá hasta 6 envíos simultáneos y Qori guardará cada resultado.`
            : "Selecciona contactos con WhatsApp para enviar este lote.";
      sendBar.innerHTML = `<section class="communication-delivery-route communication-whatsapp-route"><span class="material-symbols-outlined">chat</span><div><strong>${connected && templateReady ? "WhatsApp masivo oficial" : "Configura tu envío oficial por WhatsApp"}</strong><p>${automaticCopy} ${templateReady ? `Plantilla: ${esc(template.name)} · ${esc(template.language || "es_CO")}.` : ""}</p></div><label class="communication-consent"><input id="communicationConsentInput" type="checkbox"> Confirmo que aceptaron recibir comunicaciones.</label>${connected && templateReady ? `<button class="solid-button compact" type="button" data-send-communication-whatsapp="${esc(active.id)}" ${recipients.length ? "" : "disabled"}>Enviar por WhatsApp</button>` : `<button class="ghost-button compact" type="button" data-edit-communication="${esc(active.id)}">Completar configuración</button>`}${next ? `<button class="ghost-button compact" type="button" data-open-next-communication-whatsapp="${esc(active.id)}">Abrir respaldo manual</button>` : queued ? `<button class="ghost-button compact" type="button" data-load-communication-whatsapp-queue="${esc(active.id)}">Ver cola manual</button>` : `<button class="text-button" type="button" data-prepare-communication-whatsapp="${esc(active.id)}" ${recipients.length ? "" : "disabled"}>Usar respaldo manual</button>`}</section>`;
      return;
    }
    if (isSocialCommunication(active)) {
      const published = String(active.publication_status).toUpperCase() === "PUBLISHED";
      const publicLink = communicationActionUrl(active);
      const trackingLink = published && publicLink
        ? `<a class="communication-measured-link" href="${esc(publicLink)}" target="_blank" rel="noopener">Abrir ${active.web_showcase_title ? "vitrina web" : "enlace medido"}</a>`
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
    document.querySelectorAll(".communication-email-fields").forEach((node) => node.classList.toggle("hidden", ["SOCIAL", "WHATSAPP"].includes(type)));
    document.querySelectorAll(".communication-whatsapp-fields").forEach((node) => node.classList.toggle("hidden", type !== "WHATSAPP"));
    document.querySelectorAll(".communication-social-fields").forEach((node) => node.classList.toggle("hidden", ["EMAIL", "WHATSAPP"].includes(type)));
    document.getElementById("communicationComposerAudience")?.classList.toggle("hidden", type === "SOCIAL");
    const subject = document.getElementById("communicationSubjectInput");
    const emailBody = document.getElementById("communicationEmailBodyInput");
    const whatsappBody = document.getElementById("communicationWhatsAppBodyInput");
    const socialCopy = document.getElementById("communicationSocialCopyInput");
    if (subject) subject.required = type !== "SOCIAL";
    if (emailBody) emailBody.required = type !== "SOCIAL";
    if (subject) subject.required = ["EMAIL", "MIXED"].includes(type);
    if (emailBody) emailBody.required = ["EMAIL", "MIXED"].includes(type);
    if (whatsappBody) whatsappBody.required = false;
    if (socialCopy) socialCopy.required = ["SOCIAL", "MIXED"].includes(type);
    const draft = document.getElementById("communicationComposerSaveButton");
    if (draft) draft.textContent = type === "WHATSAPP" ? "Guardar" : "Guardar borrador";
    const send = document.getElementById("communicationComposerSaveAndSendButton");
    if (send) { send.classList.toggle("hidden", type === "SOCIAL"); send.textContent = type === "WHATSAPP" ? "Enviar WhatsApp masivo" : "Guardar y enviar email"; }
    const publish = document.getElementById("communicationComposerSaveAndPublishButton");
    if (publish) publish.classList.toggle("hidden", !["SOCIAL", "MIXED"].includes(type));
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
    const whatsAppTemplate = whatsAppTemplateSelection();
    const promotionEnabled = Boolean(form.querySelector("#communicationProductPromotionEnabledInput")?.checked);
    const recipients = selectedRecipients(type === "WHATSAPP" ? "whatsapp" : "email");
    if (action === "SEND" && !recipients.length) { message.textContent = "Selecciona al menos un contacto antes de enviar."; return; }
    if (action === "SEND" && !document.getElementById("communicationComposerConsentInput")?.checked) { message.textContent = "Confirma el consentimiento antes de enviar."; return; }
    if (action === "SEND" && type === "WHATSAPP" && !whatsAppTemplate.name) { message.textContent = "Elige una plantilla aprobada de Meta antes de lanzar el lote de WhatsApp."; return; }
    if (action === "SEND" && type === "WHATSAPP" && whatsAppTemplate.variable_count !== whatsAppTemplate.body_parameters.length) { message.textContent = `La plantilla elegida espera ${whatsAppTemplate.variable_count} variable(s) y escribiste ${whatsAppTemplate.body_parameters.length}. Ajusta una línea por variable.`; return; }
    const payload = {
      title: form.querySelector("#communicationTitleInput")?.value.trim(), communication_type: form.querySelector('input[name="communicationType"]:checked')?.value || "EMAIL",
      campaign_id: form.querySelector("#communicationCampaignInput")?.value || null, channel_id: form.querySelector("#communicationChannelInput")?.value || null, branch_id: form.querySelector("#communicationBranchInput")?.value || null, activation_id: form.querySelector("#communicationActivationInput")?.value || null, web_showcase_id: form.querySelector("#communicationWebShowcaseInput")?.value || null, web_showcase_product_id: form.querySelector("#communicationWebShowcaseProductInput")?.value || null,
      product_promotion: promotionEnabled ? { label: form.querySelector("#communicationProductPromotionLabelInput")?.value.trim() || "", promotional_price: Number(form.querySelector("#communicationProductPromotionPriceInput")?.value || 0), starts_at: form.querySelector("#communicationProductPromotionStartsAtInput")?.value || "", ends_at: form.querySelector("#communicationProductPromotionEndsAtInput")?.value || "" } : null,
      subject: form.querySelector("#communicationSubjectInput")?.value.trim() || null, email_body: form.querySelector("#communicationEmailBodyInput")?.value.trim() || null, whatsapp_body: form.querySelector("#communicationWhatsAppBodyInput")?.value.trim() || null, social_copy: form.querySelector("#communicationSocialCopyInput")?.value.trim() || null,
      image_url: media[0]?.source || null, action_url: form.querySelector("#communicationActionUrlInput")?.value.trim() || null,
      audience_filters: { ...(state.communicationAudienceFilters || {}) }, metadata: { media_assets: media, ...(type === "WHATSAPP" && whatsAppTemplate.name ? { whatsapp_template: whatsAppTemplate } : {}) },
    };
    if (promotionEnabled && !payload.web_showcase_product_id) {
      const reason = "Elige el producto específico de la vitrina antes de crear una promoción temporal.";
      message.textContent = reason;
      showFeedback(reason, "info", { title: "Falta producto" });
      return;
    }
    if (action === "PUBLISH" && (!payload.channel_id || (!payload.activation_id && !payload.web_showcase_id))) {
      const reason = "Para registrar una publicación medida, selecciona el canal y una activación o vitrina web.";
      message.textContent = reason;
      showFeedback(reason, "info", { title: "Falta conectar la publicación" });
      return;
    }
    try {
      message.textContent = action === "SEND" ? (type === "WHATSAPP" ? "Guardando y enviando el lote a Meta…" : "Guardando y preparando el envío…") : action === "PUBLISH" ? "Guardando y creando el enlace medido…" : "Guardando comunicación…";
      const editingId = state.editingCommunicationId;
      const data = await api(editingId ? `/api/business/communications/${editingId}` : "/api/business/communications", { method: editingId ? "PATCH" : "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      if (action === "SEND" && type === "WHATSAPP") {
        message.textContent = "Enviando lote de WhatsApp a Meta…";
        const sent = await api(`/api/business/communications/${data.communication.id}/whatsapp/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, template: whatsAppTemplate, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) });
        const results = sent.results || {};
        const duplicateNote = Number(results.duplicate_phones || 0) ? ` Se omitieron ${results.duplicate_phones} número(s) duplicado(s).` : "";
        showFeedback(`Lote finalizado: ${results.sent || 0} aceptados por Meta, ${results.failed || 0} fallidos y ${results.skipped || 0} omitidos.${duplicateNote}${emailFailureNote(results)}`, Number(results.sent || 0) ? "success" : "error", { title: Number(results.sent || 0) ? "WhatsApp enviado" : "WhatsApp no se envió" });
      } else if (action === "SEND" && type !== "SOCIAL") {
        message.textContent = "Enviando emails…";
        const sent = await api(`/api/business/communications/${data.communication.id}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) });
        const sentCount = Number(sent.results?.sent || 0);
        const duplicateNote = Number(sent.results?.duplicate_emails || 0) ? ` Se omitieron ${sent.results.duplicate_emails} contacto${Number(sent.results.duplicate_emails) === 1 ? "" : "s"} con correo duplicado.` : "";
        showFeedback(`Envío finalizado: ${sentCount} enviados, ${sent.results?.failed || 0} fallidos y ${sent.results?.skipped || 0} omitidos.${duplicateNote}${emailFailureNote(sent.results)}`, sentCount ? "success" : "error", { title: sentCount ? "Comunicación enviada" : "No se enviaron correos" });
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

  async function loadWhatsAppDispatchQueue(communicationId) {
    const data = await api(`/api/business/communications/${communicationId}/whatsapp/queue`, { headers: authHeaders() });
    state.communicationWhatsAppQueue = { communicationId, ...(data || {}) };
    return state.communicationWhatsAppQueue;
  }

  document.addEventListener("click", async (event) => {
    const prepare = event.target.closest("[data-prepare-communication-whatsapp]");
    const loadQueue = event.target.closest("[data-load-communication-whatsapp-queue]");
    const openNext = event.target.closest("[data-open-next-communication-whatsapp]");
    const sendWhatsApp = event.target.closest("[data-send-communication-whatsapp]");
    if (!prepare && !loadQueue && !openNext && !sendWhatsApp) return;
    const control = prepare || loadQueue || openNext || sendWhatsApp;
    const communicationId = control.dataset.prepareCommunicationWhatsapp || control.dataset.loadCommunicationWhatsappQueue || control.dataset.openNextCommunicationWhatsapp || control.dataset.sendCommunicationWhatsapp;
    try {
      if (prepare) {
        const recipients = selectedRecipients("whatsapp");
        if (!recipients.length) throw new Error("Selecciona al menos un contacto con WhatsApp.");
        if (!document.getElementById("communicationConsentInput")?.checked) throw new Error("Confirma el consentimiento antes de preparar el lote.");
        const data = await api(`/api/business/communications/${communicationId}/whatsapp/prepare`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) });
        state.communicationWhatsAppQueue = { communicationId, ...(data.queue || {}) };
        state.communicationSelectedRefs = [];
        showFeedback(`Lote preparado: ${data.results?.queued || 0} contactos con WhatsApp. Abre el siguiente para continuar.`, "success", { title: "WhatsApp masivo" });
      } else if (loadQueue) {
        await loadWhatsAppDispatchQueue(communicationId);
      } else if (openNext) {
        const dispatch = state.communicationWhatsAppQueue?.communicationId === communicationId ? state.communicationWhatsAppQueue : await loadWhatsAppDispatchQueue(communicationId);
        const next = dispatch.queue?.find((item) => item.status === "QUEUED");
        if (!next) { showFeedback("No quedan contactos pendientes en esta cola.", "info", { title: "WhatsApp masivo" }); return; }
        const popup = window.open(`https://wa.me/${encodeURIComponent(String(next.phone || "").replace(/\D/g, ""))}?text=${encodeURIComponent(next.message || "")}`, "_blank", "noopener");
        if (!popup) throw new Error("El navegador bloqueó la apertura de WhatsApp.");
        await api(`/api/business/communications/${communicationId}/whatsapp/opened`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ source_type: next.source_type, source_id: next.source_id }) });
        await loadWhatsAppDispatchQueue(communicationId);
        showFeedback("WhatsApp abierto y registrado. La entrega se confirma únicamente en WhatsApp.", "success", { title: "Siguiente contacto" });
      } else {
        const recipients = selectedRecipients("whatsapp");
        const item = state.communications.find((row) => String(row.id) === String(communicationId));
        const template = item?.metadata?.whatsapp_template || {};
        if (!recipients.length) throw new Error("Selecciona al menos un contacto con WhatsApp.");
        if (!document.getElementById("communicationConsentInput")?.checked) throw new Error("Confirma el consentimiento antes de enviar.");
        showFeedback("Enviando el lote a Meta…", "loading", { title: "WhatsApp masivo", timeout: 0 });
        const data = await api(`/api/business/communications/${communicationId}/whatsapp/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, template, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) });
        const results = data.results || {};
        state.communicationSelectedRefs = [];
        showFeedback(`Lote finalizado: ${results.sent || 0} aceptados por Meta, ${results.failed || 0} fallidos y ${results.skipped || 0} omitidos.${emailFailureNote(results)}`, Number(results.sent || 0) ? "success" : "error", { title: Number(results.sent || 0) ? "WhatsApp enviado" : "WhatsApp no se envió" });
      }
      state.communicationsLoaded = false;
      await loadCommunications({ force: true });
      render();
    } catch (error) {
      showFeedback(error.message || "No se pudo preparar el envío por WhatsApp.", "error", { title: "WhatsApp masivo" });
    }
  });

  document.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-open-communication-composer]"); const close = event.target.closest("[data-close-communication-composer]"); const pick = event.target.closest("[data-communication-select]"); const historyPick = event.target.closest("[data-communication-history-select], [data-communication-history-select-control]"); const historySelectVisible = event.target.closest("[data-communication-history-select-visible]"); const historyArchive = event.target.closest("[data-communication-history-archive]"); const historyDelete = event.target.closest("[data-communication-history-delete]"); const all = event.target.closest("[data-communication-select-loaded]"); const clearSelection = event.target.closest("[data-communication-clear-selection]"); const send = event.target.closest("[data-send-communication]"); const copy = event.target.closest("[data-copy-communication-social]"); const share = event.target.closest("[data-share-communication-social]"); const download = event.target.closest("[data-download-communication-media]"); const publish = event.target.closest("[data-publish-communication]"); const removeMedia = event.target.closest("[data-remove-communication-media]"); const clearUrl = event.target.closest("[data-clear-communication-media-url]"); const edit = event.target.closest("[data-edit-communication]"); const duplicate = event.target.closest("[data-duplicate-communication]"); const archive = event.target.closest("[data-archive-communication]"); const remove = event.target.closest("[data-delete-communication]"); const loadComposerAudience = event.target.closest("[data-load-composer-audience]"); const loadMoreComposerAudience = event.target.closest("[data-load-more-composer-audience]"); const selectComposerAudience = event.target.closest("[data-composer-select-audience]"); const clearComposerAudience = event.target.closest("[data-composer-clear-audience]");
    if (historyPick) { event.stopPropagation(); const input = historyPick.matches("input") ? historyPick : historyPick.querySelector("[data-communication-history-select]"); if (!input) return; if (historyPick !== input) { input.checked = !input.checked; event.preventDefault(); } const selected = new Set(communicationHistorySelection()); const id = String(input.dataset.communicationHistorySelect || ""); if (!id) return; if (input.checked) selected.add(id); else selected.delete(id); state.communicationHistorySelectedIds = Array.from(selected); render(); return; }
    if (historySelectVisible) { event.preventDefault(); event.stopPropagation(); const ids = (state.communications || []).map((item) => String(item.id)); const selected = communicationHistorySelection(); state.communicationHistorySelectedIds = selected.length === ids.length ? [] : ids; render(); return; }
    if (historyArchive) { event.preventDefault(); event.stopPropagation(); await runCommunicationHistoryBulk("archive"); return; }
    if (historyDelete) { event.preventDefault(); event.stopPropagation(); await runCommunicationHistoryBulk("delete"); return; }
    if (open || edit || duplicate) { const relationKey = edit?.dataset.editCommunication || duplicate?.dataset.duplicateCommunication; const related = relationKey ? state.communications.find((row) => String(row.id) === String(relationKey)) : null; state.communicationPendingShowcaseId = related?.metadata?.web_showcase_id || ""; state.communicationPendingProductId = related?.metadata?.web_showcase_product_id || ""; state.communicationPendingPromotion = related?.metadata?.product_promotion || null; if (state.communicationPendingShowcaseId) { try { await loadCommunicationShowcaseProducts(state.communicationPendingShowcaseId); } catch (error) { console.warn("No se pudieron cargar los productos de la vitrina.", error); } } }
    if (open || edit || duplicate) { try { await prepareComposerRelations(); } catch (error) { console.warn("No se pudieron actualizar los canales para comunicaciones.", error); } renderOptions(); positionComposerAudience(); }
    if (open || edit || duplicate) { const key = edit?.dataset.editCommunication || duplicate?.dataset.duplicateCommunication; const item = key ? state.communications.find((row) => String(row.id) === String(key)) : null; renderOptions(); const form = document.getElementById("communicationComposerForm"); form?.reset(); state.editingCommunicationId = edit ? item?.id : null; if (!edit && !duplicate) state.communicationSelectedRefs = []; if (item && form) { form.querySelector("#communicationTitleInput").value = duplicate ? `${item.title} (copia)` : item.title || ""; form.querySelector("#communicationCampaignInput").value = item.campaign_id || ""; form.querySelector("#communicationChannelInput").value = item.channel_id || ""; form.querySelector("#communicationActivationInput").value = item.activation_id || ""; form.querySelector("#communicationWebShowcaseInput").value = item.metadata?.web_showcase_id || ""; form.querySelector("#communicationSubjectInput").value = item.subject || ""; form.querySelector("#communicationEmailBodyInput").value = item.email_body || ""; form.querySelector("#communicationWhatsAppBodyInput").value = item.whatsapp_body || ""; form.querySelector("#communicationSocialCopyInput").value = item.social_copy || ""; form.querySelector("#communicationActionUrlInput").value = item.action_url || ""; const radio = form.querySelector(`input[name="communicationType"][value="${item.communication_type || "EMAIL"}"]`); if (radio) radio.checked = true; const assets = mediaFor(item); setUploadedMedia(assets.filter((asset) => String(asset.source || "").startsWith("data:"))); form.querySelector("#communicationImageInput").value = assets.find((asset) => !String(asset.source || "").startsWith("data:"))?.source || ""; } else { setUploadedMedia([]); } try { await window.loadCommunicationWhatsAppConnection?.({ force: true }); if (state.communicationWhatsAppConnection?.ready && !state.communicationWhatsAppTemplates?.length) await window.loadCommunicationWhatsAppTemplates?.(); } catch (error) { console.warn("No se pudo preparar la conexión de WhatsApp.", error); } renderWhatsAppTemplateOptions(item?.metadata?.whatsapp_template?.name || "", item?.metadata?.whatsapp_template?.body_parameters || []); document.getElementById("communicationComposerTitle").textContent = edit ? "Edita tu comunicación" : duplicate ? "Reutiliza esta comunicación" : "Crea un mensaje listo para enviar"; document.getElementById("communicationComposerSaveButton").textContent = edit ? "Guardar cambios" : duplicate ? "Guardar copia" : "Guardar borrador"; rootComposerModal()?.classList.remove("hidden"); document.body.classList.add("communication-composer-open"); hydrateComposerAudienceFilters(); try { await refreshComposerAudience(); } catch (error) { showFeedback(error.message || "No se pudo cargar la audiencia.", "error", { title: "Audiencia" }); } toggleComposer(); requestAnimationFrame(() => document.getElementById("communicationTitleInput")?.focus()); return; }
    if (close) { composerModal()?.classList.add("hidden"); document.body.classList.remove("communication-composer-open"); return; }
    if (loadComposerAudience) { try { await refreshComposerAudience(); } catch (error) { showFeedback(error.message || "No se pudo cargar la audiencia.", "error", { title: "Audiencia" }); } return; }
    if (loadMoreComposerAudience) { try { await loadAudience({ append: true }); render(); renderComposerAudience(); } catch (error) { showFeedback(error.message || "No se pudieron cargar más contactos.", "error", { title: "Audiencia" }); } return; }
    if (selectComposerAudience || all) { const mode = document.querySelector('input[name="communicationType"]:checked')?.value === "WHATSAPP" ? "whatsapp" : "email"; const available = setAudienceSelection(mode); render(); renderComposerAudience(); if (!available) showFeedback(`Ya seleccionaste el máximo de ${MAX_EMAIL_RECIPIENTS} contactos por envío.`, "info", { title: "Destinatarios" }); return; }
    if (clearComposerAudience || clearSelection) { setAudienceSelection("clear"); render(); renderComposerAudience(); return; }
    if (remove) { const item = state.communications.find((row) => String(row.id) === String(remove.dataset.deleteCommunication)); if (!item || !window.confirm(`¿Borrar “${item.title}”? Se eliminarán su historial de entrega y sus destinatarios. No se borrarán contactos ni ventas.`)) return; await api(`/api/business/communications/${item.id}`, { method: "DELETE", headers: authHeaders() }); state.communicationsLoaded = false; await loadCommunications({ force: true }); state.communicationSelectedRefs = []; state.communicationWhatsAppQueue = null; state.selectedCommunicationId = state.communications[0]?.id || null; render(); showFeedback("La comunicación y su historial de entrega fueron borrados.", "success", { title: "Comunicación borrada" }); return; }
    if (archive) { const item = state.communications.find((row) => String(row.id) === String(archive.dataset.archiveCommunication)); if (!item || !window.confirm(`¿Archivar “${item.title}”? Se conserva el historial, pero deja de quedar disponible para nuevos envíos.`)) return; await api(`/api/business/communications/${item.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: "ARCHIVED" }) }); state.communicationsLoaded = false; await loadCommunications({ force: true }); state.selectedCommunicationId = state.communications.find((row) => String(row.status).toUpperCase() !== "ARCHIVED")?.id || state.communications[0]?.id || null; render(); showFeedback(item.channel_id ? "La comunicación y su esfuerzo asociado quedaron archivados." : "La comunicación quedó archivada.", "success", { title: "Comunicación archivada" }); return; }
    if (removeMedia) { const media = uploadedMedia(); media.splice(Number(removeMedia.dataset.removeCommunicationMedia), 1); setUploadedMedia(media); renderComposerPreview(); return; }
    if (clearUrl) { const input = document.getElementById("communicationImageInput"); if (input) input.value = ""; toggleComposer(); return; }
    if (pick) { const nextId = pick.dataset.communicationSelect; if (String(state.selectedCommunicationId) === String(nextId)) { openCommunicationDeliverySummary(state.communications.find((item) => String(item.id) === String(nextId))); return; } state.selectedCommunicationId = nextId; render(); return; }
    if (download) { const item = state.communications.find((row) => String(row.id) === String(download.dataset.downloadCommunicationMedia)); downloadMedia(item); return; }
    if (copy) { const item = state.communications.find((row) => String(row.id) === String(copy.dataset.copyCommunicationSocial)); const content = [item?.social_copy, item?.tracking_url || item?.action_url].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(content); showFeedback("Publicación copiada con su enlace medido.", "success", { title: "Texto copiado" }); } catch { window.prompt("Copia esta publicación", content); } return; }
    if (share) { const item = state.communications.find((row) => String(row.id) === String(share.dataset.shareCommunicationSocial)); try { const result = await shareSocialPublication(item); showFeedback(result === "shared" ? "Se abrió el selector de compartir del dispositivo." : "La publicación medida quedó copiada para compartirla.", "success", { title: "Compartir publicación" }); } catch (error) { if (error?.name !== "AbortError") showFeedback(error.message || "No se pudo preparar la publicación para compartir.", "error", { title: "Compartir publicación" }); } return; }
    if (publish) { try { const investment = document.getElementById("communicationPublicationInvestment")?.value || 0; const externalUrl = document.getElementById("communicationPublicationUrl")?.value.trim() || ""; const data = await api(`/api/business/communications/${publish.dataset.publishCommunication}/publish`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ investment_amount: Number(investment), external_publication_url: externalUrl }) }); const item = state.communications.find((row) => String(row.id) === String(publish.dataset.publishCommunication)); if (item) Object.assign(item, data.communication); state.communicationsLoaded = false; await loadCommunications({ force: true }); render(); showFeedback("Publicación registrada. Usa el texto copiado con el enlace medido de Qori.", "success", { title: "Publicación medida" }); } catch (error) { showFeedback(error.message || "No se pudo registrar la publicación.", "error", { title: "Publicación" }); } return; }
    if (send) { const recipients = selectedRecipients(); if (!recipients.length) { showFeedback("Selecciona al menos un contacto que tenga email.", "info", { title: "Destinatarios" }); return; } if (!document.getElementById("communicationConsentInput")?.checked) { showFeedback("Confirma el consentimiento antes de enviar.", "info", { title: "Consentimiento requerido" }); return; } try { showFeedback("Enviando emails…", "loading", { title: "Comunicación", timeout: 0 }); const data = await api(`/api/business/communications/${send.dataset.sendCommunication}/send`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ consent_confirmed: true, recipients: recipients.map((row) => ({ source_type: row.source_type, source_id: row.source_id })) }) }); state.communicationSelectedRefs = []; state.communicationsLoaded = false; await loadCommunications({ force: true }); render(); const results = data.results || {}; const feedbackType = Number(results.sent || 0) ? "success" : "error"; const duplicateNote = Number(results.duplicate_emails || 0) ? ` ${results.duplicate_emails} contacto${Number(results.duplicate_emails) === 1 ? "" : "s"} con correo duplicado se omitieron.` : ""; showFeedback(`Envío finalizado: ${results.sent || 0} enviados, ${results.failed || 0} fallidos y ${results.skipped || 0} omitidos.${duplicateNote}${emailFailureNote(results)}`, feedbackType, { title: Number(results.sent || 0) ? "Comunicación enviada" : "No se enviaron correos" }); } catch (error) { showFeedback(error.message || "No se pudo completar el envío.", "error", { title: "Comunicación" }); } }
  });

  document.addEventListener("click", (event) => {
    const summary = event.target.closest("[data-open-communication-delivery-summary]");
    if (!summary) return;
    event.preventDefault();
    event.stopPropagation();
    openCommunicationDeliverySummary(state.communications.find((item) => String(item.id) === String(summary.dataset.openCommunicationDeliverySummary)));
  });

  document.addEventListener("change", async (event) => {
    if (event.target.matches("[data-communication-recipient]")) {
      const selected = new Set(state.communicationSelectedRefs || []);
      const active = state.communications.find((item) => String(item.id) === String(state.selectedCommunicationId));
      const deliveryChannel = isWhatsAppCommunication(active) ? "whatsapp" : "email";
      const contact = (state.communicationAudience || []).find((item) => refKey(item) === event.target.value);
      if (event.target.checked && selected.size >= MAX_EMAIL_RECIPIENTS) { event.target.checked = false; showFeedback(`Puedes seleccionar hasta ${MAX_EMAIL_RECIPIENTS} contactos por envío.`, "info", { title: "Destinatarios" }); return; }
      if (event.target.checked && deliveryChannel === "whatsapp" && contact) {
        const phone = normalizedWhatsAppPhone(contact.phone);
        (state.communicationAudience || []).forEach((item) => { if (normalizedWhatsAppPhone(item.phone) === phone) selected.delete(refKey(item)); });
      }
      if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value);
      state.communicationSelectedRefs = Array.from(selected);
      if (event.target.checked && deliveryChannel === "whatsapp" && contact) showFeedback("Qori conservará una sola copia por número de WhatsApp.", "info", { title: "Destinatarios" });
      render();
      renderComposerAudience();
    }
    if (event.target.matches('input[name="communicationType"]')) toggleComposer();
    if (event.target.matches("#communicationWhatsAppTemplateInput")) updateWhatsAppTemplateHelp();
    if (event.target.matches("#communicationWebShowcaseInput")) {
      const showcase = (state.smartCatalogs || []).find((item) => String(item.id) === String(event.target.value || ""));
      const actionUrl = document.getElementById("communicationActionUrlInput");
      if (showcase && actionUrl) actionUrl.value = showcase.public_url || `${window.location.origin}/c/${encodeURIComponent(showcase.slug || "")}`;
      try {
        await loadCommunicationShowcaseProducts(showcase?.id || null);
        renderOptions();
      } catch (error) {
        showFeedback(error.message || "No se pudieron cargar los productos de la vitrina.", "error", { title: "Vitrina web" });
      }
      toggleComposer();
    }
    if (event.target.matches("#communicationProductPromotionEnabledInput")) toggleProductPromotionFields();
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
