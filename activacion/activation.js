const card = document.getElementById("activationCard");
const statusPanel = document.getElementById("statusPanel");
const progressPanel = document.getElementById("progressPanel");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");
const businessName = document.getElementById("businessName");
const activationTitle = document.getElementById("activationTitle");
const activationDescription = document.getElementById("activationDescription");
const participantForm = document.getElementById("participantForm");
const participantName = document.getElementById("participantName");
const participantPhone = document.getElementById("participantPhone");
const participantEmail = document.getElementById("participantEmail");
const participantDocument = document.getElementById("participantDocument");
const experienceStage = document.getElementById("experienceStage");
const experienceTitle = document.getElementById("experienceTitle");
const experienceCopy = document.getElementById("experienceCopy");
const experienceBody = document.getElementById("experienceBody");
const ticketResult = document.getElementById("ticketResult");

let currentActivation = null;
let participant = null;
let gameSessionToken = null;
let selectedChoice = null;
let selectedPosition = null;
let gameState = null;

const minigameTypes = new Set([
  "SPACE_SHOOTER",
  "BREAKOUT",
  "SNAKE",
  "CATCH_PRIZE",
  "MEMORY_PAIRS",
  "FAST_TAP",
  "MINI_MAZE",
  "WHACK_A_MOLE",
  "DODGE_RUNNER",
  "BALLOON_POP",
  "ROULETTE_SPIN",
  "TOUCH_CATCH",
  "TRUE_FALSE",
  "ORDER_OPTIONS",
  "CONNECTORS",
  "BATTLESHIP_COORDS",
]);

function minigameInstruction(type, config = {}) {
  if (config.instruction) return config.instruction;
  return {
    SPACE_SHOOTER: "Arrastra el dedo a izquierda o derecha para mover la nave. Dispara automaticamente y evita el dano enemigo.",
    BREAKOUT: "Rompe la mayor cantidad de bloques posible antes de que termine el tiempo.",
    SNAKE: "Captura objetivos y evita toques incorrectos para superar el score minimo.",
    CATCH_PRIZE: "Mueve la canasta, arma combos, atrapa bonus y evita bombas. Algunos objetos cambian velocidad, tiempo o proteccion.",
    MEMORY_PAIRS: "Encuentra pares rapidamente y acumula puntos por cada acierto.",
    FAST_TAP: "Toca cada objetivo apenas aparezca. La velocidad define tu score.",
    MINI_MAZE: "Avanza tocando objetivos cercanos a la ruta y evita penalizaciones.",
    WHACK_A_MOLE: "Toca solo los objetivos activos antes de que se escondan y evita penalizaciones.",
    DODGE_RUNNER: "Mueve al corredor, recoge beneficios y esquiva obstaculos hasta terminar el tiempo.",
    BALLOON_POP: "Revienta globos de valor, encadena aciertos y evita globos penalizados.",
    ROULETTE_SPIN: "Gira la ruleta, detenla en una zona de beneficio y acumula el score requerido.",
    TOUCH_CATCH: "Toca y atrapa objetivos moviles antes de que escapen.",
    TRUE_FALSE: "Elige falso o verdadero rapidamente y encadena respuestas correctas.",
    ORDER_OPTIONS: "Toca las opciones en el orden correcto para completar el menu o secuencia.",
    CONNECTORS: "Conecta cada elemento de la izquierda con su par correcto de la derecha.",
    BATTLESHIP_COORDS: "Selecciona coordenadas, encuentra barcos contiguos y hunde toda la flota para desbloquear tu beneficio.",
  }[type] || "Completa la partida y supera el score minimo para recibir tu QR.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rewardValueFromResult(data = {}) {
  return data.reward?.reward_value
    || data.reward?.value
    || data.qr_code?.benefit_value?.value
    || data.qr_code?.benefit_value
    || {};
}

function benefitFulfillmentFromResult(data = {}) {
  const value = rewardValueFromResult(data);
  const source = value?.fulfillment || value?.value?.fulfillment || {};
  const mode = String(source.mode || value.redemption_channel || "PHYSICAL_QR").toUpperCase();
  if (mode === "ECOMMERCE_CODE" || mode === "ECOMMERCE") {
    return {
      mode: "ECOMMERCE_CODE",
      ecommerce_code: source.ecommerce_code || value.ecommerce_code || "",
      ecommerce_url: source.ecommerce_url || value.ecommerce_url || "",
      instructions: source.instructions || value.instructions || "Copia este código y aplícalo en el checkout de la tienda online.",
    };
  }
  return {
    mode: "PHYSICAL_QR",
    instructions: source.instructions || "Presenta este QR en el punto autorizado para redimir el beneficio.",
  };
}

function slugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[1] || parts[0] || "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(apiErrorMessage(data));
  }
  return data;
}

function apiErrorMessage(data = {}) {
  const baseMessage = data.error?.message || "No se pudo completar la solicitud.";
  const fieldErrors = data.error?.details?.fieldErrors || {};
  const firstField = Object.keys(fieldErrors)[0];
  const firstMessage = firstField ? fieldErrors[firstField]?.[0] : "";
  if (firstField && firstMessage) {
    return `${baseMessage} ${firstField}: ${firstMessage}`;
  }
  const formErrors = data.error?.details?.formErrors || [];
  return formErrors.length ? `${baseMessage} ${formErrors[0]}` : baseMessage;
}

function setStatus(message, tone = "info") {
  statusPanel.textContent = message;
  statusPanel.dataset.tone = tone;
}

function setProgress(done = 0, total = 1) {
  const safeTotal = Math.max(1, total);
  const safeDone = Math.min(Math.max(0, done), safeTotal);
  const percent = Math.round((safeDone / safeTotal) * 100);
  progressLabel.textContent = `${safeDone} de ${safeTotal} pasos completados`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  progressPanel.classList.remove("hidden");
}

function participantPayload() {
  return {
    name: participantName.value.trim(),
    phone: participantPhone.value.trim(),
    email: participantEmail.value.trim() || null,
    document: participantDocument.value.trim() || null,
    metadata: {
      source_url: window.location.href,
      user_agent: navigator.userAgent,
    },
  };
}

function isPremium(activation) {
  return activation.category === "premium";
}

function renderActivation(activation) {
  currentActivation = activation;
  businessName.textContent = activation.business?.name || "MarketGames RMS";
  activationTitle.textContent = activation.title;
  activationDescription.textContent = activation.activation_type === "SCRATCH_WIN"
    ? "Registra tus datos y raspa la superficie para descubrir el premio."
    : activation.description || "Deja tus datos y completa la experiencia para desbloquear tu QR.";
  document.title = `${activation.title} | Activacion MarketGames`;
  card.classList.toggle("is-premium", isPremium(activation));
  syncCaptureRequirements(activation);
  if (!activation.active) {
    participantForm.classList.add("hidden");
    setStatus("Esta activacion no esta activa en este momento.", "error");
    return;
  }
  setStatus(
    activation.activation_type === "SCRATCH_WIN"
      ? "Primero registra tus datos. Luego raspa para descubrir tu premio."
      : "Primero registra tus datos. Luego completa la experiencia para obtener tu beneficio.",
    "success"
  );
  participantForm.classList.remove("hidden");
  setProgress(0, 2);
}

function syncCaptureRequirements(activation) {
  const requiredFields = new Set(activation.capture_config?.required_fields || []);
  requiredFields.add("phone");
  requiredFields.add("email");
  requiredFields.add("document");
  const requiresDocument = requiredFields.has("document");
  const requiresEmail = requiredFields.has("email");
  participantDocument.required = requiresDocument;
  participantDocument.placeholder = requiresDocument ? "Obligatorio" : "Opcional";
  participantEmail.required = requiresEmail;
  participantEmail.placeholder = requiresEmail ? "Obligatorio" : "Opcional";
  const documentLabel = participantDocument.closest("label")?.querySelector("span");
  if (documentLabel) documentLabel.textContent = requiresDocument ? "Documento" : "Documento";
  participantPhone.required = requiredFields.has("phone");
  participantPhone.placeholder = "Obligatorio";
}

async function loadActivation() {
  try {
    const slug = slugFromPath();
    if (!slug) throw new Error("Link de activacion incompleto.");
    const data = await api(`/api/public/activations/${encodeURIComponent(slug)}`);
    renderActivation(data.activation);
  } catch (error) {
    activationTitle.textContent = "Activacion no disponible";
    activationDescription.textContent = "Revisa el link o solicita uno nuevo al negocio.";
    setStatus(error.message, "error");
  }
}

async function handleParticipantSubmit(event) {
  event.preventDefault();
  if (!currentActivation) return;
  ticketResult.classList.add("hidden");
  selectedChoice = null;
  selectedPosition = null;
  if (minigameTypes.has(currentActivation.activation_type)) {
    await startGameSession();
    return;
  }
  participantForm.classList.add("hidden");
  renderExperience();
}

async function startGameSession() {
  const button = participantForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Preparando...";
  try {
    const data = await api(`/api/public/activations/${encodeURIComponent(currentActivation.public_slug)}/participants`, {
      method: "POST",
      body: JSON.stringify(participantPayload()),
    });
    if (data.rewarded) {
      participantForm.classList.add("hidden");
      setStatus(data.message || "QR recuperado.", "success");
      await renderResult(data);
      return;
    }
    participant = data.participant;
    gameSessionToken = data.game_session_token;
    participantForm.classList.add("hidden");
    renderMinigame();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Continuar";
  }
}

function renderExperience() {
  experienceStage.classList.remove("hidden");
  experienceTitle.textContent = currentActivation.activation_label || "Completa la experiencia";
  experienceCopy.textContent = currentActivation.activation_type === "SCRATCH_WIN"
    ? "Raspa una sola zona. Al comenzar, las otras quedan bloqueadas y veras el beneficio seleccionado."
    : currentActivation.activation_type === "OPEN_QUESTION"
    ? "No hay respuesta correcta. Escribe tu opinion o necesidad y el sistema generara el QR configurado."
    : currentActivation.category === "premium"
    ? "Esta experiencia esta disenada como atencion personalizada. Al completar se generara el pase configurado."
    : "Al completar, el sistema validara el beneficio y generara el QR unico.";
  if (currentActivation.reward_mode === "by_position" || currentActivation.activation_type === "DISCOUNT_THERMOMETER") {
    renderThermometer();
    return;
  }
  if (currentActivation.activation_type === "SCRATCH_WIN") {
    renderScratchExperience();
    return;
  }
  if (["SPIN_DISCOVER", "TAP_REVEAL", "CHOOSE_DOOR", "BENEFIT_SELECTOR", "QUICK_VOTE", "VIP_EXPERIENCE_SELECTOR", "STYLE_PROFILE"].includes(currentActivation.activation_type)) {
    renderChoiceExperience();
    return;
  }
  renderQuestionExperience();
}

function renderQuestionExperience() {
  const questions = currentActivation.questions || [];
  const submitLabel = currentActivation.activation_type === "OPEN_QUESTION"
    ? "Enviar respuesta y obtener QR"
    : "Generar mi QR";
  if (!questions.length) {
    experienceBody.innerHTML = `
      <article class="question-card">
        <div class="question-title"><span>1</span><strong>Confirma tu participacion para desbloquear el beneficio.</strong></div>
        <button class="submit-button" type="button" id="completeActivationButton">${escapeHtml(submitLabel)}</button>
      </article>
    `;
    document.getElementById("completeActivationButton").addEventListener("click", () => completeActivation({ answers: {} }));
    return;
  }
  experienceBody.innerHTML = `
    <form id="answerForm" class="experience-form">
      ${questions.map((question, index) => renderQuestion(question, index)).join("")}
      <button class="submit-button" type="submit">${escapeHtml(submitLabel)}</button>
    </form>
  `;
  document.getElementById("answerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    completeActivation({ answers: collectAnswers() });
  });
  experienceBody.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", updateQuestionProgress);
    field.addEventListener("change", updateQuestionProgress);
  });
  updateQuestionProgress();
}

function renderQuestion(question, index) {
  const type = String(question.question_type || "open").toUpperCase();
  const options = Array.isArray(question.options) ? question.options : Object.values(question.options || {});
  if (["SINGLE_CHOICE", "OPTION", "YES_NO", "STARS", "NPS", "SCALE_1_5", "SCALE_1_10"].includes(type)) {
    const list = options.length
      ? options
      : (type === "YES_NO" ? ["Si", "No"] : Array.from({ length: type.includes("10") || type === "NPS" ? 10 : 5 }, (_, item) => String(item + 1)));
    return `
      <article class="question-card" data-question="${escapeHtml(question.id)}">
        <div class="question-title"><span>${index + 1}</span><strong>${escapeHtml(question.question_text)}</strong></div>
        <div class="answer-grid">
          ${list.map((option) => `
            <label class="answer-option">
              <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(option.value || option)}" ${question.required ? "required" : ""}>
              <span>${escapeHtml(option.label || option)}</span>
            </label>
          `).join("")}
        </div>
      </article>
    `;
  }
  if (["MULTIPLE_CHOICE", "PRODUCT_CATEGORY"].includes(type)) {
    return `
      <article class="question-card" data-question="${escapeHtml(question.id)}">
        <div class="question-title"><span>${index + 1}</span><strong>${escapeHtml(question.question_text)}</strong></div>
        <div class="answer-grid">
          ${options.map((option) => `
            <label class="answer-option">
              <input type="checkbox" name="${escapeHtml(question.id)}" value="${escapeHtml(option.value || option)}">
              <span>${escapeHtml(option.label || option)}</span>
            </label>
          `).join("")}
        </div>
      </article>
    `;
  }
  const inputType = {
    EMAIL: "email",
    PHONE: "tel",
    NUMBER: "number",
    DATE: "date",
    DOCUMENT: "text",
  }[type] || "text";
  return `
    <article class="question-card" data-question="${escapeHtml(question.id)}">
      <div class="question-title"><span>${index + 1}</span><strong>${escapeHtml(question.question_text)}</strong></div>
      ${type === "OPEN" || type === "SHORT_TEXT"
        ? `<textarea data-answer="${escapeHtml(question.id)}" ${question.required ? "required" : ""}></textarea>`
        : `<input data-answer="${escapeHtml(question.id)}" type="${inputType}" ${question.required ? "required" : ""}>`}
    </article>
  `;
}

