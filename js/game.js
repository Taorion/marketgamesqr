const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const powerIndicator = document.getElementById("powerIndicator");
const powerValue = document.getElementById("powerValue");
const statusText = document.getElementById("statusText");
const startOverlay = document.getElementById("startOverlay");
const resultOverlay = document.getElementById("resultOverlay");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const playButton = document.getElementById("playButton");
const restartButton = document.getElementById("restartButton");
const tapButton = document.getElementById("tapButton");
const rewardFlow = document.getElementById("rewardFlow");
const rewardForm = document.getElementById("rewardForm");
const rewardSubmit = document.getElementById("rewardSubmit");
const customerName = document.getElementById("customerName");
const customerLastName = document.getElementById("customerLastName");
const customerId = document.getElementById("customerId");
const customerEmail = document.getElementById("customerEmail");
const customerPhone = document.getElementById("customerPhone");
const formError = document.getElementById("formError");
const qrResult = document.getElementById("qrResult");
const qrImage = document.getElementById("qrImage");
const promoCodeText = document.getElementById("promoCodeText");
const downloadPromoButton = document.getElementById("downloadPromoButton");
const downloadFeedback = document.getElementById("downloadFeedback");
const promoCanvas = document.getElementById("promoCanvas");
const promoCtx = promoCanvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const WORLD = {
  width: 1280,
  height: 720,
  waterline: 590,
  gravity: 1040,
};

// Assets reales detectados en la carpeta img.
// Si alguno falta, se dibuja un placeholder y en consola queda indicado cual reemplazar.
const assetFiles = {
  background: "img/BackgroundGame.png", // Fondo/escenografia.
  logo: "img/logo.png", // Logo de marca Pescuezo.
  bike: "img/MainCharacteMoto.png", // Moto principal del jugador.
  track: "img/pista.png", // Pista horizontal inicial.
  ramp: "img/rampa.png", // Rampa de salida.
  platform: "img/PlataformaAterrizaje.png", // Plataforma flotante.
};

const layout = {
  track: { x: 58, y: 440, width: 420, height: 102, surfaceY: 466 },
  ramp: {
    x: 462,
    y: 324,
    width: 226,
    height: 204,
    startX: 472,
    endX: 644,
    startY: 466,
    endY: 403,
  },
  platform: { x: 1072, y: 246, width: 240, height: 110, topY: 276 },
};

const bike = {
  x: 154,
  y: layout.track.surfaceY,
  prevX: 154,
  prevY: layout.track.surfaceY,
  width: 154,
  height: 94,
  angle: 0,
  driveSpeed: 0,
  driveTargetSpeed: 0,
  driveAcceleration: 0,
  vx: 0,
  vy: 0,
};

const game = {
  phase: "menu",
  elapsed: 0,
  power: 0.5,
  powerDirection: 1,
  powerSpeed: 1.35,
  lockedPower: 0.5,
  lockedPercent: 50,
  flashTimer: 0,
};

const PROMO = {
  discount: 15,
  prefix: "MOTO15",
};
const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : window.location.origin;

const BIKE_REGION = { sx: 35, sy: 110, sw: 3270, sh: 1780 };
const WIN_POWER_MIN = 60;
const WIN_POWER_MAX = 65;
const PROMO_FILE_NAME = "promo-pescuezo-15.png";
let promoDownloadUrl = "";

const sprites = {};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function setStatus(message) {
  statusText.textContent = message;
}

function setPowerUI(value) {
  const percent = Math.round(value * 100);
  powerIndicator.style.left = `${percent}%`;
  powerValue.textContent = `${percent}%`;
}

function setTapButtonState(enabled, label = tapButton.textContent) {
  tapButton.textContent = label;
  tapButton.classList.toggle("disabled", !enabled);
  tapButton.disabled = !enabled;
}

