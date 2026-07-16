const statusPanel = document.getElementById("statusPanel");
const triviaForm = document.getElementById("triviaForm");
const questionList = document.getElementById("questionList");
const ticketResult = document.getElementById("ticketResult");
const businessName = document.getElementById("businessName");
const triviaTitle = document.getElementById("triviaTitle");
const triviaDescription = document.getElementById("triviaDescription");
const participantName = document.getElementById("participantName");
const participantPhone = document.getElementById("participantPhone");
const participantEmail = document.getElementById("participantEmail");
const participantDocument = document.getElementById("participantDocument");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");
const activationStepTitle = document.getElementById("activationStepTitle");
const activationStepCopy = document.getElementById("activationStepCopy");

let currentTrivia = null;
let selectedReveal = null;
let selectedThermometer = null;
let thermometerTimer = null;
let thermometerPosition = 0;
let thermometerDirection = 1;

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

function activationType() {
  return currentTrivia?.activation_type || "TRIVIA";
}

function activationLabel(type) {
  return {
    TRIVIA: "Responde la trivia",
    OPEN_QUESTION: "Responde y desbloquea",
    SURVEY: "Completa la encuesta",
    SPIN_DISCOVER: "Elige y descubre",
    THERMOMETER: "Deten el termometro",
  }[type] || "Completa la dinamica";
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
    throw new Error(data.error?.message || data.message || "No se pudo completar la solicitud.");
  }
  return data;
}

function setStatus(message, tone = "info") {
  statusPanel.textContent = message;
  statusPanel.dataset.tone = tone;
  statusPanel.classList.remove("hidden");
}

function setProgress(answered = 0, total = 0) {
  const safeTotal = Math.max(0, total);
  const safeAnswered = Math.min(Math.max(0, answered), safeTotal);
  const percent = safeTotal ? Math.round((safeAnswered / safeTotal) * 100) : 0;
  progressLabel.textContent = `${safeAnswered} de ${safeTotal} pasos completados`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

function config() {
  return currentTrivia?.activation_config || {};
}

function renderTriviaQuestions() {
  questionList.innerHTML = currentTrivia.questions.map((question, index) => `
    <article class="question-card" data-question-card="${escapeHtml(question.id)}">
      <div class="question-title">
        <span>${index + 1}</span>
        <strong>${escapeHtml(question.question)}</strong>
      </div>
      <div class="answer-grid">
        ${["A", "B", "C", "D"].map((key) => `
          <label class="answer-option">
            <input type="radio" name="${escapeHtml(question.id)}" value="${key}" required>
            <span class="answer-key">${key}</span>
            <span>${escapeHtml(question.options?.[key] || "")}</span>
          </label>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderOpenQuestion() {
  const open = config().open_question || {};
  questionList.innerHTML = `
    <article class="question-card">
      <div class="question-title">
        <span>1</span>
        <strong>${escapeHtml(open.question || "Cuentanos tu respuesta para desbloquear el beneficio.")}</strong>
      </div>
      <textarea class="open-answer-input" id="openAnswerInput" rows="4" required placeholder="${escapeHtml(open.placeholder || "Escribe tu respuesta")}"></textarea>
    </article>
  `;
}

function renderSurvey() {
  const questions = config().survey_questions || [];
  questionList.innerHTML = questions.map((question, index) => `
    <article class="question-card" data-survey-card="${escapeHtml(question.id)}">
      <div class="question-title">
        <span>${index + 1}</span>
        <strong>${escapeHtml(question.question)}</strong>
      </div>
      ${renderSurveyControl(question)}
    </article>
  `).join("");
}

function renderSurveyControl(question) {
  if (question.type === "SHORT_TEXT") {
    return `<input data-survey-answer="${escapeHtml(question.id)}" type="text" required placeholder="Escribe tu respuesta">`;
  }
  if (question.type === "SCALE") {
    return `<div class="scale-grid">${[1, 2, 3, 4, 5].map((value) => `
      <label class="answer-option"><input type="radio" name="${escapeHtml(question.id)}" value="${value}" required><span class="answer-key">${value}</span></label>
    `).join("")}</div>`;
  }
  const inputType = question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio";
  return `<div class="answer-grid">${(question.options || []).map((option, index) => `
    <label class="answer-option">
      <input type="${inputType}" name="${escapeHtml(question.id)}" value="${escapeHtml(option)}" ${inputType === "radio" ? "required" : ""}>
      <span class="answer-key">${String.fromCharCode(65 + index)}</span>
      <span>${escapeHtml(option)}</span>
    </label>
  `).join("")}</div>`;
}

function renderRevealCards() {
  const cards = (config().reveal_cards || config().spin_rewards || []).slice(0, 8);
  questionList.innerHTML = `
    <article class="question-card">
      <div class="question-title">
        <span>?</span>
        <strong>Elige una card y descubre tu beneficio de esta semana.</strong>
      </div>
      <div class="reveal-play-grid">
        ${cards.map((card, index) => `
          <button class="reveal-card" type="button" data-reveal-index="${index}">
            <span>${escapeHtml(card.label || `Card ${index + 1}`)}</span>
            <strong>?</strong>
          </button>
        `).join("")}
      </div>
    </article>
  `;
  questionList.querySelectorAll("[data-reveal-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = cards[Number(button.dataset.revealIndex || 0)];
      selectedReveal = card;
      questionList.querySelectorAll(".reveal-card").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      button.innerHTML = `<span>${escapeHtml(card.label || "Beneficio")}</span><strong>${escapeHtml(card.benefit_label)}</strong>`;
      setProgress(1, 1);
    });
  });
}