function collectAnswers() {
  const answers = {};
  (currentActivation.questions || []).forEach((question) => {
    const checked = Array.from(experienceBody.querySelectorAll(`input[name="${question.id}"]:checked`)).map((item) => item.value);
    const direct = experienceBody.querySelector(`[data-answer="${question.id}"]`)?.value.trim();
    answers[question.id] = checked.length > 1 ? checked : (checked[0] || direct || "");
  });
  return answers;
}

function updateQuestionProgress() {
  const total = Math.max(1, (currentActivation.questions || []).length);
  const answers = collectAnswers();
  const done = Object.values(answers).filter((value) => Array.isArray(value) ? value.length : Boolean(value)).length;
  setProgress(done, total);
  experienceBody.querySelectorAll(".answer-option").forEach((option) => {
    option.classList.toggle("is-selected", Boolean(option.querySelector("input:checked")));
  });
}

function renderChoiceExperience() {
  const choices = currentActivation.reward_config?.choices
    || currentActivation.reward_config?.profiles
    || currentActivation.interaction_config?.choices
    || currentActivation.touch_zones
    || [];
  const fallbackChoices = choices.length ? choices : [
    { value: "A", label: "Beneficio A" },
    { value: "B", label: "Beneficio B" },
    { value: "C", label: "Beneficio C" },
    { value: "D", label: "Beneficio D" },
  ];
  experienceBody.innerHTML = `
    <article class="question-card">
      <div class="question-title"><span>?</span><strong>Elige una opcion para desbloquear tu beneficio.</strong></div>
      <div class="reveal-grid">
        ${fallbackChoices.map((choice, index) => `
          <button class="reveal-card ${choice.image_data_url || choice.image_url ? "has-image" : ""}" type="button" data-choice="${escapeHtml(choice.value || choice.key || choice.label || index)}">
            ${choice.image_data_url || choice.image_url ? `<img src="${escapeHtml(choice.image_data_url || choice.image_url)}" alt="${escapeHtml(choice.label || choice.reward_label || `Opcion ${index + 1}`)}">` : ""}
            <span>${escapeHtml(choice.label || choice.reward_label || `Opcion ${index + 1}`)}</span>
          </button>
        `).join("")}
      </div>
      <button class="submit-button" type="button" id="choiceCompleteButton" disabled>Generar mi QR</button>
    </article>
  `;
  experienceBody.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedChoice = button.dataset.choice;
      experienceBody.querySelectorAll(".reveal-card").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      document.getElementById("choiceCompleteButton").disabled = false;
      setProgress(1, 1);
    });
  });
  document.getElementById("choiceCompleteButton").addEventListener("click", () => completeActivation({ selected_choice: selectedChoice }));
}

function getChoiceOptions() {
  return currentActivation.reward_config?.choices
    || currentActivation.reward_config?.profiles
    || currentActivation.interaction_config?.choices
    || currentActivation.touch_zones
    || [];
}

function choiceValue(choice, index) {
  return String(choice.value || choice.key || choice.label || choice.profile || index);
}

function scratchSlotLabel(choice, index) {
  return String(choice.slot_label || `Casilla ${index + 1}`);
}

function scratchBenefitLabel(choice, index) {
  return String(choice.reveal_label || choice.reward_label || choice.benefit_label || choice.label || `Casilla ${index + 1}`);
}

function renderScratchExperience() {
  const choices = getChoiceOptions();
  const fallbackChoices = choices.length ? choices : [
    { value: "scratch-0", label: "Casilla 1" },
    { value: "scratch-1", label: "Casilla 2" },
    { value: "scratch-2", label: "Casilla 3" },
    { value: "scratch-3", label: "Casilla 4" },
  ];

  experienceBody.innerHTML = `
    <article class="question-card scratch-card">
      <div class="question-title"><span>?</span><strong>Elige una casilla y raspa solo una superficie.</strong></div>
      <div class="scratch-option-grid">
        ${fallbackChoices.slice(0, 4).map((choice, index) => `
          <div class="scratch-surface" data-scratch-option="${escapeHtml(choiceValue(choice, index))}" data-scratch-index="${index}">
            <div class="scratch-prize" aria-hidden="true">
              <span>${escapeHtml(scratchSlotLabel(choice, index))}</span>
              <strong>${escapeHtml(scratchBenefitLabel(choice, index))}</strong>
            </div>
            <canvas class="scratch-canvas" width="320" height="220" aria-label="Raspar casilla ${index + 1}"></canvas>
          </div>
        `).join("")}
      </div>
      <div class="scratch-selected-result hidden" id="scratchSelectedResult" aria-live="polite">
        <span id="scratchSelectedZone">Zona seleccionada</span>
        <strong id="scratchSelectedBenefit">Beneficio pendiente</strong>
      </div>
      <p class="scratch-help" id="scratchHelp">Raspa una sola casilla. Al desbloquearla, las otras quedan cerradas.</p>
      <button class="submit-button" type="button" id="scratchCompleteButton" disabled>Generar mi QR para verlo</button>
    </article>
  `;
  window.requestAnimationFrame(() => initScratchCanvases());
  document.getElementById("scratchCompleteButton").addEventListener("click", () => completeActivation({ selected_choice: selectedChoice }));
}

function initScratchCanvases() {
  const surfaces = Array.from(experienceBody.querySelectorAll("[data-scratch-option]"));
  const button = document.getElementById("scratchCompleteButton");
  const help = document.getElementById("scratchHelp");
  const selectedResult = document.getElementById("scratchSelectedResult");
  const selectedZone = document.getElementById("scratchSelectedZone");
  const selectedBenefit = document.getElementById("scratchSelectedBenefit");
  if (!surfaces.length || !button || !help) return;
  let lockedChoice = "";

  const lockSurface = (surface) => {
    if (lockedChoice && lockedChoice !== surface.dataset.scratchOption) return false;
    if (!lockedChoice) {
      lockedChoice = surface.dataset.scratchOption || "";
      selectedChoice = lockedChoice;
      surfaces.forEach((item) => {
        const isSelected = item === surface;
        item.classList.toggle("is-selected", isSelected);
        item.classList.toggle("is-disabled", !isSelected);
        if (!isSelected) item.querySelector("canvas")?.setAttribute("aria-disabled", "true");
      });
      const slotText = surface.querySelector(".scratch-prize span")?.textContent?.trim() || "Zona seleccionada";
      const benefitText = surface.querySelector(".scratch-prize strong")?.textContent?.trim() || "Beneficio seleccionado";
      if (selectedZone) selectedZone.textContent = slotText;
      if (selectedBenefit) selectedBenefit.textContent = benefitText;
      selectedResult?.classList.remove("hidden");
      help.textContent = "Casilla seleccionada. Las otras quedaron bloqueadas. Termina de raspar para generar tu QR.";
    }
    return true;
  };

  surfaces.forEach((surface) => {
    const canvas = surface.querySelector("canvas");
    if (!canvas) return;
    initScratchCanvas(surface, canvas, {
      onStart: () => lockSurface(surface),
      onUnlock: () => {
        if (!lockSurface(surface)) return;
        button.disabled = false;
        help.textContent = "Beneficio descubierto. Genera tu QR para recibir exactamente esta zona.";
        setProgress(1, 1);
      },
      isLocked: () => Boolean(lockedChoice && lockedChoice !== surface.dataset.scratchOption),
    });
  });
}

function initScratchCanvas(surface, canvas, options = {}) {
  const button = document.getElementById("scratchCompleteButton");
  const help = document.getElementById("scratchHelp");
  if (!canvas || !surface || !button || !help) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rect = surface.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(320, Math.round(rect.width * ratio));
  canvas.height = Math.max(180, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.globalCompositeOperation = "source-over";
  const cover = ctx.createLinearGradient(0, 0, width, height);
  cover.addColorStop(0, "#c8d1d0");
  cover.addColorStop(0.45, "#7d8a8f");
  cover.addColorStop(1, "#d9c27a");
  ctx.fillStyle = cover;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  for (let line = -height; line < width; line += 24) {
    ctx.fillRect(line, 0, 9, height * 2);
  }
  ctx.fillStyle = "rgba(17, 32, 38, .82)";
  ctx.font = "900 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RASPA AQUI", width / 2, height / 2 - 4);
  ctx.font = "700 13px Inter, sans-serif";
  ctx.fillText("para descubrir tu premio", width / 2, height / 2 + 24);

  let scratching = false;
  let unlocked = false;
  const scratchAt = (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  };
  const updateScratchProgress = () => {
    if (unlocked) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    for (let index = 3; index < data.length; index += 16) {
      if (data[index] < 48) cleared += 1;
    }
    const sampledPixels = data.length / 16;
    const percent = Math.min(100, Math.round((cleared / sampledPixels) * 100));
    setProgress(percent, 100);
    if (percent >= 55) {
      unlocked = true;
      ctx.clearRect(0, 0, width, height);
      surface.classList.add("is-revealed");
      surface.querySelector(".scratch-prize")?.removeAttribute("aria-hidden");
      options.onUnlock?.();
    }
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (options.isLocked?.()) return;
    if (options.onStart && options.onStart() === false) return;
    scratching = true;
    canvas.setPointerCapture(event.pointerId);
    scratchAt(event);
    updateScratchProgress();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!scratching || options.isLocked?.()) return;
    event.preventDefault();
    scratchAt(event);
    updateScratchProgress();
  });
  canvas.addEventListener("pointerup", (event) => {
    scratching = false;
    canvas.releasePointerCapture(event.pointerId);
    updateScratchProgress();
  });
  canvas.addEventListener("pointercancel", () => {
    scratching = false;
  });
}

function renderThermometer() {
  const zones = currentActivation.touch_zones?.length
    ? currentActivation.touch_zones
    : (currentActivation.reward_config?.points || []);
  const labels = zones.length ? zones : [
    { label: "5%", position_percent: 0 },
    { label: "10%", position_percent: 25 },
    { label: "25%", position_percent: 50 },
    { label: "10%", position_percent: 75 },
    { label: "5%", position_percent: 100 },
  ];
  experienceBody.innerHTML = `
    <article class="question-card">
      <div class="question-title"><span>%</span><strong>Deten el indicador cerca del mejor beneficio configurado.</strong></div>
      <div class="thermometer-track" id="thermometerTrack">
        <span class="thermometer-pointer" id="thermometerPointer"></span>
        ${labels.map((zone) => `<i>${escapeHtml(zone.label || zone.reward_label)}</i>`).join("")}
      </div>
      <button class="submit-button" type="button" id="stopThermometerButton">Detener</button>
      <p id="thermometerResult">El mayor beneficio puede estar en cualquier punto, no necesariamente al final.</p>
    </article>
  `;
  let position = 0;
  let direction = 1;
  const pointer = document.getElementById("thermometerPointer");
  const timer = window.setInterval(() => {
    position += direction * 2.4;
    if (position >= 100 || position <= 0) {
      direction *= -1;
      position = Math.max(0, Math.min(100, position));
    }
    pointer.style.left = `${position}%`;
  }, 24);
  document.getElementById("stopThermometerButton").addEventListener("click", () => {
    window.clearInterval(timer);
    selectedPosition = position;
    document.getElementById("thermometerResult").textContent = `Posicion registrada: ${Math.round(position)}%.`;
    setProgress(1, 1);
    completeActivation({ position_percent: selectedPosition });
  }, { once: true });
}

function renderMinigame() {
  const config = currentActivation.game_config || {};
  const rouletteMode = currentActivation.activation_type === "ROULETTE_SPIN";
  experienceStage.classList.remove("hidden");
  experienceTitle.textContent = currentActivation.activation_label || (rouletteMode ? "Ruleta de beneficios" : "Minijuego con score");
  experienceCopy.textContent = minigameInstruction(currentActivation.activation_type, config);
  experienceBody.innerHTML = `
    <article class="game-panel retro-game-panel">
      <div class="game-hud">
        <span id="scoreValue">${rouletteMode ? "Resultado pendiente" : "Score: 0"}</span>
        <span id="timeValue" ${rouletteMode ? 'style="display:none"' : ""}>Tiempo: ${escapeHtml(config.duration_seconds || 30)}</span>
        <span id="livesValue" ${rouletteMode ? 'style="display:none"' : ""}>Vidas: ${escapeHtml(config.lives || 3)}</span>
        <span id="gameObjectiveValue">${escapeHtml(minigameShortGoal(currentActivation.activation_type))}</span>
      </div>
      <div class="game-screen-wrap">
        <canvas class="game-canvas" id="gameCanvas" width="720" height="405"></canvas>
      </div>
      <div class="game-controls" aria-label="Controles touch">
        <button type="button" data-game-control="up">Arriba</button>
        <button type="button" data-game-control="left">Izq</button>
        <button type="button" data-game-control="fire">Accion</button>
        <button type="button" data-game-control="right">Der</button>
        <button type="button" data-game-control="down">Abajo</button>
      </div>
      <button class="submit-button" type="button" id="startGameButton">${rouletteMode ? "Girar ruleta" : "Iniciar partida"}</button>
      <small class="game-help">${rouletteMode ? "Toca la ruleta o el boton de accion para detenerla. El segmento final define el beneficio." : "Touch directo en pantalla. En celular tambien puedes usar los controles inferiores."}</small>
    </article>
  `;
  document.getElementById("startGameButton").addEventListener("click", startConfiguredMinigame);
}

function minigameShortGoal(type) {
  return {
    SPACE_SHOOTER: "Derriba naves",
    BREAKOUT: "Rompe bloques",
    SNAKE: "Come premios",
    CATCH_PRIZE: "Combos y bonus",
    MEMORY_PAIRS: "Encuentra pares",
    FAST_TAP: "Toca rapido",
    MINI_MAZE: "Llega a meta",
    WHACK_A_MOLE: "Atina al topo",
    DODGE_RUNNER: "Esquiva y recoge",
    BALLOON_POP: "Revienta globos",
    ROULETTE_SPIN: "Deten la ruleta",
    TOUCH_CATCH: "Atrapa objetivos",
    TRUE_FALSE: "Falso o verdadero",
    ORDER_OPTIONS: "Orden correcto",
    CONNECTORS: "Une pares",
    BATTLESHIP_COORDS: "Acierta coordenadas",
  }[type] || "Suma score";
}

