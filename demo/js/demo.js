const generatorPanel = document.getElementById("generatorPanel");
const generatorTitle = document.getElementById("generatorTitle");
const leadForm = document.getElementById("leadForm");
const demoTypeInput = document.getElementById("demoTypeInput");
const firstNameInput = document.getElementById("firstNameInput");
const lastNameInput = document.getElementById("lastNameInput");
const documentInput = document.getElementById("documentInput");
const phoneInput = document.getElementById("phoneInput");
const emailInput = document.getElementById("emailInput");
const campaignInput = document.getElementById("campaignInput");
const qrOutput = document.getElementById("qrOutput");
const qrImage = document.getElementById("qrImage");
const qrStatus = document.getElementById("qrStatus");
const qrUrl = document.getElementById("qrUrl");
const openValidatorLink = document.getElementById("openValidatorLink");
const copyQrButton = document.getElementById("copyQrButton");

const labels = {
  "form-qr": "Formulario directo",
  "tiktok-drop": "TikTok / Reels",
  "instant-win": "Premio instantaneo",
  event: "Evento fisico",
};

let currentQrUrl = "";

function selectDemo(type) {
  demoTypeInput.value = type;
  generatorTitle.textContent = labels[type] || "Demo QR";
  campaignInput.value = labels[type] || "Demo comercial QR";
  qrOutput.classList.add("hidden");
  generatorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function generateQr(event) {
  event.preventDefault();
  const type = demoTypeInput.value || "form-qr";
  qrStatus.textContent = "Generando QR...";

  const response = await fetch(`/api/public/demo/${type}/qr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      documentId: documentInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      campaignLabel: campaignInput.value.trim(),
      source: type,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    qrOutput.classList.remove("hidden");
    qrStatus.textContent = data.error?.message || "No se pudo generar el QR.";
    qrUrl.textContent = "";
    return;
  }

  currentQrUrl = data.validator_url;
  qrImage.src = data.qr_image_data_url;
  qrStatus.textContent = `${data.campaign_label} listo`;
  qrUrl.textContent = data.validator_url;
  openValidatorLink.href = data.validator_url;
  qrOutput.classList.remove("hidden");
}

document.querySelectorAll("[data-demo-type]").forEach((button) => {
  button.addEventListener("click", () => selectDemo(button.dataset.demoType));
});

leadForm.addEventListener("submit", generateQr);
copyQrButton.addEventListener("click", async () => {
  if (!currentQrUrl) {
    return;
  }
  await navigator.clipboard.writeText(currentQrUrl);
  copyQrButton.textContent = "Copiado";
  setTimeout(() => {
    copyQrButton.textContent = "Copiar URL";
  }, 1400);
});

documentInput.addEventListener("input", () => {
  documentInput.value = documentInput.value.replace(/\D/g, "").slice(0, 12);
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 15);
});

selectDemo("form-qr");