function showResult(win) {
  resultKicker.textContent = win ? "Aterrizaje limpio" : "Caida";
  resultTitle.textContent = win ? "Ganaste" : "Perdiste";
  resultText.textContent = win
    ? `Clavaste el salto con ${game.lockedPercent}% de impulso. Completa tus datos para recibir el QR con 15% de descuento.`
    : `Con ${game.lockedPercent}% no lograste un aterrizaje valido.`;
  rewardFlow.classList.toggle("hidden", !win);
  restartButton.textContent = win ? "Volver a jugar" : "Reintentar";
  resultOverlay.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function hideResult() {
  resultOverlay.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function resetRewardFlow() {
  rewardForm.reset();
  formError.textContent = "Revisa el formato de nombre, apellidos, cedula, correo y telefono.";
  formError.classList.add("hidden");
  qrResult.classList.add("hidden");
  rewardForm.classList.remove("hidden");
  rewardFlow.classList.add("hidden");
  qrImage.removeAttribute("src");
  promoCodeText.textContent = `Codigo: ${PROMO.prefix}`;
  downloadPromoButton.classList.add("hidden");
  downloadFeedback.textContent = "Imagen lista para guardar.";
  downloadFeedback.classList.add("hidden");
  promoDownloadUrl = "";
}

function buildPromoCode(name) {
  const cleanName = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${PROMO.prefix}-${cleanName}-${randomSuffix}`;
}

function buildPromoPayload(customer, code) {
  return [
    "Pescuezo Promo 15%",
    `Codigo: ${code}`,
    `Nombre: ${customer.name} ${customer.lastName}`,
    `Cedula: ${customer.idNumber}`,
    `Email: ${customer.email}`,
    `Telefono: ${customer.phone}`,
    "Presenta este QR para aplicar 15% de descuento en tu compra.",
  ].join(" | ");
}

async function requestBackendQr(customer) {
  const response = await fetch(`${API_BASE}/api/public/moto-pescuezo/qr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: customer.name,
      lastName: customer.lastName,
      documentId: customer.idNumber,
      email: customer.email,
      phone: customer.phone,
      lockedPercent: game.lockedPercent,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "No fue posible generar el QR en el servidor.");
  }

  return data;
}