function startConfiguredMinigame() {
  const config = currentActivation.game_config || {};
  const gameType = currentActivation.activation_type || config.game_type || "FAST_TAP";
  const canvas = document.getElementById("gameCanvas");
  const button = document.getElementById("startGameButton");
  cleanupGameState();
  button.disabled = true;
  button.textContent = "Partida en curso";
  gameState = createGameRuntime(canvas, config);
  ({
    SPACE_SHOOTER: startSpaceShooter,
    BREAKOUT: startBreakout,
    SNAKE: startSnake,
    CATCH_PRIZE: startCatchPrize,
    MEMORY_PAIRS: startMemoryPairs,
    FAST_TAP: startFastTap,
    MINI_MAZE: startMiniMaze,
    WHACK_A_MOLE: startWhackAMole,
    DODGE_RUNNER: startDodgeRunner,
    BALLOON_POP: startBalloonPop,
    ROULETTE_SPIN: startRouletteSpin,
    TOUCH_CATCH: startTouchCatch,
    TRUE_FALSE: startTrueFalse,
    ORDER_OPTIONS: startOrderOptions,
    CONNECTORS: startConnectors,
    BATTLESHIP_COORDS: startBattleshipCoords,
  }[gameType] || startFastTap)(gameState);
}

function createGameRuntime(canvas, config = {}) {
  const ctx = canvas.getContext("2d");
  const runtime = {
    canvas,
    ctx,
    config,
    width: canvas.width,
    height: canvas.height,
    duration: Math.max(10, Number(config.duration_seconds || 30)),
    points: Math.max(1, Number(config.points_per_target || 50)),
    penalty: Math.max(0, Number(config.penalty || 10)),
    maxScore: Math.max(100, Number(config.max_score || 10000)),
    minScoreForReward: Math.max(1, Number(config.min_score_for_reward || 1)),
    lives: Math.max(1, Math.min(10, Number(config.lives || 3))),
    fireInterval: Math.max(0.25, Math.min(1.2, Number(config.fire_interval_ms || 480) / 1000)),
    invulnerableUntil: 0,
    score: 0,
    done: false,
    startedAt: Date.now(),
    pausedMs: 0,
    pointer: { down: false, x: canvas.width / 2, y: canvas.height / 2, tap: false },
    keys: {},
    timers: [],
    cleanupFns: [],
    setScore(value) {
      runtime.score = Math.min(runtime.maxScore, Math.max(0, Math.round(value)));
      document.getElementById("scoreValue").textContent = `Score: ${runtime.score}`;
    },
    addScore(value) {
      runtime.setScore(runtime.score + value);
    },
    setLives(value) {
      runtime.lives = Math.max(0, Math.round(value));
      const livesValue = document.getElementById("livesValue");
      if (livesValue) livesValue.textContent = `Vidas: ${runtime.lives}`;
    },
    damage(amount = 1) {
      if (Date.now() < runtime.invulnerableUntil || runtime.lives <= 0) return false;
      runtime.setLives(runtime.lives - amount);
      runtime.addScore(-runtime.penalty);
      runtime.invulnerableUntil = Date.now() + 900;
      return true;
    },
    finish() {
      if (runtime.done) return;
      runtime.done = true;
      finishGame(runtime.score, Date.now() - runtime.startedAt);
    },
  };

  const pointerPosition = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  const pointerDown = (event) => {
    event.preventDefault();
    const pos = pointerPosition(event);
    runtime.pointer = { ...runtime.pointer, down: true, tap: true, ...pos };
    runtime.onPointerDown?.(pos);
  };
  const pointerMove = (event) => {
    if (!runtime.pointer.down) return;
    event.preventDefault();
    const pos = pointerPosition(event);
    runtime.pointer = { ...runtime.pointer, ...pos };
    runtime.onPointerMove?.(pos);
  };
  const pointerUp = (event) => {
    event.preventDefault();
    runtime.pointer.down = false;
    runtime.onPointerUp?.();
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  runtime.cleanupFns.push(() => {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerUp);
  });

  const keyMap = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", " ": "fire", Enter: "fire" };
  const keyDown = (event) => {
    const key = keyMap[event.key];
    if (!key) return;
    event.preventDefault();
    runtime.keys[key] = true;
    runtime.onControl?.(key);
  };
  const keyUp = (event) => {
    const key = keyMap[event.key];
    if (key) runtime.keys[key] = false;
  };
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  runtime.cleanupFns.push(() => {
    window.removeEventListener("keydown", keyDown);
    window.removeEventListener("keyup", keyUp);
  });

  document.querySelectorAll("[data-game-control]").forEach((control) => {
    const key = control.dataset.gameControl;
    const activate = (event) => {
      event.preventDefault();
      runtime.keys[key] = true;
      runtime.onControl?.(key);
    };
    const release = (event) => {
      event.preventDefault();
      runtime.keys[key] = false;
    };
    control.addEventListener("pointerdown", activate);
    control.addEventListener("pointerup", release);
    control.addEventListener("pointerleave", release);
    control.addEventListener("pointercancel", release);
    runtime.cleanupFns.push(() => {
      control.removeEventListener("pointerdown", activate);
      control.removeEventListener("pointerup", release);
      control.removeEventListener("pointerleave", release);
      control.removeEventListener("pointercancel", release);
    });
  });

  runtime.loop = (update) => {
    let last = performance.now();
    const frame = (now) => {
      if (runtime.done) return;
      const elapsed = (Date.now() - runtime.startedAt) / 1000;
      const effectiveElapsed = Math.max(0, elapsed - (runtime.pausedMs || 0) / 1000);
      const remaining = Math.max(0, runtime.duration - effectiveElapsed);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      update(dt, elapsed, remaining, effectiveElapsed);
      if (runtime.done) return;
      drawScanlines(runtime.ctx, runtime.width, runtime.height);
      document.getElementById("timeValue").textContent = `Tiempo: ${Math.ceil(remaining)}`;
      setProgress(Math.min(runtime.duration, effectiveElapsed), runtime.duration);
      runtime.pointer.tap = false;
      if (remaining <= 0) {
        runtime.finish();
        return;
      }
      runtime.frame = requestAnimationFrame(frame);
    };
    runtime.frame = requestAnimationFrame(frame);
  };

  runtime.setScore(0);
  runtime.setLives(runtime.lives);
  return runtime;
}

function drawRetroBackground(ctx, width, height, title) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(124, 251, 255, .08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 18px monospace";
  ctx.fillText(title || "MARKETGAMES", 18, 30);
}

function drawScanlines(ctx, width, height) {
  ctx.fillStyle = "rgba(0, 0, 0, .13)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectHit(circle, rect) {
  const x = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const y = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  return Math.hypot(circle.x - x, circle.y - y) <= circle.r;
}

function drawPixelShip(ctx, x, y, color = "#7cfbff") {
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y - 16, 8, 10);
  ctx.fillRect(x - 16, y - 6, 32, 12);
  ctx.fillRect(x - 24, y + 4, 12, 8);
  ctx.fillRect(x + 12, y + 4, 12, 8);
}

function drawGameOver(ctx, width, height, label = "SIN VIDAS") {
  ctx.fillStyle = "rgba(7, 17, 31, .72)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ff5c8a";
  ctx.font = "900 30px monospace";
  const textWidth = ctx.measureText(label).width;
  ctx.fillText(label, (width - textWidth) / 2, height / 2);
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 14px monospace";
  const hint = "Validando participacion...";
  ctx.fillText(hint, (width - ctx.measureText(hint).width) / 2, height / 2 + 30);
}

function shouldFinishAfterNoLives(runtime, elapsed, minSeconds = 3) {
  return runtime.lives <= 0 && elapsed >= minSeconds;
}

function startSpaceShooter(runtime) {
  const { ctx, width, height } = runtime;
  const enemySpawnSeconds = boundedGameNumber(runtime.config.enemy_spawn_ms, 480, 250, 1200) / 1000;
  const enemyBaseSpeed = boundedGameNumber(runtime.config.enemy_base_speed, 70, 40, 180);
  const enemyFireChance = boundedGameNumber(runtime.config.enemy_fire_chance, 55, 0, 100) / 100;
  const playerSpeed = boundedGameNumber(runtime.config.player_speed, 280, 160, 520);
  const player = { x: width / 2, y: height - 42, w: 44, h: 24, dead: false };
  const bullets = [];
  const enemyBullets = [];
  const enemies = [];
  let spawn = 0;
  let fireDelay = 0;
  let lastTouchX = null;
  const moveShipRelative = (pos) => {
    if (lastTouchX === null) {
      lastTouchX = pos.x;
      return;
    }
    const deltaX = pos.x - lastTouchX;
    player.x = Math.max(28, Math.min(width - 28, player.x + deltaX));
    lastTouchX = pos.x;
  };
  runtime.onPointerDown = (pos) => { lastTouchX = pos.x; };
  runtime.onPointerMove = moveShipRelative;
  runtime.onPointerUp = () => { lastTouchX = null; };
  runtime.onControl = (key) => { if (key === "fire") fireDelay = 0; };
  runtime.loop((dt, elapsed) => {
    if (player.dead) {
      drawRetroBackground(ctx, width, height, "MARCIANITOS");
      drawShooterObjects(ctx, bullets, enemies, enemyBullets);
      drawDestroyedShip(ctx, player.x, player.y);
      ctx.fillStyle = "#ff5c8a";
      ctx.font = "900 28px monospace";
      ctx.fillText("NAVE SIN VIDAS", width / 2 - 126, height / 2);
      if (elapsed >= 3) runtime.finish();
      return;
    }

    if (runtime.keys.left) player.x -= playerSpeed * dt;
    if (runtime.keys.right) player.x += playerSpeed * dt;
    player.x = Math.max(28, Math.min(width - 28, player.x));

    fireDelay -= dt;
    if (fireDelay <= 0) {
      bullets.push({ x: player.x, y: player.y - 18, w: 5, h: 14, vy: -460 });
      fireDelay = runtime.fireInterval;
    }
    spawn -= dt;
    if (spawn <= 0) {
      const lane = Math.floor(Math.random() * 9);
      enemies.push({
        x: 48 + lane * ((width - 96) / 8),
        y: 42,
        w: 28,
        h: 22,
        vy: enemyBaseSpeed + Math.random() * Math.max(18, enemyBaseSpeed),
        wobble: Math.random() * Math.PI * 2,
        shot: Math.random() <= enemyFireChance ? 0.5 + Math.random() * 1.4 : 999,
      });
      spawn = enemySpawnSeconds;
    }
    bullets.forEach((bullet) => { bullet.y += bullet.vy * dt; });
    enemyBullets.forEach((bullet) => { bullet.y += bullet.vy * dt; });
    enemies.forEach((enemy) => {
      enemy.y += enemy.vy * dt;
      enemy.wobble += dt * 3;
      enemy.x += Math.sin(enemy.wobble) * 0.9;
      enemy.shot -= dt;
      if (enemy.shot <= 0 && enemy.y < height * 0.62) {
        enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.h + 4, r: 5, vy: 190 + Math.random() * 70 });
        enemy.shot = 1 + Math.random() * 1.5;
      }
    });
    for (let e = enemies.length - 1; e >= 0; e -= 1) {
      const enemyRect = { x: enemies[e].x - enemies[e].w / 2, y: enemies[e].y, w: enemies[e].w, h: enemies[e].h };
      const playerRect = { x: player.x - player.w / 2, y: player.y - player.h / 2, w: player.w, h: player.h };
      if (rectsOverlap(enemyRect, playerRect)) {
        enemies.splice(e, 1);
        runtime.damage(1);
        if (runtime.lives <= 0) player.dead = true;
        continue;
      }
      if (enemyRect.y > height) {
        enemies.splice(e, 1);
        runtime.addScore(-runtime.penalty);
        continue;
      }
      for (let b = bullets.length - 1; b >= 0; b -= 1) {
        const bulletRect = { x: bullets[b].x - 2, y: bullets[b].y, w: bullets[b].w, h: bullets[b].h };
        if (rectsOverlap(enemyRect, bulletRect)) {
          enemies.splice(e, 1);
          bullets.splice(b, 1);
          runtime.addScore(runtime.points);
          break;
        }
      }
    }
    const playerRect = { x: player.x - player.w / 2, y: player.y - player.h / 2, w: player.w, h: player.h };
    for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = enemyBullets[i];
      if (circleRectHit(bullet, playerRect)) {
        enemyBullets.splice(i, 1);
        runtime.damage(1);
        if (runtime.lives <= 0) player.dead = true;
      } else if (bullet.y > height + 20) {
        enemyBullets.splice(i, 1);
      }
    }
    for (let b = bullets.length - 1; b >= 0; b -= 1) {
      if (bullets[b].y < -20) bullets.splice(b, 1);
    }
    drawRetroBackground(ctx, width, height, "MARCIANITOS");
    drawShooterObjects(ctx, bullets, enemies, enemyBullets);
    const blink = Date.now() < runtime.invulnerableUntil && Math.floor(Date.now() / 90) % 2 === 0;
    if (!blink) drawPixelShip(ctx, player.x, player.y);
  });
}

function drawShooterObjects(ctx, bullets, enemies, enemyBullets) {
  ctx.fillStyle = "#ffe06b";
  bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, bullet.w, bullet.h));
  ctx.fillStyle = "#ff9a3d";
  enemyBullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  });
  enemies.forEach((enemy) => {
    ctx.fillStyle = "#ff5c8a";
    ctx.fillRect(enemy.x - 14, enemy.y, 28, 12);
    ctx.fillRect(enemy.x - 8, enemy.y + 12, 16, 10);
    ctx.fillStyle = "#fff";
    ctx.fillRect(enemy.x - 8, enemy.y + 4, 4, 4);
    ctx.fillRect(enemy.x + 4, enemy.y + 4, 4, 4);
  });
}

function drawDestroyedShip(ctx, x, y) {
  ctx.fillStyle = "#ff5c8a";
  ctx.fillRect(x - 22, y - 8, 10, 10);
  ctx.fillRect(x + 12, y - 8, 10, 10);
  ctx.fillStyle = "#f2b84b";
  ctx.fillRect(x - 6, y - 18, 12, 12);
  ctx.fillRect(x - 12, y + 6, 24, 8);
}

