const token = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");

const claimMessage = document.getElementById("claimMessage");
const claimForm = document.getElementById("claimForm");
const resultBlock = document.getElementById("resultBlock");
const businessName = document.getElementById("businessName");
const qrType = document.getElementById("qrType");
const benefitSummary = document.getElementById("benefitSummary");
const expiresAt = document.getElementById("expiresAt");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const emailInput = document.getElementById("emailInput");
const documentInput = document.getElementById("documentInput");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "No fue posible procesar la solicitud.");
  }
  return data;
}

function formatDate(value) {
  if (!value) {
    return "Sin expiracion";
  }
  return new Date(value).toLocaleString("es-CO");
}

function renderStatus(data) {
  claimMessage.textContent = data.message || "Estado actualizado.";
  businessName.textContent = data.business?.name || "-";
  qrType.textContent = data.qr_code?.origin_type || "-";
  benefitSummary.textContent = data.benefit?.value?.label || data.benefit?.type || "Beneficio";
  expiresAt.textContent = formatDate(data.qr_code?.expires_at);
  claimForm.classList.toggle("hidden", !data.allowed);
  resultBlock.classList.toggle("hidden", data.allowed);
  if (!data.allowed) {
    resultBlock.textContent = data.message || "Este QR no puede activarse.";
  }
}

async function loadClaim() {
  try {
    const data = await api(`/api/public/claim/${encodeURIComponent(token)}`);
    renderStatus(data);
  } catch (error) {
    claimMessage.textContent = error.message;
    resultBlock.classList.remove("hidden");
    resultBlock.textContent = error.message;
  }
}

claimForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  claimMessage.textContent = "Activando beneficio...";
  try {
    const data = await api(`/api/public/qr/claim/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim() || null,
        email: emailInput.value.trim() || null,
        document_id: documentInput.value.trim() || null,
        source: "public-claim-page",
      }),
    });
    renderStatus(data);
  } catch (error) {
    resultBlock.classList.remove("hidden");
    resultBlock.textContent = error.message;
    claimMessage.textContent = error.message;
  }
});

loadClaim();