function isValidRewardForm() {
  const name = customerName.value.trim();
  const lastName = customerLastName.value.trim();
  const idNumber = customerId.value.trim();
  const email = customerEmail.value.trim();
  const phone = customerPhone.value.trim();
  const personNameOk = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,}$/.test(name);
  const lastNameOk = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,}$/.test(lastName);
  const idOk = /^[0-9]{6,12}$/.test(idNumber);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = /^[0-9]{7,15}$/.test(phone);
  const latinNamePattern = /^[A-Za-z\u00C0-\u017F\s'-]{2,}$/u;
  return latinNamePattern.test(name) && latinNamePattern.test(lastName) && idOk && emailOk && phoneOk;
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && index > 0) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    context.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function drawRoundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawPromoBackground(customerNameValue, promoCode, qrSource) {
  const width = promoCanvas.width;
  const height = promoCanvas.height;

  promoCtx.clearRect(0, 0, width, height);
  promoCtx.fillStyle = "#081b32";
  promoCtx.fillRect(0, 0, width, height);

  const topGradient = promoCtx.createLinearGradient(0, 0, 0, 520);
  topGradient.addColorStop(0, "#0d9df2");
  topGradient.addColorStop(1, "#0b315d");
  promoCtx.fillStyle = topGradient;
  promoCtx.fillRect(0, 0, width, 520);

  if (sprites.background && sprites.background.ready) {
    promoCtx.save();
    promoCtx.globalAlpha = 0.24;
    promoCtx.drawImage(sprites.background.image, 0, 0, width, 520);
    promoCtx.restore();
  }

  promoCtx.fillStyle = "rgba(255,255,255,0.09)";
  promoCtx.beginPath();
  promoCtx.arc(920, 160, 180, 0, Math.PI * 2);
  promoCtx.fill();

  promoCtx.fillStyle = "#ffffff";
  promoCtx.font = "700 58px Segoe UI";
  promoCtx.fillText("PESCUEZO", 84, 110);
  promoCtx.font = "800 92px Segoe UI";
  promoCtx.fillText(`${PROMO.discount}% OFF`, 84, 215);

  if (sprites.logo && sprites.logo.ready) {
    promoCtx.drawImage(sprites.logo.image, 78, 44, 118, 118);
  }

  promoCtx.fillStyle = "rgba(255,255,255,0.88)";
  promoCtx.font = "600 34px Segoe UI";
  wrapText(
    promoCtx,
    "Promocion especial por aterrizar en MotoPescuezo",
    84,
    280,
    620,
    42
  );

  promoCtx.fillStyle = "#ffd35e";
  promoCtx.fillRect(84, 344, 280, 12);

  if (sprites.bike && sprites.bike.ready) {
    promoCtx.save();
    promoCtx.translate(820, 252);
    promoCtx.rotate(-0.12);
    promoCtx.drawImage(
      sprites.bike.image,
      BIKE_REGION.sx,
      BIKE_REGION.sy,
      BIKE_REGION.sw,
      BIKE_REGION.sh,
      -250,
      -145,
      500,
      290
    );
    promoCtx.restore();
  }

  promoCtx.fillStyle = "#ffffff";
  drawRoundedRectPath(promoCtx, 60, 430, width - 120, 1040, 42);
  promoCtx.fill();

  promoCtx.fillStyle = "#102541";
  promoCtx.font = "700 46px Segoe UI";
  promoCtx.fillText("Escanea y reclama tu descuento", 108, 520);

  promoCtx.fillStyle = "#5e6f84";
  promoCtx.font = "600 30px Segoe UI";
  wrapText(
    promoCtx,
    "Presenta este codigo al momento de tu compra para recibir el beneficio promocional.",
    108,
    570,
    width - 216,
    38
  );

  promoCtx.fillStyle = "#f3f7fb";
  drawRoundedRectPath(promoCtx, 140, 650, 800, 800, 36);
  promoCtx.fill();

  promoCtx.drawImage(qrSource, 200, 710, 680, 680);

  promoCtx.fillStyle = "#102541";
  promoCtx.font = "800 40px Segoe UI";
  promoCtx.fillText(`Codigo: ${promoCode}`, 108, 1532);

  promoCtx.fillStyle = "#5e6f84";
  promoCtx.font = "600 28px Segoe UI";
  wrapText(
    promoCtx,
    `Cliente: ${customerNameValue}`,
    108,
    1580,
    width - 216,
    36
  );
}

function renderPromoCard(customer, promoCode) {
  try {
    drawPromoBackground(`${customer.name} ${customer.lastName}`, promoCode, qrImage);
    promoDownloadUrl = promoCanvas.toDataURL("image/png");
    downloadPromoButton.classList.remove("hidden");
  } catch (error) {
    console.warn("No se pudo generar la imagen promocional descargable.", error);
    downloadPromoButton.classList.add("hidden");
    promoDownloadUrl = "";
  }
}

function triggerFileDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function dataUrlToFile(dataUrl, fileName) {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mime });
}

function isProbablyMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