function startBreakout(runtime) {
  const { ctx, width, height } = runtime;
  const paddleWidth = boundedGameInteger(runtime.config.paddle_width, 108, 70, 170);
  const ballSpeed = boundedGameNumber(runtime.config.ball_speed, 250, 150, 420);
  const paddle = { x: width / 2 - paddleWidth / 2, y: height - 36, w: paddleWidth, h: 14 };
  const ball = { x: width / 2, y: height - 64, r: 8, vx: ballSpeed * 0.76, vy: -ballSpeed };
  let bricks = buildBricks(width, runtime.config);
  let serving = 0.8;
  let dead = false;
  function resetBall() {
    ball.x = width / 2;
    ball.y = height - 64;
    ball.vx = ballSpeed * 0.68 * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = -ballSpeed;
    serving = 0.8;
  }
  runtime.onPointerMove = (pos) => { paddle.x = Math.max(12, Math.min(width - paddle.w - 12, pos.x - paddle.w / 2)); };
  runtime.onPointerDown = runtime.onPointerMove;
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "BREAKOUT");
      drawBreakoutObjects(ctx, bricks, paddle, ball);
      drawGameOver(ctx, width, height, "SIN BOLAS");
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    if (runtime.keys.left) paddle.x -= 360 * dt;
    if (runtime.keys.right) paddle.x += 360 * dt;
    paddle.x = Math.max(12, Math.min(width - paddle.w - 12, paddle.x));
    if (serving > 0) {
      const beforeServing = serving;
      serving -= dt;
      runtime.pausedMs += Math.max(0, Math.min(beforeServing, dt)) * 1000;
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - 18;
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
    }
    if (ball.x < ball.r || ball.x > width - ball.r) ball.vx *= -1;
    if (ball.y < 44) ball.vy = Math.abs(ball.vy);
    if (circleRectHit(ball, paddle) && ball.vy > 0) {
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = ballSpeed * 1.04 * hit;
      ball.vy = -Math.abs(ball.vy) - 6;
    }
    for (let i = bricks.length - 1; i >= 0; i -= 1) {
      if (circleRectHit(ball, bricks[i])) {
        bricks.splice(i, 1);
        ball.vy *= -1;
        runtime.addScore(runtime.points);
        break;
      }
    }
    if (!bricks.length) bricks = buildBricks(width, runtime.config);
    if (ball.y > height + 20) {
      runtime.damage(1);
      if (runtime.lives <= 0) {
        dead = true;
      } else {
        resetBall();
      }
    }
    drawRetroBackground(ctx, width, height, "BREAKOUT");
    drawBreakoutObjects(ctx, bricks, paddle, ball);
    if (serving > 0) {
      ctx.fillStyle = "#eafcff";
      ctx.font = "800 14px monospace";
      ctx.fillText("PREPARATE", width / 2 - 38, height - 72);
    }
  });
}

function drawBreakoutObjects(ctx, bricks, paddle, ball) {
  bricks.forEach((brick, index) => {
    ctx.fillStyle = ["#7cfbff", "#f2b84b", "#ff5c8a", "#57d27f"][index % 4];
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  });
  ctx.fillStyle = "#f8fdff";
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.fillStyle = "#ffe06b";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function buildBricks(width, config = {}) {
  const bricks = [];
  const cols = boundedGameInteger(config.brick_cols, 9, 5, 12);
  const rows = boundedGameInteger(config.brick_rows, 4, 2, 6);
  const gap = 8;
  const w = (width - 40 - gap * (cols - 1)) / cols;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      bricks.push({ x: 20 + col * (w + gap), y: 58 + row * 28, w, h: 18 });
    }
  }
  return bricks;
}

function startSnake(runtime) {
  const { ctx, width, height } = runtime;
  const cols = boundedGameInteger(runtime.config.board_cols, 24, 14, 30);
  const rows = boundedGameInteger(runtime.config.board_rows, 13, 9, 18);
  const moveInterval = boundedGameNumber(runtime.config.move_interval_ms, 130, 90, 260) / 1000;
  const growthPerFood = boundedGameInteger(runtime.config.growth_per_food, 1, 1, 3);
  const cell = Math.floor(Math.min((width - 40) / cols, (height - 72) / rows));
  const ox = Math.floor((width - cols * cell) / 2);
  const oy = 54;
  let snake = [{ x: 8, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 6 }];
  let dir = { x: 1, y: 0 };
  let nextDir = dir;
  let food = randomSnakeFood(cols, rows, snake);
  let moveClock = 0;
  let dead = false;
  function resetSnake() {
    snake = [{ x: 8, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 6 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    food = randomSnakeFood(cols, rows, snake);
    moveClock = 0;
  }
  runtime.onControl = (key) => {
    const map = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
    if (map[key] && !(map[key].x === -dir.x && map[key].y === -dir.y)) nextDir = map[key];
  };
  let swipeStart = null;
  runtime.onPointerDown = (pos) => { swipeStart = pos; };
  runtime.onPointerUp = () => {
    if (!swipeStart) return;
    const dx = runtime.pointer.x - swipeStart.x;
    const dy = runtime.pointer.y - swipeStart.y;
    runtime.onControl(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    swipeStart = null;
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "CULEBRITA");
      drawSnakeBoard(ctx, snake, food, ox, oy, cols, rows, cell);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    moveClock += dt;
    if (moveClock >= moveInterval) {
      moveClock = 0;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const crash = head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || snake.some((part) => part.x === head.x && part.y === head.y);
      if (crash) {
        runtime.damage(1);
        if (runtime.lives <= 0) {
          dead = true;
        } else {
          resetSnake();
        }
      } else {
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          runtime.addScore(runtime.points);
          for (let index = 1; index < growthPerFood; index += 1) {
            snake.push({ ...snake[snake.length - 1] });
          }
          food = randomSnakeFood(cols, rows, snake);
        } else {
          snake.pop();
        }
      }
    }
    drawRetroBackground(ctx, width, height, "CULEBRITA");
    drawSnakeBoard(ctx, snake, food, ox, oy, cols, rows, cell);
  });
}

function drawSnakeBoard(ctx, snake, food, ox, oy, cols, rows, cell) {
  ctx.strokeStyle = "#27465a";
  ctx.strokeRect(ox - 2, oy - 2, cols * cell + 4, rows * cell + 4);
  ctx.fillStyle = "#f2b84b";
  ctx.fillRect(ox + food.x * cell + 3, oy + food.y * cell + 3, cell - 6, cell - 6);
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? "#7cfbff" : "#57d27f";
    ctx.fillRect(ox + part.x * cell + 2, oy + part.y * cell + 2, cell - 4, cell - 4);
  });
}

function randomSnakeFood(cols, rows, snake) {
  let food;
  do {
    food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } while (snake.some((part) => part.x === food.x && part.y === food.y));
  return food;
}

function startCatchPrize(runtime) {
  const { ctx, width, height } = runtime;
  const laneCount = boundedGameInteger(runtime.config.lane_count, 7, 4, 9);
  const dropBaseSpeed = boundedGameNumber(runtime.config.drop_base_speed, 118, 80, 260);
  const startingLives = runtime.lives;
  const basket = { x: width / 2 - 48, y: height - 44, w: 96, h: 18 };
  const drops = [];
  const effects = [];
  const lanes = Array.from({ length: laneCount }, (_, index) => 38 + index * ((width - 76) / (laneCount - 1)));
  let spawn = 0.18;
  let burstClock = 5;
  let targetX = basket.x;
  let dragStartX = null;
  let basketStartX = basket.x;
  let combo = 0;
  let bestCombo = 0;
  let shield = 0;
  let magnetUntil = 0;
  let slowUntil = 0;
  let jackpotFlash = 0;
  let dead = false;
  const clampBasket = (value) => Math.max(10, Math.min(width - basket.w - 10, value));
  runtime.onPointerDown = (pos) => {
    dragStartX = pos.x;
    basketStartX = basket.x;
    targetX = basket.x;
  };
  runtime.onPointerMove = (pos) => {
    if (dragStartX === null) return;
    targetX = clampBasket(basketStartX + (pos.x - dragStartX));
  };
  runtime.onPointerUp = () => {
    dragStartX = null;
  };
  runtime.loop((dt, elapsed, remaining, effectiveElapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "ATRAPA EL PREMIO");
      drawCatchObjects(ctx, drops, basket, { combo, bestCombo, shield, magnetUntil, slowUntil, jackpotFlash, effects, elapsed });
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    if (runtime.keys.left) targetX -= 470 * dt;
    if (runtime.keys.right) targetX += 470 * dt;
    targetX = clampBasket(targetX);
    basket.x += (targetX - basket.x) * Math.min(1, dt * 13);
    spawn -= dt;
    burstClock -= dt;
    jackpotFlash = Math.max(0, jackpotFlash - dt);
    if (burstClock <= 0) {
      spawnCatchBurst(drops, lanes, width, effectiveElapsed, runtime.config);
      burstClock = 5.5 + Math.random() * 2.8;
    }
    if (spawn <= 0) {
      drops.push(createCatchDrop(lanes, width, effectiveElapsed, runtime.config));
      spawn = Math.max(0.16, 0.48 - effectiveElapsed * 0.01) + Math.random() * 0.16;
    }
    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const drop = drops[i];
      const speedScale = Date.now() < slowUntil ? 0.62 : 1;
      if (Date.now() < magnetUntil && drop.good && Math.abs((drop.x || 0) - (basket.x + basket.w / 2)) < 130 && drop.y > 88) {
        drop.x += (basket.x + basket.w / 2 - drop.x) * Math.min(1, dt * 4.2);
      }
      drop.x += Math.sin(elapsed * drop.swaySpeed + drop.phase) * drop.sway * dt;
      drop.y += drop.vy * speedScale * dt;
      drop.spin += dt * drop.spinSpeed;
      if (circleRectHit(drop, basket)) {
        const result = applyCatchDrop(runtime, drop, {
          combo,
          startingLives,
          shield,
          magnetUntil,
          slowUntil,
        });
        combo = result.combo;
        shield = result.shield;
        magnetUntil = result.magnetUntil;
        slowUntil = result.slowUntil;
        bestCombo = Math.max(bestCombo, combo);
        if (drop.type === "bomb") {
          jackpotFlash = 0.45;
          addCatchExplosion(effects, drop.x, drop.y, "#ff5c8a");
          drops.splice(i, 1);
          removeDropsNear(drops, drop, 54);
        } else {
          addCatchPop(effects, drop.x, drop.y, drop.color, drop.label);
          drops.splice(i, 1);
        }
        if (runtime.lives <= 0) dead = true;
      } else if (drop.y > height + 20) {
        if (drop.good && drop.type !== "magnet" && drop.type !== "clock" && drop.type !== "shield") {
          runtime.addScore(-Math.ceil(runtime.penalty / 2));
          combo = 0;
        }
        drops.splice(i, 1);
      }
    }
    updateCatchEffects(effects, dt);
    drawRetroBackground(ctx, width, height, "ATRAPA EL PREMIO");
    drawCatchLanes(ctx, lanes, height, elapsed);
    drawCatchObjects(ctx, drops, basket, { combo, bestCombo, shield, magnetUntil, slowUntil, jackpotFlash, effects, elapsed });
  });
}

function createCatchDrop(lanes, width, elapsed = 0, config = {}) {
  const type = weightedCatchDropType(elapsed, config);
  const lane = lanes[Math.floor(Math.random() * lanes.length)] || (24 + Math.random() * (width - 48));
  const offset = (Math.random() - 0.5) * 18;
  const speedBoost = Math.min(170, elapsed * 5.5);
  const base = {
    x: Math.max(24, Math.min(width - 24, lane + offset)),
    y: 42,
    r: 12,
    vy: boundedGameNumber(config.drop_base_speed, 118, 80, 260) + speedBoost + Math.random() * 120,
    phase: Math.random() * Math.PI * 2,
    sway: 8 + Math.random() * 18,
    swaySpeed: 1.2 + Math.random() * 2.4,
    spin: 0,
    spinSpeed: 2 + Math.random() * 5,
  };
  const presets = {
    coin: { good: true, label: "$", color: "#f2b84b", scoreScale: 1, r: 12 },
    gem: { good: true, label: "*", color: "#7cfbff", scoreScale: 1.6, r: 11 },
    jackpot: { good: true, label: "VIP", color: "#57d27f", scoreScale: 2.4, r: 15, vy: base.vy * 1.08 },
    magnet: { good: true, special: true, label: "M", color: "#b894ff", scoreScale: 0.5, r: 13 },
    clock: { good: true, special: true, label: "+T", color: "#eafcff", scoreScale: 0.4, r: 13 },
    shield: { good: true, special: true, label: "S", color: "#5ad7ff", scoreScale: 0.4, r: 13 },
    rotten: { good: false, label: "X", color: "#ff9a3d", damage: 1, r: 12 },
    bomb: { good: false, label: "!", color: "#ff5c8a", damage: 2, r: 15, vy: base.vy * 0.95 },
  };
  return { ...base, ...presets[type], type };
}

function weightedCatchDropType(elapsed = 0, config = {}) {
  const pressure = Math.min(0.16, elapsed * 0.004);
  const badRate = boundedGameNumber(config.bad_item_rate, 34, 10, 70) / 100;
  const bonusRate = boundedGameNumber(config.bonus_item_rate, 22, 0, 45) / 100;
  const roll = Math.random();
  if (roll < bonusRate * 0.27) return "clock";
  if (roll < bonusRate * 0.5) return "shield";
  if (roll < bonusRate * 0.73) return "magnet";
  if (roll < bonusRate * 0.88) return "gem";
  if (roll < bonusRate) return "jackpot";
  if (roll < bonusRate + badRate * 0.58 + pressure) return "rotten";
  if (roll < bonusRate + badRate + pressure) return "bomb";
  return "coin";
}

function spawnCatchBurst(drops, lanes, width, elapsed, config = {}) {
  const used = shuffleArray([...lanes]).slice(0, 3 + Math.floor(Math.random() * 2));
  used.forEach((lane, index) => {
    const drop = createCatchDrop([lane], width, elapsed + index * 3, config);
    drop.y -= index * 26;
    drop.vy += index * 28;
    drops.push(drop);
  });
}