function renderThermometer() {
  const discounts = config().thermometer_discounts || [5, 10, 25, 40, 25, 10, 5];
  questionList.innerHTML = `
    <article class="question-card">
      <div class="question-title">
        <span>%</span>
        <strong>Deten el indicador lo mas cerca posible del mejor descuento.</strong>
      </div>
      <div class="thermometer-game" id="thermometerGame">
        <div class="thermometer-track">
          <span class="thermometer-pointer" id="thermometerPointer"></span>
          ${discounts.map((discount) => `<i>${escapeHtml(discount)}%</i>`).join("")}
        </div>
        <button class="submit-button" type="button" id="stopThermometerButton">Detener</button>
        <p id="thermometerResult">El mayor descuento esta en el centro, no al final.</p>
      </div>
    </article>
  `;
  startThermometer(discounts);
}

function startThermometer(discounts) {
  window.clearInterval(thermometerTimer);
  thermometerPosition = 0;
  thermometerDirection = 1;
  const pointer = document.getElementById("thermometerPointer");
  const result = document.getElementById("thermometerResult");
  thermometerTimer = window.setInterval(() => {
    thermometerPosition += thermometerDirection * 2.6;
    if (thermometerPosition >= 100 || thermometerPosition <= 0) {
      thermometerDirection *= -1;
      thermometerPosition = Math.max(0, Math.min(100, thermometerPosition));
    }
    if (pointer) pointer.style.left = `${thermometerPosition}%`;
  }, 26);
  document.getElementById("stopThermometerButton")?.addEventListener("click", () => {
    window.clearInterval(thermometerTimer);
    const index = Math.round((thermometerPosition / 100) * (discounts.length - 1));
    const discount = discounts[Math.max(0, Math.min(discounts.length - 1, index))];
    selectedThermometer = {
      selected_discount: discount,
      benefit_label: `${discount}% de descuento`,
      benefit_type: "PERCENT_DISCOUNT",
      benefit_value: { percent: discount },
    };
    if (result) result.textContent = `Ganaste ${discount}% de descuento. Envia tus datos para generar el QR.`;
    setProgress(1, 1);
  });
}