async function downloadPromoImage() {
  if (!promoDownloadUrl) {
    downloadFeedback.textContent = "La promo aun no esta lista. Genera el QR nuevamente.";
    downloadFeedback.classList.remove("hidden");
    return;
  }

  try {
    if (typeof File !== "undefined" && navigator.share && navigator.canShare) {
      const file = dataUrlToFile(promoDownloadUrl, PROMO_FILE_NAME);
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Promo Pescuezo 15%",
            text: "Guarda o comparte tu promocion de Pescuezo.",
          });
          downloadFeedback.textContent = "Promo lista. Puedes guardarla o compartirla desde tu dispositivo.";
          downloadFeedback.classList.remove("hidden");
          return;
        } catch (shareError) {
          // Si el usuario cancela compartir, seguimos al flujo de descarga directa.
          console.warn("Compartir nativo no disponible o fue cancelado.", shareError);
        }
      }
    }

    if (isProbablyMobileDevice()) {
      const openedWindow = window.open(promoDownloadUrl, "_blank", "noopener,noreferrer");
      if (openedWindow) {
        downloadFeedback.textContent = "Se abrio la imagen promo. Manten presionada la imagen para guardarla en tu dispositivo.";
        downloadFeedback.classList.remove("hidden");
        return;
      }
    }

    triggerFileDownload(promoDownloadUrl, PROMO_FILE_NAME);
    downloadFeedback.textContent = "La imagen promocional se descargo en tu dispositivo.";
    downloadFeedback.classList.remove("hidden");
  } catch (error) {
    console.warn("No fue posible descargar la imagen promocional.", error);
    downloadFeedback.textContent = "No se pudo guardar la imagen. Intenta nuevamente.";
    downloadFeedback.classList.remove("hidden");
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function waitForImageLoad(imageElement, source) {
  return new Promise((resolve, reject) => {
    imageElement.onload = () => resolve();
    imageElement.onerror = reject;
    imageElement.src = source;
  });
}

async function generatePromoQr(customer) {
  const result = await requestBackendQr(customer);
  const promoCode = result.qr_code?.id || buildPromoCode(customer.name);

  await waitForImageLoad(qrImage, result.qr_image_data_url);
  promoCodeText.textContent = `Cedula: ${customer.idNumber} | Telefono: ${customer.phone} | QR: ${promoCode}`;
  renderPromoCard(customer, promoCode);
}

function loadSprite(path) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        image,
        ready: true,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      console.warn(`Asset faltante o invalido: ${path}`);
      resolve({
        image: null,
        ready: false,
        width: 0,
        height: 0,
      });
    };

    image.src = path;
  });
}

async function loadAssets() {
  const entries = Object.entries(assetFiles);
  const loaded = await Promise.all(entries.map(([, path]) => loadSprite(path)));

  entries.forEach(([key, path], index) => {
    sprites[key] = loaded[index];
    sprites[key].path = path;
  });
}

function resetBike() {
  bike.x = 154;
  bike.y = layout.track.surfaceY;
  bike.prevX = bike.x;
  bike.prevY = bike.y;
  bike.angle = 0;
  bike.driveSpeed = 0;
  bike.driveTargetSpeed = 0;
  bike.driveAcceleration = 0;
  bike.vx = 0;
  bike.vy = 0;
}

function resetRound() {
  resetBike();
  game.phase = "aiming";
  game.elapsed = 0;
  game.power = 0.5;
  game.powerDirection = 1;
  game.lockedPower = 0.5;
  game.lockedPercent = 50;
  game.flashTimer = 0;
  setPowerUI(game.power);
  setStatus(`Toca en el momento correcto. La ventana fina esta entre ${WIN_POWER_MIN}% y ${WIN_POWER_MAX}%.`);
  setTapButtonState(true, "Tocar ahora");
  resetRewardFlow();
  hideResult();
}

function startGame() {
  startOverlay.classList.add("hidden");
  resetRound();
}

function restartGame() {
  resetRound();
}

function currentRampY(x) {
  const t = clamp((x - layout.ramp.startX) / (layout.ramp.endX - layout.ramp.startX), 0, 1);
  return lerp(layout.ramp.startY, layout.ramp.endY, t);
}

function triggerAction() {
  if (game.phase === "menu") {
    startGame();
    return;
  }

  if (game.phase === "aiming") {
    game.lockedPower = game.power;
    game.lockedPercent = Math.round(game.power * 100);
    bike.driveTargetSpeed = 190 + game.lockedPower * 560;
    bike.driveAcceleration = 520 + game.lockedPower * 1120;
    game.phase = "runup";
    setStatus(`Impulso fijado en ${game.lockedPercent}%. Todo el salto depende de ese timing.`);
    setTapButtonState(false, "Impulso fijado");
    return;
  }

  if (game.phase === "won" || game.phase === "lost") {
    restartGame();
  }
}

function updatePower(dt) {
  if (game.phase !== "menu" && game.phase !== "aiming") {
    return;
  }

  game.power += game.powerDirection * game.powerSpeed * dt;
  if (game.power >= 1) {
    game.power = 1;
    game.powerDirection = -1;
  } else if (game.power <= 0) {
    game.power = 0;
    game.powerDirection = 1;
  }

  setPowerUI(game.power);
}