function applyCatchDrop(runtime, drop, state) {
  let { combo, shield, magnetUntil, slowUntil } = state;
  if (drop.good) {
    combo += 1;
    const comboScale = Math.min(3, 1 + Math.floor(combo / 4) * 0.35);
    runtime.addScore(Math.round(runtime.points * (drop.scoreScale || 1) * comboScale));
    if (drop.type === "magnet") magnetUntil = Date.now() + 4500;
    if (drop.type === "clock") {
      runtime.pausedMs += 2500;
      slowUntil = Date.now() + 3200;
    }
    if (drop.type === "shield") shield = Math.min(2, shield + 1);
    if (drop.type === "jackpot") runtime.addScore(Math.round(runtime.points * Math.min(5, 1 + combo / 5)));
    if (drop.type === "clock" || drop.type === "magnet" || drop.type === "shield") {
      runtime.setLives(Math.min(state.startingLives, runtime.lives + (drop.type === "shield" ? 0 : 0)));
    }
    return { combo, shield, magnetUntil, slowUntil };
  }
  combo = 0;
  if (shield > 0) {
    shield -= 1;
    runtime.addScore(-Math.ceil(runtime.penalty / 2));
    return { combo, shield, magnetUntil, slowUntil };
  }
  runtime.damage(drop.damage || 1);
  return { combo, shield, magnetUntil, slowUntil };
}

function removeDropsNear(drops, source, radius) {
  for (let index = drops.length - 1; index >= 0; index -= 1) {
    const drop = drops[index];
    if (Math.hypot(drop.x - source.x, drop.y - source.y) <= radius) drops.splice(index, 1);
  }
}

function addCatchPop(effects, x, y, color, label) {
  effects.push({ x, y, color, label: `+${label}`, age: 0, ttl: 0.55, kind: "pop" });
}

function addCatchExplosion(effects, x, y, color) {
  effects.push({ x, y, color, label: "BOOM", age: 0, ttl: 0.7, kind: "blast" });
}

function updateCatchEffects(effects, dt) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    effects[index].age += dt;
    if (effects[index].age >= effects[index].ttl) effects.splice(index, 1);
  }
}

