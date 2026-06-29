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
    <article class="question-card">
      <strong>${index + 1}. ${escapeHtml(question.question)}</strong>
      <div class="answer-grid">
        ${["A", "B", "C", "D"].map((key) => `
          <label class="answer-option">
            <input type="radio" name="${escapeHtml(question.id)}" value="${key}" required>
            <span>${key}. ${escapeHtml(question.options?.[key] || "")}</span>
          </label>
        `).join("")}
      </div>
    </article>
  `).join("");

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

async function submitTrivia(event) {
  event.preventDefault();
  if (!currentTrivia) return;
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
      setStatus(`${data.message} Puntaje: ${data.attempt?.score || 0}/${data.attempt?.total_questions || 0}.`, "error");
      return;
    }

    setStatus(data.message, "success");
    triviaForm.classList.add("hidden");
    ticketResult.dataset.tone = "success";
    ticketResult.innerHTML = `
      <strong>Ticket generado</strong>
      <span>Puntaje: ${escapeHtml(data.attempt.score)}/${escapeHtml(data.attempt.total_questions)}</span>
      <img src="${escapeHtml(data.qr_image_data_url)}" alt="Ticket QR">
      <a href="${escapeHtml(data.validator_url)}" target="_blank" rel="noopener">Abrir ticket</a>
    `;
    ticketResult.classList.remove("hidden");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Enviar respuestas";
  }
}

triviaForm.addEventListener("submit", submitTrivia);
loadTrivia();
