const preferenceForm = document.getElementById("preferenceForm");
const formError = document.getElementById("formError");
const submitButton = document.getElementById("submitButton");
const qrResult = document.getElementById("qrResult");
const qrImage = document.getElementById("qrImage");
const qrCopy = document.getElementById("qrCopy");
const validatorLink = document.getElementById("validatorLink");
const documentId = document.getElementById("documentId");
const phone = document.getElementById("phone");

function value(id) {
  return document.getElementById(id).value.trim();
}

async function submitPreferences(event) {
  event.preventDefault();
  formError.classList.add("hidden");
  submitButton.disabled = true;
  submitButton.textContent = "Generando QR...";

  try {
    const response = await fetch("/api/public/product-preferences/qr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: value("firstName"),
        lastName: value("lastName"),
        documentId: value("documentId"),
        email: value("email"),
        phone: value("phone"),
        favoriteProduct: value("favoriteProduct"),
        purchaseWindow: value("purchaseWindow"),
        giftBudget: value("giftBudget"),
        preferredChannel: value("preferredChannel"),
        purchaseIntent: value("purchaseIntent"),
        stylePreference: value("stylePreference"),
        usageContext: value("usageContext"),
        preferredContactTime: value("preferredContactTime"),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || "No se pudo generar el QR.");
    }

    qrImage.src = data.qr_image_data_url;
    validatorLink.href = data.validator_url;
    qrCopy.textContent = `QR asociado a cedula ${value("documentId")} y telefono ${value("phone")}. Bono valido por 30000 COP en compras desde 50000 COP.`;
    preferenceForm.classList.add("hidden");
    qrResult.classList.remove("hidden");
  } catch (error) {
    formError.textContent = error.message;
    formError.classList.remove("hidden");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Recibir bono QR";
  }
}

documentId.addEventListener("input", () => {
  documentId.value = documentId.value.replace(/\D/g, "").slice(0, 12);
});

phone.addEventListener("input", () => {
  phone.value = phone.value.replace(/\D/g, "").slice(0, 15);
});

preferenceForm.addEventListener("submit", submitPreferences);