function drawCatchLanes(ctx, lanes, height, elapsed) {
  lanes.forEach((lane, index) => {
    ctx.strokeStyle = index % 2 ? "rgba(124, 251, 255, .08)" : "rgba(242, 184, 75, .08)";
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(lane, 46 + Math.sin(elapsed + index) * 3);
    ctx.lineTo(lane, height - 54);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawCatchObjects(ctx, drops, basket, state = {}) {
  drops.forEach((drop) => {
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(drop.spin || 0);
    ctx.fillStyle = drop.color || (drop.good ? "#f2b84b" : "#ff5c8a");
    ctx.beginPath();
    ctx.arc(0, 0, drop.r, 0, Math.PI * 2);
    ctx.fill();
    if (drop.type === "bomb") {
      ctx.strokeStyle = "#ffe06b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, drop.r + 5 + Math.sin(Date.now() / 90) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#07111f";
    ctx.font = drop.label && drop.label.length > 1 ? "900 10px monospace" : "900 14px monospace";
    const label = drop.label || (drop.good ? "$" : "X");
    ctx.fillText(label, -ctx.measureText(label).width / 2, 5);
    ctx.restore();
  });
  if (state.jackpotFlash > 0) {
    ctx.fillStyle = `rgba(255, 92, 138, ${state.jackpotFlash * 0.22})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  const activeMagnet = Date.now() < (state.magnetUntil || 0);
  const activeSlow = Date.now() < (state.slowUntil || 0);
  if (activeMagnet) {
    ctx.strokeStyle = "rgba(184, 148, 255, .38)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(basket.x + basket.w / 2, basket.y + 4, 130, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = state.shield > 0 ? "#5ad7ff" : "#7cfbff";
  ctx.fillRect(basket.x, basket.y, basket.w, basket.h);
  ctx.fillRect(basket.x + 8, basket.y - 8, basket.w - 16, 8);
  ctx.fillStyle = "#07111f";
  ctx.fillRect(basket.x + 12, basket.y - 5, basket.w - 24, 3);
  if (state.shield > 0) {
    ctx.strokeStyle = "#eafcff";
    ctx.lineWidth = 3;
    ctx.strokeRect(basket.x - 5, basket.y - 15, basket.w + 10, basket.h + 24);
  }
  (state.effects || []).forEach((effect) => {
    const pct = effect.age / effect.ttl;
    ctx.globalAlpha = Math.max(0, 1 - pct);
    ctx.fillStyle = effect.color || "#eafcff";
    ctx.font = effect.kind === "blast" ? "900 22px monospace" : "900 16px monospace";
    ctx.fillText(effect.label, effect.x - ctx.measureText(effect.label).width / 2, effect.y - pct * 42);
    if (effect.kind === "blast") {
      ctx.strokeStyle = effect.color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 14 + pct * 48, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  drawCatchStatus(ctx, state.combo || 0, state.bestCombo || 0, state.shield || 0, activeMagnet, activeSlow);
}

function drawCatchStatus(ctx, combo, bestCombo, shield, magnet, slow) {
  const items = [
    `COMBO x${combo}`,
    `MEJOR ${bestCombo}`,
    shield ? `ESCUDO ${shield}` : "",
    magnet ? "IMAN" : "",
    slow ? "TIEMPO+" : "",
  ].filter(Boolean);
  ctx.font = "900 13px monospace";
  let x = 16;
  items.forEach((item) => {
    const w = ctx.measureText(item).width + 18;
    ctx.fillStyle = "rgba(7, 17, 31, .72)";
    ctx.fillRect(x, 48, w, 24);
    ctx.strokeStyle = "#27465a";
    ctx.strokeRect(x, 48, w, 24);
    ctx.fillStyle = item.startsWith("COMBO") && combo >= 4 ? "#f2b84b" : "#eafcff";
    ctx.fillText(item, x + 9, 65);
    x += w + 8;
  });
}

function startMemoryPairs(runtime) {
  const { ctx, width, height } = runtime;
  const pairCount = boundedGameInteger(runtime.config.pair_count, 6, 3, 8);
  const mismatchRevealMs = boundedGameInteger(runtime.config.mismatch_reveal_ms, 650, 350, 1500);
  const configuredSymbols = Array.isArray(runtime.config.symbols) && runtime.config.symbols.length >= pairCount
    ? runtime.config.symbols
    : ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = 4;
  const rows = Math.ceil((pairCount * 2) / cols);
  const cardW = Math.min(112, Math.floor((width - 90) / cols));
  const cardH = Math.min(78, Math.floor((height - 105) / rows));
  const gap = 14;
  const ox = (width - cols * cardW - (cols - 1) * gap) / 2;
  const oy = 66;
  const selectedSymbols = configuredSymbols.slice(0, pairCount);
  const symbols = shuffleArray([...selectedSymbols, ...selectedSymbols])
    .map((symbol, index) => ({ symbol, index, matched: false, open: false }));
  let selected = [];
  let lockUntil = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead || Date.now() < lockUntil) return;
    const card = cardAt(pos, ox, oy, cardW, cardH, gap, cols, symbols);
    if (!card || card.open || card.matched) return;
    card.open = true;
    selected.push(card);
    if (selected.length === 2) {
      if (selected[0].symbol === selected[1].symbol) {
        selected.forEach((item) => { item.matched = true; });
        selected = [];
        runtime.addScore(runtime.points);
      } else {
        runtime.damage(1);
        if (runtime.lives <= 0) dead = true;
        lockUntil = Date.now() + mismatchRevealMs;
        const pair = selected;
        selected = [];
        const timer = window.setTimeout(() => {
          pair.forEach((item) => { item.open = false; });
        }, Math.max(300, mismatchRevealMs - 30));
        runtime.timers.push(timer);
      }
    }
  };
  runtime.loop((dt, elapsed) => {
    drawRetroBackground(ctx, width, height, "MEMORIA DE PARES");
    drawMemoryCards(ctx, symbols, ox, oy, cardW, cardH, gap, cols);
    if (dead) {
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    if (symbols.every((card) => card.matched)) {
      runtime.addScore(runtime.points * 2);
      symbols.forEach((card) => { card.matched = false; card.open = false; });
      shuffleArray(symbols);
    }
  });
}

function drawMemoryCards(ctx, symbols, ox, oy, cardW, cardH, gap, cols) {
  symbols.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = ox + col * (cardW + gap);
    const y = oy + row * (cardH + gap);
    ctx.fillStyle = card.matched ? "#143f35" : (card.open ? "#f2b84b" : "#182d45");
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = "#7cfbff";
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.fillStyle = card.open || card.matched ? "#07111f" : "#7cfbff";
    ctx.font = "900 32px monospace";
    ctx.fillText(card.open || card.matched ? card.symbol : "?", x + cardW / 2 - 10, y + cardH / 2 + 11);
  });
}

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function cardAt(pos, ox, oy, cardW, cardH, gap, cols, cards) {
  return cards.find((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = ox + col * (cardW + gap);
    const y = oy + row * (cardH + gap);
    return pos.x >= x && pos.x <= x + cardW && pos.y >= y && pos.y <= y + cardH;
  });
}

function startFastTap(runtime) {
  const { ctx, width, height } = runtime;
  let target = fastTapTarget(width, height, runtime.config);
  let age = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const hit = Math.hypot(pos.x - target.x, pos.y - target.y) <= target.r + 10;
    if (hit) {
      runtime.addScore(runtime.points);
      target = fastTapTarget(width, height, runtime.config);
      age = 0;
    } else {
      runtime.damage(1);
      if (runtime.lives <= 0) dead = true;
    }
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "TAP RAPIDO");
      drawFastTapTarget(ctx, target, age);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    age += dt;
    if (age > target.ttl) {
      runtime.damage(1);
      if (runtime.lives <= 0) dead = true;
      target = fastTapTarget(width, height, runtime.config);
      age = 0;
    }
    drawRetroBackground(ctx, width, height, "TAP RAPIDO");
    drawFastTapTarget(ctx, target, age);
  });
}

function drawFastTapTarget(ctx, target, age) {
  const pulse = 1 + Math.sin(Date.now() / 80) * 0.08;
  ctx.fillStyle = "#ff5c8a";
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f2b84b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - age / target.ttl));
  ctx.stroke();
}

function fastTapTarget(width, height, config = {}) {
  const minSize = boundedGameNumber(config.target_min_size, 18, 12, 32);
  const maxSize = Math.max(minSize, boundedGameNumber(config.target_max_size, 32, 20, 48));
  return {
    x: 48 + Math.random() * (width - 96),
    y: 70 + Math.random() * (height - 120),
    r: minSize + Math.random() * (maxSize - minSize),
    ttl: boundedGameNumber(config.target_ttl_ms, 1050, 450, 1800) / 1000,
  };
}

function startMiniMaze(runtime) {
  const { ctx, width, height } = runtime;
  const playerSpeed = boundedGameNumber(runtime.config.player_speed, 180, 100, 280);
  const goalMultiplier = boundedGameInteger(runtime.config.goal_points_multiplier, 3, 1, 6);
  const difficulty = String(runtime.config.maze_difficulty || "medium");
  const start = { x: 48, y: height - 48 };
  const goal = { x: width - 52, y: 58, r: 22 };
  const player = { ...start, r: 12 };
  const baseWalls = [
    { x: 94, y: 78, w: 28, h: 258 },
    { x: 180, y: 52, w: 28, h: 250 },
    { x: 266, y: 132, w: 28, h: 250 },
    { x: 352, y: 52, w: 28, h: 250 },
    { x: 438, y: 132, w: 28, h: 250 },
    { x: 524, y: 52, w: 28, h: 250 },
    { x: 116, y: 78, w: 92, h: 24 },
    { x: 290, y: 356, w: 176, h: 24 },
    { x: 552, y: 132, w: 94, h: 24 },
  ];
  const wallScale = difficulty === "easy" ? 0.72 : difficulty === "hard" ? 1.22 : 1;
  const walls = baseWalls.map((wall) => ({ ...wall, w: Math.max(18, Math.round(wall.w * wallScale)) }));
  let target = { x: player.x, y: player.y };
  let dead = false;
  runtime.onPointerDown = (pos) => { target = pos; };
  runtime.onPointerMove = (pos) => { target = pos; };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "MINI LABERINTO");
      drawMazeObjects(ctx, walls, goal, player);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    if (runtime.keys.left) target.x = player.x - 40;
    if (runtime.keys.right) target.x = player.x + 40;
    if (runtime.keys.up) target.y = player.y - 40;
    if (runtime.keys.down) target.y = player.y + 40;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    const next = {
      x: player.x + (dx / distance) * Math.min(distance, playerSpeed * dt),
      y: player.y + (dy / distance) * Math.min(distance, playerSpeed * dt),
      r: player.r,
    };
    const hitWall = walls.some((wall) => circleRectHit(next, wall));
    if (hitWall || next.x < 16 || next.y < 44 || next.x > width - 16 || next.y > height - 16) {
      runtime.damage(1);
      player.x = start.x;
      player.y = start.y;
      target = { x: player.x, y: player.y };
      if (runtime.lives <= 0) dead = true;
    } else {
      player.x = next.x;
      player.y = next.y;
    }
    if (Math.hypot(player.x - goal.x, player.y - goal.y) < goal.r + player.r) {
      runtime.addScore(runtime.points * goalMultiplier);
      player.x = start.x;
      player.y = start.y;
      target = { x: player.x, y: player.y };
    }
    drawRetroBackground(ctx, width, height, "MINI LABERINTO");
    drawMazeObjects(ctx, walls, goal, player);
  });
}

function drawMazeObjects(ctx, walls, goal, player) {
  ctx.fillStyle = "#ff5c8a";
  walls.forEach((wall) => ctx.fillRect(wall.x, wall.y, wall.w, wall.h));
  ctx.fillStyle = "#57d27f";
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7cfbff";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
}

function startWhackAMole(runtime) {
  const { ctx, width, height } = runtime;
  const grid = buildWhackGrid(width, height, runtime.config);
  let target = createWhackTarget(grid, runtime.config);
  let age = 0;
  let combo = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const hitIndex = grid.findIndex((hole) => Math.hypot(pos.x - hole.x, pos.y - hole.y) <= hole.r);
    if (hitIndex < 0) {
      runtime.damage(1);
      combo = 0;
    } else if (hitIndex === target.index && target.good) {
      combo += 1;
      runtime.addScore(runtime.points + Math.min(combo, 5) * 5);
      target = createWhackTarget(grid, runtime.config);
      age = 0;
    } else {
      runtime.damage(target.good ? 1 : 2);
      combo = 0;
      target = createWhackTarget(grid, runtime.config);
      age = 0;
    }
    if (runtime.lives <= 0) dead = true;
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "GOLPEA EL TOPO");
      drawWhackGrid(ctx, grid, target, age, combo);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    age += dt;
    if (age > target.ttl) {
      if (target.good) {
        runtime.damage(1);
        combo = 0;
      }
      target = createWhackTarget(grid, runtime.config);
      age = 0;
      if (runtime.lives <= 0) dead = true;
    }
    drawRetroBackground(ctx, width, height, "GOLPEA EL TOPO");
    drawWhackGrid(ctx, grid, target, age, combo);
  });
}

function buildWhackGrid(width, height, config = {}) {
  const holes = [];
  const rows = boundedGameInteger(config.hole_rows, 3, 2, 4);
  const cols = boundedGameInteger(config.hole_cols, 3, 2, 4);
  const xGap = Math.min(170, (width - 120) / Math.max(1, cols - 1));
  const yGap = Math.min(92, (height - 150) / Math.max(1, rows - 1));
  const startX = width / 2 - ((cols - 1) * xGap) / 2;
  const startY = 94;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      holes.push({ x: startX + col * xGap, y: startY + row * yGap, r: rows > 3 || cols > 3 ? 28 : 34 });
    }
  }
  return holes;
}

function createWhackTarget(grid, config = {}) {
  return {
    index: Math.floor(Math.random() * grid.length),
    good: Math.random() > boundedGameNumber(config.bad_target_rate, 18, 0, 45) / 100,
    ttl: boundedGameNumber(config.target_ttl_ms, 950, 450, 1600) / 1000,
  };
}

function drawWhackGrid(ctx, grid, target, age, combo) {
  grid.forEach((hole, index) => {
    ctx.fillStyle = "#17293b";
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 14, hole.r + 16, hole.r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    if (index !== target.index) return;
    const progress = Math.max(0, 1 - age / target.ttl);
    const lift = 12 + progress * 18;
    ctx.fillStyle = target.good ? "#f2b84b" : "#ff5c8a";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y - lift, hole.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07111f";
    ctx.fillRect(hole.x - 12, hole.y - lift - 8, 7, 7);
    ctx.fillRect(hole.x + 5, hole.y - lift - 8, 7, 7);
    ctx.fillRect(hole.x - 10, hole.y - lift + 10, 20, 4);
  });
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 14px monospace";
  ctx.fillText(`COMBO ${combo}`, 18, 54);
}

function startDodgeRunner(runtime) {
  const { ctx, width, height } = runtime;
  const playerSpeed = boundedGameNumber(runtime.config.player_speed, 300, 160, 520);
  const spawnBase = boundedGameNumber(runtime.config.runner_spawn_ms, 580, 180, 900) / 1000;
  const player = { x: width / 2, y: height - 52, r: 17 };
  const items = [];
  let spawn = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    player.x = pos.x;
    player.y = Math.max(70, Math.min(height - 28, pos.y));
  };
  runtime.onPointerMove = runtime.onPointerDown;
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "RUNNER");
      drawRunnerObjects(ctx, player, items);
      drawGameOver(ctx, width, height, "CHOQUE");
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    if (runtime.keys.left) player.x -= playerSpeed * dt;
    if (runtime.keys.right) player.x += playerSpeed * dt;
    if (runtime.keys.up) player.y -= playerSpeed * 0.8 * dt;
    if (runtime.keys.down) player.y += playerSpeed * 0.8 * dt;
    player.x = Math.max(22, Math.min(width - 22, player.x));
    player.y = Math.max(70, Math.min(height - 24, player.y));
    spawn -= dt;
    if (spawn <= 0) {
      items.push(createRunnerItem(width, elapsed, runtime.config));
      spawn = Math.max(0.18, spawnBase - elapsed * 0.012);
    }
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      item.y += item.vy * dt;
      item.x += Math.sin(elapsed * item.swaySpeed + item.phase) * item.sway * dt;
      if (Math.hypot(player.x - item.x, player.y - item.y) < player.r + item.r) {
        if (item.good) {
          runtime.addScore(runtime.points * item.scale);
        } else {
          runtime.damage(1);
          if (runtime.lives <= 0) dead = true;
        }
        items.splice(i, 1);
      } else if (item.y > height + 24) {
        items.splice(i, 1);
      }
    }
    drawRetroBackground(ctx, width, height, "RUNNER");
    drawRunnerLanes(ctx, width, height, elapsed);
    drawRunnerObjects(ctx, player, items);
  });
}

function createRunnerItem(width, elapsed, config = {}) {
  const bad = Math.random() < Math.min(0.75, boundedGameNumber(config.bad_item_rate, 28, 10, 70) / 100 + elapsed * 0.01);
  const baseSpeed = boundedGameNumber(config.runner_item_speed, 150, 90, 340);
  return {
    x: 40 + Math.random() * (width - 80),
    y: 54,
    r: bad ? 16 : 13,
    vy: baseSpeed + Math.random() * 120 + Math.min(150, elapsed * 6),
    good: !bad,
    scale: Math.random() > 0.82 ? 2 : 1,
    phase: Math.random() * Math.PI * 2,
    sway: 10 + Math.random() * 30,
    swaySpeed: 1.5 + Math.random() * 2.5,
  };
}

function drawRunnerLanes(ctx, width, height, elapsed) {
  ctx.strokeStyle = "rgba(234, 252, 255, .14)";
  ctx.lineWidth = 3;
  for (let x = width / 2 - 180; x <= width / 2 + 180; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 48 + (elapsed * 90) % 42);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawRunnerObjects(ctx, player, items) {
  items.forEach((item) => {
    ctx.fillStyle = item.good ? (item.scale > 1 ? "#57d27f" : "#f2b84b") : "#ff5c8a";
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07111f";
    ctx.font = "900 12px monospace";
    ctx.fillText(item.good ? "$" : "!", item.x - 4, item.y + 4);
  });
  ctx.fillStyle = "#7cfbff";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07111f";
  ctx.fillRect(player.x - 10, player.y - 5, 20, 10);
}

function startBalloonPop(runtime) {
  const { ctx, width, height } = runtime;
  const spawnBase = boundedGameNumber(runtime.config.balloon_spawn_ms, 460, 160, 900) / 1000;
  const streakBonusStep = Math.ceil(boundedGameNumber(runtime.config.streak_bonus, 24, 0, 30) / 6);
  const balloons = [];
  let spawn = 0;
  let streak = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const index = balloons.findIndex((balloon) => Math.hypot(pos.x - balloon.x, pos.y - balloon.y) <= balloon.r + 8);
    if (index < 0) {
      runtime.damage(1);
      streak = 0;
    } else {
      const balloon = balloons[index];
      if (balloon.bad) {
        runtime.damage(2);
        streak = 0;
      } else {
        streak += 1;
        runtime.addScore(runtime.points * balloon.scale + Math.min(streak, 6) * streakBonusStep);
      }
      balloons.splice(index, 1);
    }
    if (runtime.lives <= 0) dead = true;
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "GLOBOS");
      drawBalloons(ctx, balloons, streak);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    spawn -= dt;
    if (spawn <= 0) {
      balloons.push(createBalloon(width, height, elapsed, runtime.config));
      spawn = Math.max(0.16, spawnBase - elapsed * 0.008);
    }
    for (let i = balloons.length - 1; i >= 0; i -= 1) {
      const balloon = balloons[i];
      balloon.y -= balloon.vy * dt;
      balloon.x += Math.sin(elapsed * balloon.swaySpeed + balloon.phase) * balloon.sway * dt;
      if (balloon.y < 40) {
        if (!balloon.bad) {
          runtime.damage(1);
          streak = 0;
        }
        balloons.splice(i, 1);
        if (runtime.lives <= 0) dead = true;
      }
    }
    drawRetroBackground(ctx, width, height, "GLOBOS");
    drawBalloons(ctx, balloons, streak);
  });
}

function createBalloon(width, height, elapsed, config = {}) {
  const bad = Math.random() < Math.min(0.55, boundedGameNumber(config.bad_balloon_rate, 16, 0, 45) / 100 + elapsed * 0.006);
  const scale = Math.random() > 0.78 ? 2 : 1;
  const baseSpeed = boundedGameNumber(config.balloon_speed, 95, 60, 240);
  return {
    x: 38 + Math.random() * (width - 76),
    y: height - 28,
    r: scale > 1 ? 18 : 14,
    vy: baseSpeed + Math.random() * 70 + Math.min(90, elapsed * 3),
    bad,
    scale,
    phase: Math.random() * Math.PI * 2,
    sway: 18 + Math.random() * 34,
    swaySpeed: 1.3 + Math.random() * 2.1,
  };
}

function drawBalloons(ctx, balloons, streak) {
  balloons.forEach((balloon) => {
    ctx.fillStyle = balloon.bad ? "#ff5c8a" : (balloon.scale > 1 ? "#57d27f" : "#7cfbff");
    ctx.beginPath();
    ctx.ellipse(balloon.x, balloon.y, balloon.r * 0.9, balloon.r * 1.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(234, 252, 255, .45)";
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.r);
    ctx.lineTo(balloon.x + Math.sin(balloon.phase) * 8, balloon.y + balloon.r + 28);
    ctx.stroke();
    ctx.fillStyle = "#07111f";
    ctx.font = "900 12px monospace";
    ctx.fillText(balloon.bad ? "!" : (balloon.scale > 1 ? "2x" : "+"), balloon.x - 7, balloon.y + 4);
  });
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 14px monospace";
  ctx.fillText(`RACHA ${streak}`, 18, 54);
}

function startRouletteSpin(runtime) {
  const { ctx, width, height } = runtime;
  const configuredSegments = currentActivation.reward_config?.choices
    || currentActivation.game_config?.segments
    || [];
  const palette = ["#57d27f", "#7cfbff", "#f2b84b", "#b894ff", "#ff9a3d", "#ff5c8a", "#5ad7ff", "#eafcff"];
  const segments = (configuredSegments.length ? configuredSegments : [
    { value: "ROULETTE_1", label: "10% de descuento" },
    { value: "ROULETTE_2", label: "Regalo sorpresa" },
    { value: "ROULETTE_3", label: "2x1 seleccionado" },
    { value: "ROULETTE_4", label: "Acceso VIP" },
  ]).map((segment, index) => ({
    value: segment.value || segment.key || `ROULETTE_${index + 1}`,
    label: segment.label || segment.reward_label || `Beneficio ${index + 1}`,
    color: palette[index % palette.length],
  }));
  let angle = 0;
  let speed = 10 + Math.random() * 2;
  let stopping = false;
  let completed = false;
  runtime.onPointerDown = () => {
    stopping = true;
  };
  runtime.onControl = (key) => {
    if (key === "fire") stopping = true;
  };
  let last = performance.now();
  const frame = (now) => {
    if (runtime.done || completed) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    angle += speed * dt;
    if (stopping) {
      speed = Math.max(0, speed - dt * 4.2);
      if (speed <= 0.08) {
        completed = true;
        const landed = rouletteSegmentAtPointer(segments, angle);
        const scoreValue = document.getElementById("scoreValue");
        if (scoreValue) scoreValue.textContent = `Resultado: ${landed.label}`;
        drawRetroBackground(ctx, width, height, "RULETA");
        drawRoulette(ctx, width / 2, height / 2 + 8, 132, segments, angle, true, landed);
        setProgress(1, 1);
        window.setTimeout(() => {
          cleanupGameState();
          completeActivation({
            selected_choice: landed.value,
            score: 1,
            duration_ms: Date.now() - runtime.startedAt,
            participant_id: participant?.id,
            game_session_token: gameSessionToken,
          });
        }, 650);
        return;
      }
    }
    drawRetroBackground(ctx, width, height, "RULETA");
    drawRoulette(ctx, width / 2, height / 2 + 8, 132, segments, angle, stopping);
    runtime.frame = requestAnimationFrame(frame);
  };
  drawRetroBackground(ctx, width, height, "RULETA");
  drawRoulette(ctx, width / 2, height / 2 + 8, 132, segments, angle, false);
  runtime.frame = requestAnimationFrame(frame);
}

function rouletteSegmentAtPointer(segments, angle) {
  const slice = (Math.PI * 2) / segments.length;
  const pointerAngle = -Math.PI / 2;
  const normalized = ((pointerAngle - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  return segments[Math.floor(normalized / slice)] || segments[0];
}

function drawRoulette(ctx, cx, cy, r, segments, angle, stopping, landed = null) {
  const slice = (Math.PI * 2) / segments.length;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .35)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(3, 9, 18, .58)";
  ctx.beginPath();
  ctx.arc(cx, cy + 8, r + 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  segments.forEach((segment, index) => {
    const start = angle + index * slice;
    ctx.fillStyle = segment.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(7, 17, 31, .55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + slice / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#07111f";
    ctx.font = "900 14px monospace";
    rouletteLabelLines(segment.label).forEach((line, lineIndex, lines) => {
      ctx.fillText(line, r * 0.58, (lineIndex - (lines.length - 1) / 2) * 17);
    });
    ctx.restore();
  });

  ctx.strokeStyle = "#07111f";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#eafcff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f2b84b";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = "#07111f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 18px monospace";
  ctx.fillText("MG", cx, cy);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .45)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ff5c8a";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 18);
  ctx.lineTo(cx - 24, cy - r - 28);
  ctx.lineTo(cx + 24, cy - r - 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#ff5c8a";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 18);
  ctx.lineTo(cx - 24, cy - r - 28);
  ctx.lineTo(cx + 24, cy - r - 28);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = "rgba(7, 17, 31, .86)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cx - 210, cy + r + 20, 420, 36, 18);
  } else {
    ctx.rect(cx - 210, cy + r + 20, 420, 36);
  }
  ctx.fill();
  ctx.fillStyle = "#eafcff";
  ctx.textAlign = "center";
  ctx.font = "800 14px monospace";
  const hint = landed ? `RESULTADO: ${landed.label}` : (stopping ? "DETENIENDO..." : "TOCA PARA DETENER");
  ctx.fillText(hint.slice(0, 52), cx, cy + r + 43);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function rouletteLabelLines(value) {
  const text = String(value || "Beneficio").trim();
  if (text.length <= 12) return [text];
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= 12) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word.length > 12 ? `${word.slice(0, 11)}…` : word;
  });
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function startTouchCatch(runtime) {
  const { ctx, width, height } = runtime;
  let target = touchCatchTarget(width, height, 0, runtime.config);
  let trail = [];
  let dead = false;
  runtime.onPointerDown = (pos) => catchTouchTarget(pos);
  runtime.onPointerMove = (pos) => catchTouchTarget(pos);
  function catchTouchTarget(pos) {
    if (dead) return;
    const hit = Math.hypot(pos.x - target.x, pos.y - target.y) <= target.r + 14;
    if (hit) {
      runtime.addScore(runtime.points * target.scale);
      trail.push({ x: target.x, y: target.y, ttl: 0.35 });
      target = touchCatchTarget(width, height, runtime.score, runtime.config);
    }
  }
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "TOUCH ATRAPALO");
      drawTouchCatch(ctx, target, trail);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    target.age += dt;
    target.x += target.vx * dt;
    target.y += target.vy * dt;
    if (target.x < target.r || target.x > width - target.r) target.vx *= -1;
    if (target.y < 54 + target.r || target.y > height - target.r) target.vy *= -1;
    if (target.age > target.ttl) {
      runtime.damage(1);
      target = touchCatchTarget(width, height, runtime.score, runtime.config);
      if (runtime.lives <= 0) dead = true;
    }
    trail.forEach((item) => { item.ttl -= dt; });
    trail = trail.filter((item) => item.ttl > 0);
    drawRetroBackground(ctx, width, height, "TOUCH ATRAPALO");
    drawTouchCatch(ctx, target, trail);
  });
}

function touchCatchTarget(width, height, score, config = {}) {
  const baseSpeed = boundedGameNumber(config.target_speed, 150, 60, 360);
  const fast = Math.min(180, score * 0.6);
  return {
    x: 52 + Math.random() * (width - 104),
    y: 74 + Math.random() * (height - 130),
    r: 22,
    vx: (Math.random() > 0.5 ? 1 : -1) * (baseSpeed + Math.random() * 80 + fast),
    vy: (Math.random() > 0.5 ? 1 : -1) * (baseSpeed * 0.85 + Math.random() * 70 + fast),
    ttl: boundedGameNumber(config.target_ttl_ms, 1350, 650, 2200) / 1000,
    age: 0,
    scale: Math.random() < boundedGameNumber(config.bonus_target_rate, 22, 0, 45) / 100 ? 2 : 1,
  };
}

function drawTouchCatch(ctx, target, trail) {
  trail.forEach((item) => {
    ctx.fillStyle = `rgba(87, 210, 127, ${Math.max(0, item.ttl * 2)})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 18 + (0.35 - item.ttl) * 80, 0, Math.PI * 2);
    ctx.fill();
  });
  const pulse = 1 + Math.sin(Date.now() / 70) * 0.08;
  ctx.fillStyle = target.scale > 1 ? "#f2b84b" : "#7cfbff";
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#eafcff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#07111f";
  ctx.font = "900 13px monospace";
  ctx.fillText(target.scale > 1 ? "2x" : "+", target.x - 8, target.y + 5);
}

function startTrueFalse(runtime) {
  const { ctx, width, height } = runtime;
  const prompts = Array.isArray(runtime.config.prompts) && runtime.config.prompts.length >= 2 ? runtime.config.prompts : [
    { text: "Un QR redimido puede medirse contra ventas", answer: true },
    { text: "Mas intentos siempre significan mas revenue", answer: false },
    { text: "Un beneficio vencido debe validarse igual", answer: false },
    { text: "Capturar telefono ayuda a controlar duplicados", answer: true },
    { text: "La redencion fisica cierra el ciclo RMS", answer: true },
    { text: "Un cliente sin datos mide igual que un lead", answer: false },
  ];
  const promptTime = boundedGameNumber(runtime.config.prompt_time_ms, 3600, 1800, 7000) / 1000;
  let prompt = randomPrompt(prompts);
  let age = 0;
  let streak = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const selected = pos.x >= width / 2;
    answerTrueFalse(selected);
  };
  runtime.onControl = (key) => {
    if (key === "left") answerTrueFalse(false);
    if (key === "right" || key === "fire") answerTrueFalse(true);
  };
  function answerTrueFalse(value) {
    if (value === prompt.answer) {
      streak += 1;
      runtime.addScore(runtime.points + Math.min(streak, 5) * 5);
    } else {
      streak = 0;
      runtime.damage(1);
      if (runtime.lives <= 0) dead = true;
    }
    prompt = randomPrompt(prompts, prompt);
    age = 0;
  }
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "FALSO VERDADERO");
      drawTrueFalse(ctx, width, height, prompt, age, streak, promptTime);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    age += dt;
    if (age > promptTime) {
      streak = 0;
      runtime.damage(1);
      prompt = randomPrompt(prompts, prompt);
      age = 0;
      if (runtime.lives <= 0) dead = true;
    }
    drawRetroBackground(ctx, width, height, "FALSO VERDADERO");
    drawTrueFalse(ctx, width, height, prompt, age, streak, promptTime);
  });
}