function launchFromRamp() {
  const rampAngle = -0.46;
  const launchSpeed = bike.driveSpeed + 160 + game.lockedPower * 210;
  bike.vx = Math.cos(rampAngle) * launchSpeed;
  bike.vy = Math.sin(rampAngle) * launchSpeed - (100 + game.lockedPower * 140);
  bike.x = layout.ramp.endX;
  bike.y = layout.ramp.endY;
  bike.angle = -0.68;
  game.phase = "flight";
  setStatus(`Vuelo automatico con ${game.lockedPercent}% de fuerza. Ya no hay control.`);
}

function updateRunup(dt) {
  bike.driveSpeed = Math.min(bike.driveTargetSpeed, bike.driveSpeed + bike.driveAcceleration * dt);
  bike.x += bike.driveSpeed * dt;

  if (bike.x < layout.ramp.startX) {
    bike.y = layout.track.surfaceY;
    bike.angle = 0;
    return;
  }

  if (bike.x <= layout.ramp.endX) {
    bike.y = currentRampY(bike.x);
    bike.angle = -0.72;
    return;
  }

  launchFromRamp();
}

function landedOnPlatform() {
  const previousBottom = bike.prevY;
  const currentBottom = bike.y;
  const bikeLeft = bike.x - bike.width * 0.25;
  const bikeRight = bike.x + bike.width * 0.25;

  return (
    bike.vy > 0 &&
    previousBottom <= layout.platform.topY &&
    currentBottom >= layout.platform.topY &&
    bikeLeft >= layout.platform.x + 34 &&
    bikeRight <= layout.platform.x + layout.platform.width - 34
  );
}

function touchesPlatformUnsafe() {
  const bikeLeft = bike.x - bike.width * 0.36;
  const bikeRight = bike.x + bike.width * 0.36;
  const bikeTop = bike.y - bike.height * 0.84;
  const bikeBottom = bike.y;
  const platformBottom = layout.platform.y + layout.platform.height;

  return (
    bikeRight > layout.platform.x + 18 &&
    bikeLeft < layout.platform.x + layout.platform.width - 18 &&
    bikeBottom > layout.platform.topY + 10 &&
    bikeTop < platformBottom - 10
  );
}

function winRound() {
  game.phase = "won";
  bike.y = layout.platform.topY;
  bike.vx = 0;
  bike.vy = 0;
  bike.angle = 0;
  setStatus(`Aterrizaje valido con ${game.lockedPercent}% de impulso.`);
  showResult(true);
  setTapButtonState(true, "Reintentar");
}

function loseRound(reason) {
  game.phase = "lost";
  game.flashTimer = 0.5;
  setStatus(reason);
  showResult(false);
  setTapButtonState(true, "Reintentar");
}

function updateFlight(dt) {
  bike.vy += WORLD.gravity * dt;
  bike.x += bike.vx * dt;
  bike.y += bike.vy * dt;
  bike.angle = clamp(bike.angle + 1.45 * dt, -0.44, 0.72);

  if (landedOnPlatform()) {
    winRound();
    return;
  }

  if (touchesPlatformUnsafe()) {
    loseRound("Golpeaste la plataforma pero no aterrizaste dentro del area valida.");
    return;
  }

  if (bike.y >= WORLD.waterline + 16) {
    loseRound("La moto cayo al mar.");
    return;
  }

  if (bike.x > WORLD.width + 160 || bike.y > WORLD.height + 200) {
    loseRound("La moto cayo fuera de la plataforma.");
  }
}

function update(dt) {
  bike.prevX = bike.x;
  bike.prevY = bike.y;

  updatePower(dt);

  if (game.phase === "runup") {
    updateRunup(dt);
  } else if (game.phase === "flight") {
    updateFlight(dt);
  } else if (game.phase === "lost") {
    game.flashTimer = Math.max(0, game.flashTimer - dt);
  }
}

function drawSprite(sprite, x, y, width, height, fallbackColor) {
  if (sprite && sprite.ready) {
    ctx.drawImage(sprite.image, x, y, width, height);
    return;
  }

  ctx.fillStyle = fallbackColor;
  ctx.fillRect(x, y, width, height);
}