function renderActivation(trivia) {
  currentTrivia = trivia;
  selectedReveal = null;
  selectedThermometer = null;
  businessName.textContent = trivia.business?.name || "Sales Machine RMS";
  triviaTitle.textContent = trivia.title;
  triviaDescription.textContent = trivia.description || "Deja tus datos, completa la dinamica y recibe tu ticket QR.";
  document.title = `${trivia.title} | Activacion`;

  if (!trivia.active) {
    setStatus("Esta activacion no esta activa en este momento.", "error");
    triviaForm.classList.add("hidden");
    return;
  }

  const type = activationType();
  if (type === "TRIVIA") renderTriviaQuestions();
  if (type === "OPEN_QUESTION") renderOpenQuestion();
  if (type === "SURVEY") renderSurvey();
  if (type === "SPIN_DISCOVER") renderRevealCards();
  if (type === "THERMOMETER") renderThermometer();

  questionList.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("change", updateAnswerState);
    input.addEventListener("input", updateAnswerState);
  });
  setProgress(0, type === "TRIVIA" ? trivia.questions.length : Math.max(1, (config().survey_questions || []).length));
  activationStepTitle.textContent = activationLabel(type);
  activationStepCopy.textContent = type === "TRIVIA"
    ? "Debes responder todas las preguntas antes de enviar."
    : "Completa la dinamica para desbloquear el ticket QR.";
  setStatus("Primero completa tus datos. Luego juega para desbloquear tu ticket.", "success");
  triviaForm.classList.remove("hidden");
}

async function loadTrivia() {
  try {
    const slug = slugFromPath();
    if (!slug) {
      throw new Error("Link de activacion incompleto.");
    }
    const data = await api(`/api/public/trivias/${encodeURIComponent(slug)}`);
    renderActivation(data.trivia);
  } catch (error) {
    triviaTitle.textContent = "Activacion no disponible";
    triviaDescription.textContent = "Revisa el link o solicita uno nuevo al negocio.";
    setStatus(error.message, "error");
  }
}

function collectAnswers() {
  const type = activationType();
  if (type === "TRIVIA") {
    const answers = {};
    (currentTrivia?.questions || []).forEach((question) => {
      const selected = triviaForm.querySelector(`input[name="${question.id}"]:checked`);
      if (selected) answers[question.id] = selected.value;
    });
    return answers;
  }
  if (type === "OPEN_QUESTION") {
    return { open_question: document.getElementById("openAnswerInput")?.value.trim() || "" };
  }
  if (type === "SURVEY") {
    const answers = {};
    (config().survey_questions || []).forEach((question) => {
      const checked = Array.from(triviaForm.querySelectorAll(`input[name="${question.id}"]:checked`)).map((item) => item.value);
      const text = triviaForm.querySelector(`[data-survey-answer="${question.id}"]`)?.value.trim();
      answers[question.id] = question.type === "MULTIPLE_CHOICE" ? checked : (text || checked[0] || "");
    });
    return answers;
  }
  if (type === "SPIN_DISCOVER") return { selected_card: selectedReveal };
  if (type === "THERMOMETER") return { thermometer: selectedThermometer };
  return {};
}

function updateAnswerState() {
  const type = activationType();
  if (type === "TRIVIA") {
    const answers = collectAnswers();
    const total = currentTrivia?.questions?.length || 0;
    setProgress(Object.keys(answers).length, total);
    questionList.querySelectorAll(".question-card").forEach((card) => {
      const selected = card.querySelector("input[type='radio']:checked");
      card.classList.toggle("is-complete", Boolean(selected));
      card.querySelectorAll(".answer-option").forEach((option) => {
        option.classList.toggle("is-selected", Boolean(option.querySelector("input:checked")));
      });
    });
    return;
  }
  if (type === "SURVEY") {
    const answers = collectAnswers();
    const total = (config().survey_questions || []).length || 1;
    const answered = Object.values(answers).filter((value) => Array.isArray(value) ? value.length : Boolean(value)).length;
    setProgress(answered, total);
    questionList.querySelectorAll(".question-card").forEach((card) => {
      const hasInput = Boolean(card.querySelector("input:checked, input[type='text']"));
      const textInput = card.querySelector("input[type='text']");
      card.classList.toggle("is-complete", Boolean(card.querySelector("input:checked")) || Boolean(textInput?.value.trim()));
      card.querySelectorAll(".answer-option").forEach((option) => {
        option.classList.toggle("is-selected", Boolean(option.querySelector("input:checked")));
      });
      if (!hasInput) card.classList.remove("is-complete");
    });
    return;
  }
  if (type === "OPEN_QUESTION") {
    const answered = Boolean(document.getElementById("openAnswerInput")?.value.trim());
    setProgress(answered ? 1 : 0, 1);
    questionList.querySelector(".question-card")?.classList.toggle("is-complete", answered);
  }
}