function randomPrompt(prompts, current = null) {
  let next;
  do {
    next = prompts[Math.floor(Math.random() * prompts.length)];
  } while (prompts.length > 1 && next === current);
  return next;
}

function drawTrueFalse(ctx, width, height, prompt, age, streak, promptTime = 3.6) {
  ctx.fillStyle = "#eafcff";
  ctx.font = "900 21px monospace";
  wrapCanvasText(ctx, prompt.text, width / 2, 122, width - 90, 26, "center");
  ctx.fillStyle = "#ff5c8a";
  ctx.fillRect(70, 214, width / 2 - 95, 104);
  ctx.fillStyle = "#57d27f";
  ctx.fillRect(width / 2 + 25, 214, width / 2 - 95, 104);
  ctx.fillStyle = "#07111f";
  ctx.font = "900 26px monospace";
  ctx.fillText("FALSO", 145, 276);
  ctx.fillText("VERDADERO", width / 2 + 84, 276);
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 14px monospace";
  ctx.fillText(`RACHA ${streak}`, 18, 54);
  ctx.fillRect(70, 350, Math.max(0, 1 - age / promptTime) * (width - 140), 8);
}

function startOrderOptions(runtime) {
  const { ctx, width, height } = runtime;
  const sets = Array.isArray(runtime.config.sequences) && runtime.config.sequences.length
    ? runtime.config.sequences
    : [
    ["Entrada", "Plato fuerte", "Postre", "Cafe"],
    ["Escanear", "Jugar", "Recibir QR", "Redimir"],
    ["Prospecto", "Lead", "Cliente", "Referido"],
    ["Bajo", "Medio", "Alto", "Premium"],
  ];
  let sequence = createOrderSequence(sets);
  let step = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const item = sequence.items.find((entry) => pos.x >= entry.x && pos.x <= entry.x + entry.w && pos.y >= entry.y && pos.y <= entry.y + entry.h);
    if (!item || item.done) return;
    if (item.index === step) {
      item.done = true;
      step += 1;
      runtime.addScore(runtime.points);
      if (step >= sequence.items.length) {
        runtime.addScore(runtime.points * 2);
        sequence = createOrderSequence(sets);
        step = 0;
      }
    } else {
      runtime.damage(1);
      if (runtime.lives <= 0) dead = true;
    }
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "ORDEN CORRECTO");
      drawOrderSequence(ctx, sequence, step);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    drawRetroBackground(ctx, width, height, "ORDEN CORRECTO");
    drawOrderSequence(ctx, sequence, step);
  });
}

function createOrderSequence(sets) {
  const source = sets[Math.floor(Math.random() * sets.length)];
  const shuffled = shuffleArray(source.map((label, index) => ({ label, index })));
  const w = 190;
  const h = 58;
  return {
    labels: source,
    items: shuffled.map((item, pos) => ({
      ...item,
      x: 92 + (pos % 2) * 350,
      y: 118 + Math.floor(pos / 2) * 112,
      w,
      h,
      done: false,
    })),
  };
}

function drawOrderSequence(ctx, sequence, step) {
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 14px monospace";
  ctx.fillText(`SIGUIENTE: ${sequence.labels[step] || "COMPLETO"}`, 18, 54);
  sequence.items.forEach((item) => {
    ctx.fillStyle = item.done ? "#143f35" : "#182d45";
    ctx.fillRect(item.x, item.y, item.w, item.h);
    ctx.strokeStyle = item.index === step ? "#f2b84b" : "#7cfbff";
    ctx.lineWidth = 3;
    ctx.strokeRect(item.x, item.y, item.w, item.h);
    ctx.fillStyle = item.done ? "#57d27f" : "#eafcff";
    ctx.font = "900 17px monospace";
    ctx.fillText(item.label, item.x + 18, item.y + 36);
  });
}

function startConnectors(runtime) {
  const { ctx, width, height } = runtime;
  const pairs = Array.isArray(runtime.config.pairs) && runtime.config.pairs.length >= 2
    ? runtime.config.pairs.map((pair) => [pair.left, pair.right])
    : [
      ["QR", "Redencion"],
      ["Lead", "Contacto"],
      ["Ticket", "Beneficio"],
      ["Venta", "Revenue"],
    ];
  let board = createConnectorBoard(pairs, width);
  let selected = null;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const left = board.left.find((item) => pointInConnector(pos, item));
    const right = board.right.find((item) => pointInConnector(pos, item));
    if (left && !left.done) {
      selected = left;
      return;
    }
    if (!right || right.done || !selected) return;
    if (selected.key === right.key) {
      selected.done = true;
      right.done = true;
      board.links.push({ from: selected, to: right });
      selected = null;
      runtime.addScore(runtime.points);
      if (board.left.every((item) => item.done)) {
        runtime.addScore(runtime.points * 2);
        board = createConnectorBoard(pairs, width);
      }
    } else {
      selected = null;
      runtime.damage(1);
      if (runtime.lives <= 0) dead = true;
    }
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "CONECTORES");
      drawConnectorBoard(ctx, board, selected);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    drawRetroBackground(ctx, width, height, "CONECTORES");
    drawConnectorBoard(ctx, board, selected);
  });
}

function createConnectorBoard(pairs, width) {
  const rightOrder = shuffleArray(pairs.map((pair, index) => ({ key: index, label: pair[1] })));
  return {
    links: [],
    left: pairs.map((pair, index) => ({ key: index, label: pair[0], x: 80, y: 90 + index * 70, w: 190, h: 46, done: false })),
    right: rightOrder.map((item, index) => ({ ...item, x: width - 270, y: 90 + index * 70, w: 190, h: 46, done: false })),
  };
}

function pointInConnector(pos, item) {
  return pos.x >= item.x && pos.x <= item.x + item.w && pos.y >= item.y && pos.y <= item.y + item.h;
}

function drawConnectorBoard(ctx, board, selected) {
  board.links.forEach((link) => {
    ctx.strokeStyle = "#57d27f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(link.from.x + link.from.w, link.from.y + link.from.h / 2);
    ctx.lineTo(link.to.x, link.to.y + link.to.h / 2);
    ctx.stroke();
  });
  [...board.left, ...board.right].forEach((item) => {
    ctx.fillStyle = item.done ? "#143f35" : (item === selected ? "#f2b84b" : "#182d45");
    ctx.fillRect(item.x, item.y, item.w, item.h);
    ctx.strokeStyle = item === selected ? "#fff" : "#7cfbff";
    ctx.strokeRect(item.x, item.y, item.w, item.h);
    ctx.fillStyle = item === selected ? "#07111f" : "#eafcff";
    ctx.font = "900 16px monospace";
    ctx.fillText(item.label, item.x + 16, item.y + 29);
  });
}

function startBattleshipCoords(runtime) {
  const { ctx, width, height } = runtime;
  const board = createBattleshipBoard(currentActivation.game_config || {});
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead || board.completed) return;
    const cell = battleshipCellAt(pos, width, height, board.size);
    if (!cell) return;
    const key = battleshipCellKey(cell.x, cell.y);
    if (board.shots.has(key)) return;
    board.shots.add(key);
    const ship = board.cellToShip.get(key);
    if (ship) {
      ship.hits.add(key);
      runtime.addScore(runtime.points * 2);
      if (!ship.sunk && ship.hits.size >= ship.cells.length) {
        ship.sunk = true;
        runtime.addScore(runtime.points * ship.cells.length);
      }
      if (board.ships.every((item) => item.sunk)) {
        board.completed = true;
        runtime.setScore(Math.max(runtime.score + runtime.points * 3, runtime.minScoreForReward));
        drawRetroBackground(ctx, width, height, "BATALLA NAVAL");
        drawBattleshipBoard(ctx, width, height, board);
        window.setTimeout(() => runtime.finish(), 550);
      }
    } else {
      runtime.damage(1);
      if (runtime.lives <= 0) dead = true;
    }
  };
  runtime.loop((dt, elapsed) => {
    if (dead) {
      drawRetroBackground(ctx, width, height, "BATALLA NAVAL");
      drawBattleshipBoard(ctx, width, height, board);
      drawGameOver(ctx, width, height);
      if (shouldFinishAfterNoLives(runtime, elapsed)) runtime.finish();
      return;
    }
    drawRetroBackground(ctx, width, height, "BATALLA NAVAL");
    drawBattleshipBoard(ctx, width, height, board);
  });
}

function createBattleshipBoard(config = {}) {
  const normalized = normalizeBattleshipConfig(config);
  const ships = placeBattleshipFleet(normalized.size, normalized.shipLengths);
  const cellToShip = new Map();
  ships.forEach((ship) => {
    ship.cells.forEach((cell) => {
      cellToShip.set(battleshipCellKey(cell.x, cell.y), ship);
    });
  });
  return {
    size: normalized.size,
    ships,
    cellToShip,
    shots: new Set(),
    completed: false,
  };
}