function drawSpriteRegion(sprite, source, destination, fallbackColor) {
  if (sprite && sprite.ready) {
    ctx.drawImage(
      sprite.image,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      destination.x,
      destination.y,
      destination.width,
      destination.height
    );
    return;
  }

  ctx.fillStyle = fallbackColor;
  ctx.fillRect(destination.x, destination.y, destination.width, destination.height);
}

function drawBackground() {
  // Asset real asignado: BackgroundGame.png
  if (sprites.background && sprites.background.ready) {
    ctx.drawImage(sprites.background.image, 0, 0, WORLD.width, WORLD.height);
  } else {
    ctx.fillStyle = "#4ea6ff";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  ctx.fillStyle = "rgba(0, 28, 58, 0.08)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  if (sprites.logo && sprites.logo.ready) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(sprites.logo.image, 1090, 24, 140, 140);
    ctx.restore();
  }
}

function drawWaterOverlay() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, WORLD.waterline - 16, WORLD.width, WORLD.height - WORLD.waterline + 20);
  ctx.clip();

  const waterGradient = ctx.createLinearGradient(0, WORLD.waterline - 10, 0, WORLD.height);
  waterGradient.addColorStop(0, "rgba(40, 170, 255, 0.18)");
  waterGradient.addColorStop(1, "rgba(2, 37, 104, 0.32)");
  ctx.fillStyle = waterGradient;
  ctx.fillRect(0, WORLD.waterline - 12, WORLD.width, WORLD.height - WORLD.waterline + 12);

  for (let i = 0; i < 5; i += 1) {
    const y = WORLD.waterline + 10 + i * 20;
    const amplitude = 5 + i * 1.6;
    const speed = game.elapsed * (1.9 + i * 0.22);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.36)" : "rgba(77, 217, 255, 0.26)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= WORLD.width; x += 14) {
      const waveY = y + Math.sin(x * 0.02 + speed) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, waveY);
      } else {
        ctx.lineTo(x, waveY);
      }
    }

    ctx.stroke();
  }

  ctx.restore();
}

function drawTrackAndRamp() {
  // Asset real asignado: pista.png
  drawSprite(sprites.track, layout.track.x, layout.track.y, layout.track.width, layout.track.height, "#3a4658");

  // Asset real asignado: rampa.png
  drawSprite(sprites.ramp, layout.ramp.x, layout.ramp.y, layout.ramp.width, layout.ramp.height, "#2563eb");
}

function drawPlatform() {
  // Asset real asignado: PlataformaAterrizaje.png
  drawSprite(
    sprites.platform,
    layout.platform.x,
    layout.platform.y,
    layout.platform.width,
    layout.platform.height,
    "#d4a63c"
  );

  if (game.phase === "aiming") {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.setLineDash([12, 8]);
    ctx.lineWidth = 3;
    ctx.strokeRect(layout.platform.x + 14, layout.platform.topY - 10, layout.platform.width - 28, 18);
    ctx.restore();
  }
}

function drawBike() {
  ctx.save();
  ctx.translate(bike.x, bike.y - bike.height / 2);
  ctx.rotate(bike.angle);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, bike.height * 0.46, bike.width * 0.28, bike.height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Asset real asignado: MainCharacteMoto.png
  drawSpriteRegion(
    sprites.bike,
    // Recorte fijo para usar la moto visible del PNG sin depender de getImageData en navegador local.
    BIKE_REGION,
    { x: -bike.width / 2, y: -bike.height / 2, width: bike.width, height: bike.height },
    "#ff6b00"
  );

  ctx.restore();
}

function drawDistanceGuides() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.setLineDash([8, 10]);

  ctx.beginPath();
  ctx.moveTo(layout.ramp.endX + 8, layout.platform.topY);
  ctx.lineTo(layout.platform.x, layout.platform.topY);
  ctx.stroke();

  ctx.restore();
}

