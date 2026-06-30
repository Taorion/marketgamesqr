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
    throw new Error(data.error?.message || "No se pudo completar la solicitud.");
  }
  return data;
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
  activationDescription.textContent = activation.description || "Deja tus datos y completa la experiencia para desbloquear tu QR.";
  document.title = `${activation.title} | Activacion MarketGames`;
  card.classList.toggle("is-premium", isPremium(activation));
  syncCaptureRequirements(activation);
  if (!activation.active) {
    participantForm.classList.add("hidden");
    setStatus("Esta activacion no esta activa en este momento.", "error");
    return;
  }
  setStatus("Primero registra tus datos. Luego completa la experiencia para obtener tu beneficio.", "success");
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
  experienceCopy.textContent = currentActivation.activation_type === "OPEN_QUESTION"
    ? "No hay respuesta correcta. Escribe tu opinion o necesidad y el sistema generara el QR configurado."
    : currentActivation.category === "premium"
    ? "Esta experiencia esta disenada como atencion personalizada. Al completar se generara el pase configurado."
    : "Al completar, el sistema validara el beneficio y generara el QR unico.";
  if (currentActivation.reward_mode === "by_position" || currentActivation.activation_type === "DISCOUNT_THERMOMETER") {
    renderThermometer();
    return;
  }
  if (["SPIN_DISCOVER", "TAP_REVEAL", "CHOOSE_DOOR", "BENEFIT_SELECTOR", "QUICK_VOTE", "VIP_EXPERIENCE_SELECTOR", "STYLE_PROFILE", "SCRATCH_WIN"].includes(currentActivation.activation_type)) {
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
  experienceStage.classList.remove("hidden");
  experienceTitle.textContent = currentActivation.activation_label || "Minijuego con score";
  experienceCopy.textContent = minigameInstruction(currentActivation.activation_type, config);
  experienceBody.innerHTML = `
    <article class="game-panel retro-game-panel">
      <div class="game-hud">
        <span id="scoreValue">Score: 0</span>
        <span id="timeValue">Tiempo: ${escapeHtml(config.duration_seconds || 30)}</span>
        <span id="livesValue">Vidas: ${escapeHtml(config.lives || 3)}</span>
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
      <button class="submit-button" type="button" id="startGameButton">Iniciar partida</button>
      <small class="game-help">Touch directo en pantalla. En celular tambien puedes usar los controles inferiores.</small>
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
  }[gameType] || startFastTap)(gameState);
}

function createGameRuntime(canvas, config = {}) {
  const ctx = canvas.getContext("2d");
  const runtime = {
    canvas,
    ctx,
    width: canvas.width,
    height: canvas.height,
    duration: Math.max(10, Number(config.duration_seconds || 30)),
    points: Math.max(1, Number(config.points_per_target || 50)),
    penalty: Math.max(0, Number(config.penalty || 10)),
    maxScore: Math.max(100, Number(config.max_score || 10000)),
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

    if (runtime.keys.left) player.x -= 260 * dt;
    if (runtime.keys.right) player.x += 260 * dt;
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
        vy: 62 + Math.random() * 72,
        wobble: Math.random() * Math.PI * 2,
        shot: 0.5 + Math.random() * 1.4,
      });
      spawn = 0.48;
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
  const paddle = { x: width / 2 - 54, y: height - 36, w: 108, h: 14 };
  const ball = { x: width / 2, y: height - 64, r: 8, vx: 190, vy: -230 };
  let bricks = buildBricks(width);
  let serving = 0.8;
  let dead = false;
  function resetBall() {
    ball.x = width / 2;
    ball.y = height - 64;
    ball.vx = 170 * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = -230;
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
      ball.vx = 260 * hit;
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
    if (!bricks.length) bricks = buildBricks(width);
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

function buildBricks(width) {
  const bricks = [];
  const cols = 9;
  const gap = 8;
  const w = (width - 40 - gap * (cols - 1)) / cols;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      bricks.push({ x: 20 + col * (w + gap), y: 58 + row * 28, w, h: 18 });
    }
  }
  return bricks;
}

function startSnake(runtime) {
  const { ctx, width, height } = runtime;
  const cols = 24;
  const rows = 13;
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
    if (moveClock >= 0.13) {
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
  const startingLives = runtime.lives;
  const basket = { x: width / 2 - 48, y: height - 44, w: 96, h: 18 };
  const drops = [];
  const effects = [];
  const laneCount = 7;
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
      spawnCatchBurst(drops, lanes, width, effectiveElapsed);
      burstClock = 5.5 + Math.random() * 2.8;
    }
    if (spawn <= 0) {
      drops.push(createCatchDrop(lanes, width, effectiveElapsed));
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

function createCatchDrop(lanes, width, elapsed = 0) {
  const type = weightedCatchDropType(elapsed);
  const lane = lanes[Math.floor(Math.random() * lanes.length)] || (24 + Math.random() * (width - 48));
  const offset = (Math.random() - 0.5) * 18;
  const speedBoost = Math.min(170, elapsed * 5.5);
  const base = {
    x: Math.max(24, Math.min(width - 24, lane + offset)),
    y: 42,
    r: 12,
    vy: 118 + speedBoost + Math.random() * 120,
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

function weightedCatchDropType(elapsed = 0) {
  const pressure = Math.min(0.16, elapsed * 0.004);
  const roll = Math.random();
  if (roll < 0.06) return "clock";
  if (roll < 0.11) return "shield";
  if (roll < 0.16) return "magnet";
  if (roll < 0.22) return "gem";
  if (roll < 0.27) return "jackpot";
  if (roll < 0.41 + pressure) return "rotten";
  if (roll < 0.50 + pressure) return "bomb";
  return "coin";
}

function spawnCatchBurst(drops, lanes, width, elapsed) {
  const used = shuffleArray([...lanes]).slice(0, 3 + Math.floor(Math.random() * 2));
  used.forEach((lane, index) => {
    const drop = createCatchDrop([lane], width, elapsed + index * 3);
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
  const cols = 4;
  const rows = 3;
  const cardW = 112;
  const cardH = 78;
  const gap = 14;
  const ox = (width - cols * cardW - (cols - 1) * gap) / 2;
  const oy = 66;
  const symbols = shuffleArray(["A", "B", "C", "D", "E", "F", "A", "B", "C", "D", "E", "F"])
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
        lockUntil = Date.now() + 650;
        const pair = selected;
        selected = [];
        const timer = window.setTimeout(() => {
          pair.forEach((item) => { item.open = false; });
        }, 620);
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
  let target = fastTapTarget(width, height);
  let age = 0;
  let dead = false;
  runtime.onPointerDown = (pos) => {
    if (dead) return;
    const hit = Math.hypot(pos.x - target.x, pos.y - target.y) <= target.r + 10;
    if (hit) {
      runtime.addScore(runtime.points);
      target = fastTapTarget(width, height);
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
      target = fastTapTarget(width, height);
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

function fastTapTarget(width, height) {
  return {
    x: 48 + Math.random() * (width - 96),
    y: 70 + Math.random() * (height - 120),
    r: 18 + Math.random() * 14,
    ttl: 0.75 + Math.random() * 0.55,
  };
}

function startMiniMaze(runtime) {
  const { ctx, width, height } = runtime;
  const start = { x: 48, y: height - 48 };
  const goal = { x: width - 52, y: 58, r: 22 };
  const player = { ...start, r: 12 };
  const walls = [
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
      x: player.x + (dx / distance) * Math.min(distance, 180 * dt),
      y: player.y + (dy / distance) * Math.min(distance, 180 * dt),
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
      runtime.addScore(runtime.points * 3);
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
    renderResult(data);
  } catch (error) {
    setStatus(error.message, "error");
    if (button) {
      button.disabled = false;
      button.textContent = "Generar mi QR";
    }
  }
}

function renderResult(data) {
  ticketResult.dataset.tone = data.rewarded ? "success" : "error";
  ticketResult.innerHTML = data.rewarded ? `
    <div class="result-copy">
      <span>Beneficio generado</span>
      <strong>${escapeHtml(data.reward?.reward_label || "QR unico")}</strong>
      <p>Guarda o comparte este QR. Es el codigo que debes presentar en el punto fisico para redimir tu beneficio.</p>
    </div>
    <img src="${escapeHtml(data.qr_image_data_url)}" alt="Beneficio QR" id="rewardQrImage">
    <div class="ticket-actions">
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
  if (data.rewarded) {
    document.getElementById("downloadRewardQrButton")?.addEventListener("click", () => {
      downloadDataUrl("beneficio-marketgames-qr.png", data.qr_image_data_url);
    });
    document.getElementById("shareRewardQrButton")?.addEventListener("click", () => {
      shareRewardQr(data).catch(() => downloadDataUrl("beneficio-marketgames-qr.png", data.qr_image_data_url));
    });
  }
  setProgress(2, 2);
  ticketResult.scrollIntoView({ behavior: "smooth", block: "center" });
}

function downloadDataUrl(filename, dataUrl) {
  const link = document.createElement("a");
  link.href = dataUrl || "";
  link.download = filename;
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
  const file = dataUrlToFile(data.qr_image_data_url, "beneficio-marketgames-qr.png");
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
