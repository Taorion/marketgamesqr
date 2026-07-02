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
const finalTicketBlock = document.getElementById("finalTicketBlock");
const finalTicketQrImage = document.getElementById("finalTicketQrImage");
const finalTicketLink = document.getElementById("finalTicketLink");
const downloadTicketImageButton = document.getElementById("downloadTicketImageButton");
const shareTicketImageButton = document.getElementById("shareTicketImageButton");

let currentTicketImageDataUrl = "";
let currentTicketFilename = "ticket-qr.png";
let currentTicketShareText = "Presenta esta imagen QR para reclamar el beneficio.";

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

function safeFilenamePart(value, fallback = "ticket") {
  return String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
}

function extensionForDataUrl(dataUrl) {
  const header = String(dataUrl || "").slice(0, 80).toLowerCase();
  if (header.includes("image/svg+xml")) return "svg";
  if (header.includes("image/jpeg")) return "jpg";
  if (header.includes("image/webp")) return "webp";
  return "png";
}

function dataUrlToBlob(dataUrl) {
  const value = String(dataUrl || "");
  const commaIndex = value.indexOf(",");
  if (!value.startsWith("data:") || commaIndex < 0) {
    throw new Error("La imagen del ticket no esta disponible para descargar.");
  }
  const header = value.slice(5, commaIndex);
  const body = value.slice(commaIndex + 1);
  const headerParts = header.split(";").filter(Boolean);
  const mimeType = headerParts[0] || "application/octet-stream";
  const isBase64 = headerParts.some((part) => part.toLowerCase() === "base64");
  if (isBase64) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  }
  return new Blob([decodeURIComponent(body)], { type: mimeType });
}

function loadImageDataUrl(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo preparar la imagen del ticket."));
    image.src = src;
  });
}

async function convertSvgDataUrlToPngBlob(dataUrl) {
  const image = await loadImageDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image?.naturalWidth || image?.width || 1080;
  canvas.height = image?.naturalHeight || image?.height || 1350;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("No se pudo convertir el ticket a PNG."));
      }
    }, "image/png", 0.96);
  });
}

async function ticketBlobForBrowser(dataUrl) {
  const value = String(dataUrl || "");
  if (value.startsWith("data:image/svg+xml")) {
    try {
      return {
        blob: await convertSvgDataUrlToPngBlob(value),
        filename: currentTicketFilename.replace(/\.[^.]+$/, "") + ".png",
      };
    } catch (error) {
      console.warn("No se pudo convertir SVG a PNG; se usara la imagen original.", error);
    }
  }
  return {
    blob: dataUrlToBlob(value),
    filename: currentTicketFilename,
  };
}

function triggerBlobDownload(filename, blob) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
}

async function downloadDataUrl() {
  const { blob, filename } = await ticketBlobForBrowser(currentTicketImageDataUrl);
  triggerBlobDownload(filename, blob);
}

async function shareTicketImage() {
  const { blob, filename } = await ticketBlobForBrowser(currentTicketImageDataUrl);
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Ticket QR",
      text: currentTicketShareText,
      files: [file],
    });
    return;
  }
  triggerBlobDownload(filename, blob);
  resultBlock.classList.remove("hidden");
  resultBlock.textContent = "Tu navegador no permite compartir archivos directamente. Se descargo la imagen para adjuntarla en WhatsApp.";
}

function setDownloadState(data) {
  currentTicketImageDataUrl = data?.final_ticket?.qr_image_data_url || "";
  const business = safeFilenamePart(data?.business?.name, "negocio");
  const benefit = safeFilenamePart(data?.benefit?.value?.label || data?.benefit?.type, "beneficio");
  const code = safeFilenamePart(data?.final_ticket?.id || token, "ticket").slice(0, 12);
  currentTicketFilename = `${business}-${benefit}-${code}.${extensionForDataUrl(currentTicketImageDataUrl)}`;
  currentTicketShareText = `Ticket para reclamar ${data?.benefit?.value?.label || data?.benefit?.type || "un beneficio"}. Presenta esta imagen QR en el punto autorizado.`;
  if (downloadTicketImageButton) {
    downloadTicketImageButton.disabled = !currentTicketImageDataUrl;
  }
  if (shareTicketImageButton) {
    shareTicketImageButton.disabled = !currentTicketImageDataUrl;
  }
}

function renderStatus(data) {
  claimMessage.textContent = data.message || "Estado actualizado.";
  businessName.textContent = data.business?.name || "-";
  qrType.textContent = data.qr_code?.origin_type || "-";
  benefitSummary.textContent = data.benefit?.value?.label || data.benefit?.type || "Beneficio";
  expiresAt.textContent = formatDate(data.qr_code?.expires_at);
  claimForm.classList.toggle("hidden", !data.allowed);
  const hasFinalTicket = Boolean(data.final_ticket?.qr_image_data_url && data.final_ticket?.validator_url);
  resultBlock.classList.toggle("hidden", data.allowed || hasFinalTicket);
  finalTicketBlock.classList.toggle("hidden", !hasFinalTicket);
  if (hasFinalTicket) {
    finalTicketQrImage.src = data.final_ticket.qr_image_data_url;
    finalTicketLink.textContent = "Presenta este QR para reclamar el beneficio";
    setDownloadState(data);
    resultBlock.textContent = "";
  } else {
    setDownloadState(null);
    finalTicketQrImage.removeAttribute("src");
    finalTicketLink.textContent = "";
  }
  if (!data.allowed && !hasFinalTicket) {
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

downloadTicketImageButton?.addEventListener("click", async () => {
  try {
    await downloadDataUrl();
  } catch (error) {
    resultBlock.classList.remove("hidden");
    resultBlock.textContent = error.message;
  }
});

shareTicketImageButton?.addEventListener("click", async () => {
  try {
    await shareTicketImage();
  } catch (error) {
    if (error?.name === "AbortError") return;
    resultBlock.classList.remove("hidden");
    resultBlock.textContent = error.message;
  }
});

loadClaim();
