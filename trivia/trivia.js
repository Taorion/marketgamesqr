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

let currentTrivia = null;

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
  progressLabel.textContent = `${safeAnswered} de ${safeTotal} respondidas`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

function updateAnswerState() {
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
}

function renderTrivia(trivia) {
  currentTrivia = trivia;
  businessName.textContent = trivia.business?.name || "MarketGames RMS";
  triviaTitle.textContent = trivia.title;
  triviaDescription.textContent = trivia.description || "Responde correctamente para recibir tu ticket QR.";
  document.title = `${trivia.title} | Trivia`;

  if (!trivia.active) {
    setStatus("Esta trivia no esta activa en este momento.", "error");
    triviaForm.classList.add("hidden");
    return;
  }

  questionList.innerHTML = trivia.questions.map((question, index) => `
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

  questionList.querySelectorAll("input[type='radio']").forEach((input) => {
    input.addEventListener("change", updateAnswerState);
  });
  setProgress(0, trivia.questions.length);
  setStatus("Completa tus datos y responde la trivia.", "success");
  triviaForm.classList.remove("hidden");
}

async function loadTrivia() {
  try {
    const slug = slugFromPath();
    if (!slug) {
      throw new Error("Link de trivia incompleto.");
    }
    const data = await api(`/api/public/trivias/${encodeURIComponent(slug)}`);
    renderTrivia(data.trivia);
  } catch (error) {
    triviaTitle.textContent = "Trivia no disponible";
    triviaDescription.textContent = "Revisa el link o solicita uno nuevo al negocio.";
    setStatus(error.message, "error");
  }
}

function collectAnswers() {
  const answers = {};
  (currentTrivia?.questions || []).forEach((question) => {
    const selected = triviaForm.querySelector(`input[name="${question.id}"]:checked`);
    if (selected) {
      answers[question.id] = selected.value;
    }
  });
  return answers;
}

function firstMissingQuestion() {
  return (currentTrivia?.questions || []).find((question) => (
    !triviaForm.querySelector(`input[name="${question.id}"]:checked`)
  ));
}

function renderAttemptResult({ message, attempt, qrImageDataUrl, validatorUrl }) {
  const passed = Boolean(attempt?.passed);
  ticketResult.dataset.tone = passed ? "success" : "error";
  ticketResult.innerHTML = passed ? `
    <div class="result-copy">
      <span>Ticket generado</span>
      <strong>Puntaje: ${escapeHtml(attempt.score)}/${escapeHtml(attempt.total_questions)}</strong>
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
    setStatus("Responde todas las preguntas antes de enviar.", "error");
    Array.from(questionList.querySelectorAll("[data-question-card]"))
      .find((card) => card.dataset.questionCard === missing.id)
      ?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return;
  }
  const button = triviaForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Revisando...";
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
          user_agent: navigator.userAgent,
          source_url: window.location.href,
        },
      }),
    });

    if (!data.attempt?.passed) {
      setStatus("Intento registrado. No se genero ticket porque no respondiste todo correctamente.", "error");
      triviaForm.classList.add("hidden");
      renderAttemptResult({
        message: data.message,
        attempt: data.attempt,
      });
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
    button.textContent = "Enviar respuestas";
  }
}

triviaForm.addEventListener("submit", submitTrivia);
loadTrivia();