function drawTrajectoryHint() {
  if (game.phase !== "aiming") {
    return;
  }

  const previewTargetSpeed = 190 + game.power * 560;
  const previewRampBoost = 160 + game.power * 210;
  const previewSpeed = previewTargetSpeed + previewRampBoost;
  const previewAngle = -0.46;
  const previewVx = Math.cos(previewAngle) * previewSpeed;
  const previewVy = Math.sin(previewAngle) * previewSpeed - (100 + game.power * 140);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();

  for (let step = 0; step < 24; step += 1) {
    const t = step * 0.06;
    const x = layout.ramp.endX + previewVx * t;
    const y = layout.ramp.endY + previewVy * t + 0.5 * WORLD.gravity * t * t;
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawHudText() {
  ctx.save();
  ctx.fillStyle = "rgba(7, 19, 34, 0.48)";
  ctx.fillRect(20, 20, 312, 92);

  ctx.fillStyle = "#f3f8ff";
  ctx.font = "700 22px Segoe UI";
  ctx.fillText("Toca en el momento correcto", 112, 52);

  ctx.fillStyle = "rgba(243, 248, 255, 0.8)";
  ctx.font = "600 18px Segoe UI";

  if (game.phase === "aiming") {
    ctx.fillText("Impulso actual", 112, 82);
  } else {
    ctx.fillText(`Impulso fijado ${game.lockedPercent}%`, 112, 82);
  }

  if (sprites.logo && sprites.logo.ready) {
    ctx.drawImage(sprites.logo.image, 34, 26, 62, 62);
  }

  ctx.restore();
}

function drawFlash() {
  if (game.flashTimer <= 0) {
    return;
  }

  ctx.fillStyle = `rgba(255, 106, 141, ${game.flashTimer * 0.22})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);

  drawBackground();
  drawDistanceGuides();
  drawTrajectoryHint();
  drawTrackAndRamp();
  drawPlatform();
  drawBike();
  drawWaterOverlay();
  drawHudText();
  drawFlash();
}

let previousTime = 0;

function gameLoop(timestamp) {
  if (!previousTime) {
    previousTime = timestamp;
  }

  const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
  previousTime = timestamp;
  game.elapsed += dt;

  if (game.phase !== "menu") {
    update(dt);
  } else {
    updatePower(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

function isInteractiveButton(target) {
  return Boolean(target.closest("button"));
}

function handlePrimaryAction(event) {
  if (!event) {
    return;
  }

  if (isInteractiveButton(event.target)) {
    return;
  }

  event.preventDefault();
  triggerAction();
}

playButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
tapButton.addEventListener("click", triggerAction);
canvas.addEventListener("pointerdown", handlePrimaryAction);
downloadPromoButton.addEventListener("click", downloadPromoImage);
rewardForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isValidRewardForm()) {
    formError.classList.remove("hidden");
    return;
  }

  formError.classList.add("hidden");

  const customer = {
    name: customerName.value.trim(),
    lastName: customerLastName.value.trim(),
    idNumber: customerId.value.trim(),
    email: customerEmail.value.trim(),
    phone: customerPhone.value.trim(),
  };

  try {
    rewardSubmit.disabled = true;
    rewardSubmit.textContent = "Generando QR...";
    await generatePromoQr(customer);
    rewardForm.classList.add("hidden");
    qrResult.classList.remove("hidden");
  } catch (error) {
    console.warn(error);
    formError.textContent = error.message || "No se pudo generar el QR. Verifica conexion e intenta de nuevo.";
    formError.classList.remove("hidden");
  } finally {
    rewardSubmit.disabled = false;
    rewardSubmit.textContent = "Recibir QR 15%";
  }
});

customerId.addEventListener("input", () => {
  customerId.value = customerId.value.replace(/\D/g, "").slice(0, 12);
});

customerPhone.addEventListener("input", () => {
  customerPhone.value = customerPhone.value.replace(/\D/g, "").slice(0, 15);
});

async function boot() {
  await loadAssets();
  setPowerUI(game.power);
  setStatus("Pulsa jugar y luego toca cuando quieras fijar la fuerza.");
  setTapButtonState(true, "Jugar");
  resetRewardFlow();
  render();
  requestAnimationFrame(gameLoop);
}

boot();