function firstMissingQuestion() {
  const type = activationType();
  if (type === "TRIVIA") {
    return (currentTrivia?.questions || []).find((question) => !triviaForm.querySelector(`input[name="${question.id}"]:checked`));
  }
  if (type === "OPEN_QUESTION" && !document.getElementById("openAnswerInput")?.value.trim()) return { id: "open" };
  if (type === "SPIN_DISCOVER" && !selectedReveal) return { id: "reveal" };
  if (type === "THERMOMETER" && !selectedThermometer) return { id: "thermometer" };
  if (type === "SURVEY") {
    const answers = collectAnswers();
    return (config().survey_questions || []).find((question) => {
      const value = answers[question.id];
      return question.required !== false && !(Array.isArray(value) ? value.length : Boolean(value));
    });
  }
  return null;
}

function selectedBenefitMetadata() {
  if (activationType() === "SPIN_DISCOVER" && selectedReveal) return selectedReveal;
  if (activationType() === "THERMOMETER" && selectedThermometer) return selectedThermometer;
  return null;
}

function renderAttemptResult({ message, attempt, qrImageDataUrl, validatorUrl }) {
  const passed = Boolean(attempt?.passed);
  ticketResult.dataset.tone = passed ? "success" : "error";
  ticketResult.innerHTML = passed ? `
    <div class="result-copy">
      <span>Ticket generado</span>
      <strong>${activationType() === "TRIVIA" ? `Puntaje: ${escapeHtml(attempt.score)}/${escapeHtml(attempt.total_questions)}` : "Beneficio desbloqueado"}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
    <img src="${escapeHtml(qrImageDataUrl)}" alt="Ticket QR">
    <a href="${escapeHtml(validatorUrl)}" target="_blank" rel="noopener">Abrir ticket</a>
  ` : `
    <div class="result-copy">
      <span>Intento registrado</span>
      <strong>Puntaje: ${escapeHtml(attempt?.score || 0)}/${escapeHtml(attempt?.total_questions || 0)}</strong>
      <p>${escapeHtml(message || "Gracias por participar. Esta vez no se genero ticket.")}</p>
    </div>
  `;
  ticketResult.classList.remove("hidden");
  ticketResult.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function submitTrivia(event) {
  event.preventDefault();
  if (!currentTrivia) return;
  const missing = firstMissingQuestion();
  if (missing) {
    setStatus("Completa la dinamica antes de generar tu ticket.", "error");
    questionList.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const button = triviaForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Generando...";
  ticketResult.classList.add("hidden");
  try {
    const data = await api(`/api/public/trivias/${encodeURIComponent(currentTrivia.public_slug)}/attempts`, {
      method: "POST",
      body: JSON.stringify({
        name: participantName.value.trim(),
        phone: participantPhone.value.trim(),
        email: participantEmail.value.trim() || null,
        document_id: participantDocument.value.trim() || null,
        answers: collectAnswers(),
        metadata: {
          activation_type: activationType(),
          selected_benefit: selectedBenefitMetadata(),
          user_agent: navigator.userAgent,
          source_url: window.location.href,
        },
      }),
    });

    if (!data.attempt?.passed) {
      setStatus("Intento registrado. No se genero ticket porque no respondiste todo correctamente.", "error");
      triviaForm.classList.add("hidden");
      renderAttemptResult({ message: data.message, attempt: data.attempt });
      return;
    }

    setStatus(data.message, "success");
    triviaForm.classList.add("hidden");
    renderAttemptResult({
      message: data.message,
      attempt: data.attempt,
      qrImageDataUrl: data.qr_image_data_url,
      validatorUrl: data.validator_url,
    });
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Generar mi ticket QR";
  }
}

triviaForm.addEventListener("submit", submitTrivia);
loadTrivia();