function normalizeBattleshipConfig(config = {}) {
  const size = boundedGameInteger(config.grid_size, 6, 5, 8);
  const shipCount = boundedGameInteger(config.ship_count, 3, 1, 3);
  const defaults = [3, 2, 2];
  const rawLengths = Array.isArray(config.ship_lengths) ? config.ship_lengths : defaults;
  const shipLengths = rawLengths
    .slice(0, shipCount)
    .map((length, index) => boundedGameInteger(length, defaults[index] || 2, 1, Math.min(5, size - 1)));
  while (shipLengths.length < shipCount) {
    shipLengths.push(defaults[shipLengths.length] || 2);
  }
  return { size, shipLengths };
}

function boundedGameInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function boundedGameNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function placeBattleshipFleet(size, shipLengths) {
  const occupied = new Set();
  return shipLengths.map((length, index) => {
    let cells = null;
    for (let attempt = 0; attempt < 160 && !cells; attempt += 1) {
      const horizontal = Math.random() > 0.5;
      const maxX = horizontal ? size - length : size - 1;
      const maxY = horizontal ? size - 1 : size - length;
      const startX = Math.floor(Math.random() * (maxX + 1));
      const startY = Math.floor(Math.random() * (maxY + 1));
      const candidate = Array.from({ length }, (_, offset) => ({
        x: startX + (horizontal ? offset : 0),
        y: startY + (horizontal ? 0 : offset),
      }));
      if (candidate.every((cell) => !occupied.has(battleshipCellKey(cell.x, cell.y)))) {
        cells = candidate;
      }
    }
    if (!cells) {
      cells = fallbackBattleshipCells(size, length, occupied);
    }
    cells.forEach((cell) => occupied.add(battleshipCellKey(cell.x, cell.y)));
    return {
      id: index + 1,
      label: `Barco ${index + 1}`,
      length,
      cells,
      hits: new Set(),
      sunk: false,
    };
  });
}

function fallbackBattleshipCells(size, length, occupied) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x <= size - length; x += 1) {
      const candidate = Array.from({ length }, (_, offset) => ({ x: x + offset, y }));
      if (candidate.every((cell) => !occupied.has(battleshipCellKey(cell.x, cell.y)))) {
        return candidate;
      }
    }
  }
  return [{ x: 0, y: 0 }];
}

function battleshipCellKey(x, y) {
  return `${x},${y}`;
}

function battleshipLayout(width, height, size) {
  const cell = Math.max(34, Math.min(46, Math.floor((height - 132) / size)));
  const gridWidth = size * cell;
  return {
    cell,
    ox: 64,
    oy: Math.round((height - gridWidth) / 2) + 26,
    gridWidth,
  };
}

function battleshipCellAt(pos, width, height, size) {
  const { cell, ox, oy } = battleshipLayout(width, height, size);
  const x = Math.floor((pos.x - ox) / cell);
  const y = Math.floor((pos.y - oy) / cell);
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return { x, y };
}

function drawBattleshipBoard(ctx, width, height, board) {
  const { cell, ox, oy } = battleshipLayout(width, height, board.size);
  const sunkCount = board.ships.filter((ship) => ship.sunk).length;
  ctx.fillStyle = "#eafcff";
  ctx.font = "800 14px monospace";
  ctx.fillText(`Hunde la flota: ${sunkCount}/${board.ships.length} barcos`, 18, 54);
  ctx.font = "900 13px monospace";
  for (let index = 0; index < board.size; index += 1) {
    ctx.fillStyle = "#7cfbff";
    ctx.fillText(String.fromCharCode(65 + index), ox + index * cell + cell / 2 - 5, oy - 10);
    ctx.fillText(String(index + 1), ox - 26, oy + index * cell + cell / 2 + 5);
  }
  for (let y = 0; y < board.size; y += 1) {
    for (let x = 0; x < board.size; x += 1) {
      const key = battleshipCellKey(x, y);
      const shot = board.shots.has(key);
      const ship = board.cellToShip.get(key);
      const hit = shot && ship;
      const miss = shot && !ship;
      const revealShip = board.completed && ship;
      ctx.fillStyle = hit ? (ship.sunk ? "#f2b84b" : "#57d27f") : (miss ? "#ff5c8a" : (revealShip ? "#244b58" : "#12314d"));
      ctx.fillRect(ox + x * cell, oy + y * cell, cell - 3, cell - 3);
      ctx.strokeStyle = hit ? "#ffffff" : "#7cfbff";
      ctx.lineWidth = hit ? 3 : 1.5;
      ctx.strokeRect(ox + x * cell, oy + y * cell, cell - 3, cell - 3);
      ctx.fillStyle = "#eafcff";
      ctx.font = "900 12px monospace";
      const label = hit ? (ship.sunk ? `B${ship.id}` : "HIT") : (miss ? "X" : `${String.fromCharCode(65 + x)}${y + 1}`);
      ctx.fillText(label, ox + x * cell + 8, oy + y * cell + Math.round(cell * 0.6));
    }
  }
  drawBattleshipStatus(ctx, ox + board.size * cell + 42, oy, width, board);
}

function drawBattleshipStatus(ctx, x, y, width, board) {
  const panelWidth = Math.max(220, width - x - 36);
  ctx.fillStyle = "rgba(7, 17, 31, .78)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, panelWidth, 208, 18);
  } else {
    ctx.rect(x, y, panelWidth, 208);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(124, 251, 255, .45)";
  ctx.stroke();
  ctx.fillStyle = "#eafcff";
  ctx.font = "900 17px monospace";
  ctx.fillText("FLOTA", x + 18, y + 30);
  board.ships.forEach((ship, index) => {
    const rowY = y + 62 + index * 48;
    ctx.fillStyle = ship.sunk ? "#57d27f" : "#eafcff";
    ctx.font = "900 14px monospace";
    ctx.fillText(`${ship.label}: ${ship.hits.size}/${ship.length}`, x + 18, rowY);
    for (let dot = 0; dot < ship.length; dot += 1) {
      ctx.fillStyle = dot < ship.hits.size ? (ship.sunk ? "#f2b84b" : "#57d27f") : "#12314d";
      ctx.fillRect(x + 18 + dot * 22, rowY + 12, 16, 16);
      ctx.strokeStyle = "#7cfbff";
      ctx.strokeRect(x + 18 + dot * 22, rowY + 12, 16, 16);
    }
    ctx.fillStyle = ship.sunk ? "#f2b84b" : "#8eb2c7";
    ctx.font = "800 12px monospace";
    ctx.fillText(ship.sunk ? "HUNDIDO" : "BUSCANDO", x + panelWidth - 92, rowY);
  });
  ctx.fillStyle = board.completed ? "#57d27f" : "#8eb2c7";
  ctx.font = "800 12px monospace";
  ctx.fillText(board.completed ? "FLOTA HUNDIDA" : "Los barcos estan ocultos.", x + 18, y + 190);
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, align = "left") {
  const words = String(text || "").split(/\s+/);
  let line = "";
  ctx.textAlign = align;
  words.forEach((word, index) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
    if (index === words.length - 1 && line) ctx.fillText(line, x, y);
  });
  ctx.textAlign = "left";
}

function cleanupGameState() {
  if (!gameState) return;
  if (gameState.frame) cancelAnimationFrame(gameState.frame);
  gameState.timers?.forEach((timer) => window.clearTimeout(timer));
  gameState.cleanupFns?.forEach((cleanup) => cleanup());
  gameState = null;
}

function finishGame(score, durationMs) {
  cleanupGameState();
  const startButton = document.getElementById("startGameButton");
  if (startButton) startButton.textContent = "Validando score...";
  completeActivation({
    score,
    duration_ms: durationMs,
    participant_id: participant?.id,
    game_session_token: gameSessionToken,
  });
}

async function completeActivation(payload = {}) {
  const button = experienceBody.querySelector(".submit-button");
  if (button) {
    button.disabled = true;
    button.textContent = "Generando...";
  }
  try {
    const data = await api(`/api/public/activations/${encodeURIComponent(currentActivation.public_slug)}/complete`, {
      method: "POST",
      body: JSON.stringify({
        ...participantPayload(),
        ...payload,
        metadata: {
          source_url: window.location.href,
          user_agent: navigator.userAgent,
        },
      }),
    });
    experienceStage.classList.add("hidden");
    setStatus(data.message, data.rewarded ? "success" : "info");
    await renderResult(data);
  } catch (error) {
    setStatus(error.message, "error");
    if (button) {
      button.disabled = false;
      button.textContent = "Generar mi QR";
    }
  }
}

async function renderResult(data) {
  const rewardQrDataUrl = data.rewarded ? await ticketImageDataUrlForBrowser(data.qr_image_data_url) : "";
  const validatorUrl = data.validator_url || "";
  const fulfillment = benefitFulfillmentFromResult(data);
  const isEcommerceReward = fulfillment.mode === "ECOMMERCE_CODE";
  ticketResult.dataset.tone = data.rewarded ? "success" : "error";
  ticketResult.innerHTML = data.rewarded && isEcommerceReward ? `
    <div class="result-copy">
      <span>Beneficio desbloqueado</span>
      <strong>${escapeHtml(data.reward?.reward_label || "Código ecommerce")}</strong>
      <p>${escapeHtml(fulfillment.instructions)}</p>
    </div>
    <div class="ecommerce-reward-card">
      <span>Código para usar en la tienda online</span>
      <strong>${escapeHtml(fulfillment.ecommerce_code || data.reward?.public_code || "CODIGO")}</strong>
      ${fulfillment.ecommerce_url ? `<a class="submit-button" href="${escapeHtml(fulfillment.ecommerce_url)}" target="_blank" rel="noreferrer">Ir a la tienda</a>` : ""}
    </div>
    <div class="ticket-actions">
      <button class="submit-button" type="button" id="copyEcommerceCodeButton">Copiar código</button>
      ${validatorUrl ? `<a class="submit-button secondary" href="${escapeHtml(validatorUrl)}" target="_blank" rel="noreferrer">Ver respaldo QR</a>` : ""}
    </div>
  ` : data.rewarded ? `
    <div class="result-copy">
      <span>Beneficio generado</span>
      <strong>${escapeHtml(data.reward?.reward_label || "QR unico")}</strong>
      <p>Guarda o comparte este QR. Tambien puedes abrir el ticket si la imagen no carga en tu navegador.</p>
    </div>
    <img src="${escapeHtml(rewardQrDataUrl)}" alt="Beneficio QR" id="rewardQrImage">
    <div class="ticket-actions">
      ${validatorUrl ? `<a class="submit-button" href="${escapeHtml(validatorUrl)}" target="_blank" rel="noreferrer">Abrir ticket</a>` : ""}
      <button class="submit-button" type="button" id="downloadRewardQrButton">Descargar QR</button>
      <button class="submit-button secondary" type="button" id="shareRewardQrButton">Compartir QR</button>
    </div>
  ` : `
    <div class="result-copy">
      <span>Participacion registrada</span>
      <strong>${escapeHtml(data.participant?.score ?? "")}</strong>
      <p>${escapeHtml(data.message || "No se genero beneficio para esta participacion.")}</p>
    </div>
  `;
  ticketResult.classList.remove("hidden");
  if (data.rewarded && isEcommerceReward) {
    document.getElementById("copyEcommerceCodeButton")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard?.writeText(fulfillment.ecommerce_code || data.reward?.public_code || "");
      } catch (error) {
        console.warn("No fue posible copiar el codigo ecommerce", error);
      }
      setStatus("Código copiado. Úsalo en el checkout de la tienda online.", "success");
    });
  } else if (data.rewarded) {
    const filename = rewardQrFilename();
    document.getElementById("downloadRewardQrButton")?.addEventListener("click", () => {
      downloadDataUrl(filename, rewardQrDataUrl);
    });
    document.getElementById("shareRewardQrButton")?.addEventListener("click", () => {
      shareRewardQr({ ...data, qr_image_data_url: rewardQrDataUrl }).catch(() => downloadDataUrl(filename, rewardQrDataUrl));
    });
  }
  setProgress(2, 2);
  ticketResult.scrollIntoView({ behavior: "smooth", block: "center" });
}

function rewardQrFilename() {
  return "beneficio-marketgames-qr.png";
}

function loadImageDataUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen del ticket."));
    image.src = src;
  });
}

async function convertSvgDataUrlToPngDataUrl(dataUrl) {
  const image = await loadImageDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width || 1080;
  canvas.height = image.naturalHeight || image.height || 1350;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png", 0.96);
}

async function ticketImageDataUrlForBrowser(dataUrl) {
  const value = String(dataUrl || "");
  if (!value.startsWith("data:image/svg+xml")) {
    return value;
  }
  try {
    return await convertSvgDataUrlToPngDataUrl(value);
  } catch (error) {
    console.warn("No se pudo convertir el ticket a PNG.", error);
    return value;
  }
}

async function downloadDataUrl(filename, dataUrl) {
  let finalDataUrl = dataUrl || "";
  if (String(finalDataUrl).startsWith("data:image/svg+xml")) {
    finalDataUrl = await convertSvgDataUrlToPngDataUrl(finalDataUrl);
  }
  const link = document.createElement("a");
  link.href = finalDataUrl;
  link.download = rewardQrFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function dataUrlToFile(dataUrl, filename) {
  const [header, body] = String(dataUrl || "").split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(body || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], filename, { type: mime });
}

async function shareRewardQr(data) {
  const title = data.reward?.reward_label || "Beneficio MarketGames QR";
  const text = `${title}. Presenta este QR en el punto fisico para redimir tu beneficio.`;
  const qrImageDataUrl = String(data.qr_image_data_url || "").startsWith("data:image/svg+xml")
    ? await convertSvgDataUrlToPngDataUrl(data.qr_image_data_url)
    : data.qr_image_data_url;
  const file = dataUrlToFile(qrImageDataUrl, rewardQrFilename());
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }
  throw new Error("Compartir no disponible.");
}

participantForm.addEventListener("submit", handleParticipantSubmit);
loadActivation();
