const API_BASE = window.location.origin;
const SESSION_KEY = "universal_qr_validator_session_v1";
const PORTAL_SESSION_KEY = "qr_business_portal_session_v1";

const feedbackToast = document.getElementById("feedbackToast");
const feedbackIcon = document.getElementById("feedbackIcon");
const feedbackTitle = document.getElementById("feedbackTitle");
const feedbackMessage = document.getElementById("feedbackMessage");
const screenFeedback = document.getElementById("screenFeedback");
const screenFeedbackIcon = document.getElementById("screenFeedbackIcon");
const screenFeedbackTitle = document.getElementById("screenFeedbackTitle");
const screenFeedbackMessage = document.getElementById("screenFeedbackMessage");
const loginPanel = document.getElementById("loginPanel");
const workspace = document.getElementById("workspace");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginStatus = document.getElementById("loginStatus");
const userTitle = document.getElementById("userTitle");
const userScope = document.getElementById("userScope");
const trafficCard = document.getElementById("trafficCard");
const trafficBalanceValue = document.getElementById("trafficBalanceValue");
const trafficBalanceCopy = document.getElementById("trafficBalanceCopy");
const trafficStatusValue = document.getElementById("trafficStatusValue");
const postSaleGeneratorPanel = document.getElementById("postSaleGeneratorPanel");
const postSaleGeneratorForm = document.getElementById("postSaleGeneratorForm");
const postSaleCreditChip = document.getElementById("postSaleCreditChip");
const postSaleAmountInput = document.getElementById("postSaleAmountInput");
const postSaleProductInput = document.getElementById("postSaleProductInput");
const postSaleCustomerInput = document.getElementById("postSaleCustomerInput");
const postSaleDocumentInput = document.getElementById("postSaleDocumentInput");
const postSalePhoneInput = document.getElementById("postSalePhoneInput");
const postSaleEmailInput = document.getElementById("postSaleEmailInput");
const postSaleBenefitLabelInput = document.getElementById("postSaleBenefitLabelInput");
const postSaleBenefitTypeInput = document.getElementById("postSaleBenefitTypeInput");
const postSaleExpiresModeInput = document.getElementById("postSaleExpiresModeInput");
const postSaleNotesInput = document.getElementById("postSaleNotesInput");
const postSaleGenerateButton = document.getElementById("postSaleGenerateButton");
const postSaleQrResult = document.getElementById("postSaleQrResult");
const postSaleQrStatus = document.getElementById("postSaleQrStatus");
const logoutButton = document.getElementById("logoutButton");
const startScannerButton = document.getElementById("startScannerButton");
const stopScannerButton = document.getElementById("stopScannerButton");
const cameraStatus = document.getElementById("cameraStatus");
const scannerHint = document.getElementById("scannerHint");
const scannerVideo = document.getElementById("scannerVideo");
const qrTokenInput = document.getElementById("qrTokenInput");
const validateManualButton = document.getElementById("validateManualButton");
const resultPanel = document.getElementById("resultPanel");
const resultHeroIcon = document.getElementById("resultHeroIcon");
const resultHeroTitle = document.getElementById("resultHeroTitle");
const resultHeroCopy = document.getElementById("resultHeroCopy");
const resultTitle = document.getElementById("resultTitle");
const resultChip = document.getElementById("resultChip");
const resultMessage = document.getElementById("resultMessage");
const businessValue = document.getElementById("businessValue");
const gameValue = document.getElementById("gameValue");
const originTypeValue = document.getElementById("originTypeValue");
const campaignValue = document.getElementById("campaignValue");
const rewardValue = document.getElementById("rewardValue");
const playerValue = document.getElementById("playerValue");
const documentValue = document.getElementById("documentValue");
const contactValue = document.getElementById("contactValue");
const expiresValue = document.getElementById("expiresValue");
const saleValue = document.getElementById("saleValue");
const batchValue = document.getElementById("batchValue");
const redeemButton = document.getElementById("redeemButton");
const salePanel = document.getElementById("salePanel");
const saleForm = document.getElementById("saleForm");
const hadSaleInput = document.getElementById("hadSaleInput");
const saleAmountInput = document.getElementById("saleAmountInput");
const paymentMethodInput = document.getElementById("paymentMethodInput");
const productServiceInput = document.getElementById("productServiceInput");
const saleNotesInput = document.getElementById("saleNotesInput");
const saleStatus = document.getElementById("saleStatus");
const refreshHistoryButton = document.getElementById("refreshHistoryButton");
const historyList = document.getElementById("historyList");
const qrRechargePanel = document.getElementById("qrRechargePanel");
const validatorQrRechargeForm = document.getElementById("validatorQrRechargeForm");
const validatorQrRechargeStatus = document.getElementById("validatorQrRechargeStatus");
const validatorQrPackageSelect = document.getElementById("validatorQrPackageSelect");
const validatorQrRechargeButton = document.getElementById("validatorQrRechargeButton");
const validatorQrRechargeMessage = document.getElementById("validatorQrRechargeMessage");

let toastTimer = 0;

const feedbackIcons = {
  neutral: "i",
  loading: "...",
  ok: "OK",
  danger: "!",
};

const state = {
  session: loadSession(),
  detector: null,
  stream: null,
  scanLoopHandle: 0,
  scanning: false,
  scannerMode: "none",
  scanCanvas: document.createElement("canvas"),
  scanContext: null,
  lastToken: "",
  lastValidation: null,
  lastRedemption: null,
  lastScanValue: "",
  lastScanAt: 0,
  creditAccount: null,
  lastGeneratedPostSaleQr: null,
  qrPackageOffers: [],
  qrCreditOrders: [],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  state.session = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function savePortalSession(session) {
  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PORTAL_SESSION_KEY);
}

function loginRedirectForSession(session) {
  const plan = session?.user?.subscription?.plan || {};
  const features = plan.features || {};
  if (features.portal_access && plan.category === "subscription") {
    return "/empresa/";
  }
  return "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.session.token}`,
  };
}

function setBusy(isBusy) {
  document.body.classList.toggle("is-busy", isBusy);
  validateManualButton.disabled = isBusy;
  startScannerButton.disabled = isBusy;
  postSaleGenerateButton.disabled = isBusy;
  validatorQrRechargeButton.disabled = isBusy;
  redeemButton.disabled = isBusy || !state.lastValidation?.allowed;
}

function showToast(mode, title, message, timeout = 3600) {
  window.clearTimeout(toastTimer);
  feedbackToast.className = `feedback-toast ${mode}`;
  feedbackIcon.textContent = feedbackIcons[mode] || "i";
  feedbackTitle.textContent = title;
  feedbackMessage.textContent = message;
  feedbackToast.classList.remove("hidden");

  if (timeout) {
    toastTimer = window.setTimeout(() => {
      feedbackToast.classList.add("hidden");
    }, timeout);
  }
}

function showScreenFeedback(mode, title, message) {
  screenFeedback.className = `screen-feedback ${mode}`;
  screenFeedbackIcon.textContent = feedbackIcons[mode] || "...";
  screenFeedbackTitle.textContent = title;
  screenFeedbackMessage.textContent = message;
  screenFeedback.classList.remove("hidden");
}

function hideScreenFeedback() {
  screenFeedback.classList.add("hidden");
}

function focusResultPanel() {
  if (!workspace.classList.contains("hidden")) {
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => resultPanel.focus({ preventScroll: true }), 260);
  }
}

function flashResultPanel() {
  resultPanel.classList.remove("result-panel-flash");
  void resultPanel.offsetWidth;
  resultPanel.classList.add("result-panel-flash");
}

function setResultPanelMode(mode) {
  resultPanel.classList.remove(
    "result-panel-neutral",
    "result-panel-loading",
    "result-panel-ok",
    "result-panel-danger"
  );
  resultPanel.classList.add(`result-panel-${mode}`);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "No se pudo completar la operacion.");
  }
  return data;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-CO");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function renderTrafficBalance(account) {
  state.creditAccount = account;
  trafficCard.classList.remove("warning", "danger");
  if (!account) {
    trafficBalanceValue.textContent = "Sin saldo configurado";
    trafficBalanceCopy.textContent = "Operacion legacy. Consulta con el administrador si necesitas control de trafico.";
    trafficStatusValue.textContent = "Legacy";
    renderPostSaleCreditChip();
    renderQrRechargeShop();
    return;
  }

  trafficBalanceValue.textContent = `${formatNumber(account.qr_balance)} creditos`;
  trafficBalanceCopy.textContent = `${formatNumber(account.qr_used_total)} consumidos de ${formatNumber(account.qr_purchased_total)} disponibles contratados.`;
  trafficStatusValue.textContent = account.exhausted ? "Agotado" : account.low_balance ? "Bajo" : "Activo";
  if (account.exhausted) {
    trafficCard.classList.add("danger");
  } else if (account.low_balance) {
    trafficCard.classList.add("warning");
  }
  renderPostSaleCreditChip();
  renderQrRechargeShop();
}

function canGeneratePostSaleQr() {
  const user = state.session?.user;
  return Boolean(
    user?.business_id &&
    ["BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(user.role)
  );
}

function renderPostSaleAccess() {
  postSaleGeneratorPanel.classList.toggle("hidden", !canGeneratePostSaleQr());
}

function renderPostSaleCreditChip() {
  const account = state.creditAccount;
  postSaleCreditChip.className = "result-chip neutral";
  if (!account) {
    postSaleCreditChip.textContent = "Credito legacy";
    return;
  }
  if (account.exhausted) {
    postSaleCreditChip.className = "result-chip danger";
    postSaleCreditChip.textContent = "Sin creditos";
    return;
  }
  if (account.low_balance) {
    postSaleCreditChip.className = "result-chip loading";
    postSaleCreditChip.textContent = `${formatNumber(account.qr_balance)} creditos`;
    return;
  }
  postSaleCreditChip.className = "result-chip ok";
  postSaleCreditChip.textContent = `${formatNumber(account.qr_balance)} creditos`;
}

function renderQrRechargeShop() {
  const packages = state.qrPackageOffers || [];
  validatorQrPackageSelect.innerHTML = packages.map((offer) => `
    <option value="${escapeHtml(offer.code)}">
      ${escapeHtml(offer.title)} - ${formatNumber(offer.package_size)} QR - ${formatCurrency(offer.price_cop)}
    </option>
  `).join("");

  const account = state.creditAccount;
  validatorQrRechargeStatus.className = "result-chip neutral";
  validatorQrRechargeStatus.textContent = "Mercado Pago";

  if (!packages.length) {
    validatorQrRechargeButton.disabled = true;
    validatorQrRechargeMessage.textContent = "No hay paquetes cargados. Actualiza la pagina o intenta mas tarde.";
    return;
  }

  validatorQrRechargeButton.disabled = false;
  if (account) {
    validatorQrRechargeMessage.textContent = `Saldo actual: ${formatNumber(account.qr_balance)} creditos. La recarga se activa cuando Mercado Pago confirme el pago.`;
  } else {
    validatorQrRechargeMessage.textContent = "El pago confirmado crea o incrementa la cartera QR de este negocio.";
  }

  const latestOrder = state.qrCreditOrders[0];
  if (latestOrder?.status === "approved") {
    validatorQrRechargeStatus.className = "result-chip ok";
    validatorQrRechargeStatus.textContent = "Ultimo pago aprobado";
  } else if (latestOrder?.status === "pending") {
    validatorQrRechargeStatus.className = "result-chip loading";
    validatorQrRechargeStatus.textContent = "Pago pendiente";
  }
}

async function loadQrRechargeData() {
  if (!state.session?.token) {
    return;
  }
  try {
    const [packageData, orderData] = await Promise.all([
      api("/api/public/packages", { method: "GET" }),
      api("/api/payments/qr-credits/orders", {
        method: "GET",
        headers: authHeaders(),
      }),
    ]);
    state.qrPackageOffers = packageData.packages || [];
    state.qrCreditOrders = orderData.orders || [];
    renderQrRechargeShop();
  } catch (error) {
    validatorQrRechargeStatus.className = "result-chip danger";
    validatorQrRechargeStatus.textContent = "Error";
    validatorQrRechargeMessage.textContent = error.message;
  }
}

async function loadTrafficBalance() {
  if (!state.session?.token) {
    renderTrafficBalance(null);
    return;
  }
  try {
    const data = await api("/api/qr/credits/me", {
      method: "GET",
      headers: authHeaders(),
    });
    renderTrafficBalance(data.credit_account);
  } catch (error) {
    trafficBalanceValue.textContent = "No disponible";
    trafficBalanceCopy.textContent = error.message;
    trafficStatusValue.textContent = "Error";
    trafficCard.classList.add("danger");
  }
}

async function submitQrRecharge(event) {
  event.preventDefault();
  const packageCode = validatorQrPackageSelect.value;
  if (!packageCode) {
    validatorQrRechargeMessage.textContent = "Selecciona un paquete QR para continuar.";
    showToast("danger", "Paquete requerido", "Selecciona un paquete antes de pagar.");
    return;
  }

  setBusy(true);
  validatorQrRechargeMessage.textContent = "Creando checkout seguro en Mercado Pago...";
  showToast("loading", "Preparando pago", "Creando checkout seguro de recarga QR.", 0);
  showScreenFeedback("loading", "Preparando pago", "Te enviaremos a Mercado Pago para finalizar la compra.");
  try {
    const data = await api("/api/payments/qr-credits/checkout", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ package_code: packageCode }),
    });
    state.qrCreditOrders = [data.order, ...state.qrCreditOrders.filter((order) => order.id !== data.order.id)];
    renderQrRechargeShop();
    validatorQrRechargeMessage.textContent = "Checkout creado. Redirigiendo a Mercado Pago...";
    showToast("ok", "Checkout creado", "Abriendo Mercado Pago para completar la recarga.", 0);
    window.location.assign(data.order.checkout_url);
  } catch (error) {
    validatorQrRechargeMessage.textContent = error.message;
    showToast("danger", "No se pudo crear pago", error.message);
  } finally {
    setBusy(false);
    hideScreenFeedback();
  }
}

function setResult(mode, title, message, data = null) {
  setResultPanelMode(mode);
  resultTitle.textContent = title;
  resultMessage.textContent = message;
  resultChip.className = `result-chip ${mode}`;
  resultChip.textContent = mode === "ok"
    ? "Valido"
    : mode === "danger"
      ? "Rechazado"
      : mode === "loading"
        ? "Consultando"
        : "Pendiente";
  resultHeroIcon.textContent = feedbackIcons[mode] || "?";
  resultHeroTitle.textContent = mode === "ok"
    ? "QR aprobado"
    : mode === "danger"
      ? "QR rechazado"
      : mode === "loading"
        ? "Validando QR"
        : "Pendiente";
  resultHeroCopy.textContent = message;

  businessValue.textContent = data?.business?.name || "-";
  gameValue.textContent = data?.game?.name || "-";
  originTypeValue.textContent = data?.qr_code?.origin_type || "-";
  campaignValue.textContent = data?.campaign?.name || "-";
  rewardValue.textContent = data?.reward?.display || data?.reward?.name || "-";
  playerValue.textContent = data?.player?.name || "-";
  documentValue.textContent = data?.player?.document_id || "-";
  contactValue.textContent = [data?.player?.email, data?.player?.phone].filter(Boolean).join(" | ") || "-";
  expiresValue.textContent = formatDate(data?.qr_code?.expires_at);
  saleValue.textContent = data?.sale?.id ? `${data.sale.currency || "COP"} ${Number(data.sale.amount || 0).toLocaleString("es-CO")} ${data.sale.product_name ? `| ${data.sale.product_name}` : ""}` : "-";
  batchValue.textContent = data?.batch?.name || "-";
  redeemButton.disabled = !data?.allowed;
  if (!data?.allowed) {
    salePanel.classList.add("hidden");
  }
  flashResultPanel();
}

function extractToken(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    return url.searchParams.get("token") || url.pathname.split("/").filter(Boolean).pop() || value;
  } catch {
    return value;
  }
}

async function login(event) {
  event.preventDefault();
  loginStatus.textContent = "Validando credenciales...";
  showToast("loading", "Iniciando sesion", "Validando credenciales del operador.", 0);
  showScreenFeedback("loading", "Entrando", "Cargando sesion del validador.");
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
      }),
    });
    saveSession(data);
    const redirectTo = loginRedirectForSession(data);
    if (redirectTo) {
      savePortalSession(data);
      loginStatus.textContent = "Plan mensual detectado. Abriendo portal dashboard...";
      showToast("ok", "Abriendo portal", "Tu plan incluye dashboard; te llevamos al portal empresarial.", 0);
      window.location.assign(redirectTo);
      return;
    }
    loginStatus.textContent = "";
    showToast("ok", "Sesion activa", "Listo para escanear o pegar un QR.");
    renderSession();
  } catch (error) {
    loginStatus.textContent = error.message;
    showToast("danger", "No se pudo entrar", error.message);
  } finally {
    hideScreenFeedback();
  }
}

function renderSession() {
  const hasSession = Boolean(state.session?.token);
  loginPanel.classList.toggle("hidden", hasSession);
  workspace.classList.toggle("hidden", !hasSession);

  if (!hasSession) {
    return;
  }

  const redirectTo = loginRedirectForSession(state.session);
  if (redirectTo) {
    savePortalSession(state.session);
    window.location.assign(redirectTo);
    return;
  }

  userTitle.textContent = state.session.user.full_name || state.session.user.email;
  userScope.textContent = state.session.user.role === "ADMIN"
    ? "Admin general: puede ver todos los negocios"
    : `Rol: ${state.session.user.role}`;
  renderPostSaleAccess();
  setResult("neutral", "Sin validacion", "Escanea o pega un QR para consultar la base de datos.");
  renderQrRechargeShop();
  loadTrafficBalance();
  loadQrRechargeData();
  loadHistory();
}

function logout() {
  stopScanner();
  clearSession();
  renderSession();
}

async function validateToken(rawValue) {
  const token = extractToken(rawValue);
  if (!token) {
    setResult("danger", "QR vacio", "Pega un token o URL valido.");
    showToast("danger", "QR vacio", "Pega o escanea un token valido antes de validar.");
    focusResultPanel();
    return;
  }

  state.lastToken = token;
  setBusy(true);
  setResult("loading", "Consultando", "Validando token contra la base de datos...");
  showToast("loading", "Validando QR", "Consultando estado, negocio y beneficio.", 0);
  showScreenFeedback("loading", "Validando QR", "Espera mientras se consulta la base de datos.");
  focusResultPanel();

  try {
    const data = await api(`/api/qr/validate/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: authHeaders(),
    });
    state.lastValidation = data;
    if (data.allowed) {
      setResult("ok", "QR valido", data.message, data);
      showToast("ok", "QR valido", "El beneficio puede redimirse una sola vez.");
    } else {
      setResult("danger", data.status || "QR rechazado", data.message, data);
      showToast("danger", "QR rechazado", data.message || "Este QR no puede redimirse.");
    }
    loadTrafficBalance();
  } catch (error) {
    state.lastValidation = null;
    setResult("danger", "Validacion fallida", error.message);
    showToast("danger", "Validacion fallida", error.message);
  } finally {
    setBusy(false);
    hideScreenFeedback();
    focusResultPanel();
  }
}

function resetPostSaleFormAfterSuccess() {
  postSaleAmountInput.value = "";
  postSaleProductInput.value = "";
  postSaleCustomerInput.value = "";
  postSaleDocumentInput.value = "";
  postSalePhoneInput.value = "";
  postSaleEmailInput.value = "";
  postSaleNotesInput.value = "";
  postSaleBenefitLabelInput.value = "Beneficio postventa";
  postSaleBenefitTypeInput.value = "PERCENT_DISCOUNT";
  postSaleExpiresModeInput.value = "NONE";
}

function normalizePhoneForWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  return digits;
}

function buildPostSaleShareMessage(data, validatorUrl) {
  const benefitLabel = data.benefit?.label || "tu beneficio postventa";
  const businessName = data.business?.name || "nuestro punto de venta";
  return `Hola. Gracias por tu compra en ${businessName}. Aqui tienes ${benefitLabel}.`;
}

async function dataUrlToFile(dataUrl, filename) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

function renderGeneratedPostSaleQr(data) {
  const qrId = data.qr_code?.id || "";
  const validatorUrl = data.validator_url || data.qr_content || "";
  const phone = normalizePhoneForWhatsApp(data.sale?.customer_phone || postSalePhoneInput.value);
  const shareMessage = buildPostSaleShareMessage(data, validatorUrl);
  const whatsappUrl = phone
    ? `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(`${shareMessage} ${validatorUrl}`)}`
    : "";
  const shareButton = whatsappUrl
    ? `<button class="primary-button compact" type="button" data-share-generated-qr>Enviar QR al celular</button>`
    : "";
  state.lastGeneratedPostSaleQr = {
    qrId,
    phone,
    validatorUrl,
    whatsappUrl,
    message: shareMessage,
    imageDataUrl: data.qr_image_data_url || "",
  };
  postSaleQrResult.classList.remove("hidden");
  postSaleQrResult.innerHTML = `
    <div class="generated-qr">
      <img src="${escapeHtml(data.qr_image_data_url || "")}" alt="QR postventa generado">
      <div>
        <span class="label">QR listo</span>
        <strong>${escapeHtml(data.benefit?.label || "Beneficio postventa")}</strong>
        <p>${escapeHtml(validatorUrl)}</p>
        <div class="actions-inline">
          <a class="secondary-button compact" href="${escapeHtml(data.qr_image_data_url || "#")}" download="post-sale-${escapeHtml(qrId)}.png">Descargar</a>
          ${shareButton}
          <button class="primary-button compact" type="button" data-validate-generated="${escapeHtml(validatorUrl)}">Validar ahora</button>
        </div>
        ${phone ? `<small class="share-target">Destino: WhatsApp +${escapeHtml(phone)}</small>` : `<small class="share-target">Agrega telefono del cliente para enviarlo por WhatsApp.</small>`}
      </div>
    </div>
  `;
}

async function shareGeneratedPostSaleQr() {
  const qr = state.lastGeneratedPostSaleQr;
  if (!qr?.imageDataUrl) {
    showToast("danger", "QR no disponible", "Genera un QR postventa antes de compartirlo.");
    return;
  }

  try {
    const file = await dataUrlToFile(qr.imageDataUrl, `post-sale-${qr.qrId || "qr"}.png`);
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "QR postventa",
        text: qr.message,
        files: [file],
      });
      showToast("ok", "QR compartido", "Selecciona WhatsApp y el contacto del cliente si el sistema lo solicita.");
      return;
    }
  } catch (error) {
    console.warn(error);
  }

  if (qr.whatsappUrl) {
    window.open(qr.whatsappUrl, "_blank", "noopener");
    showToast("loading", "WhatsApp abierto", "Tu navegador no permite adjuntar el PNG automaticamente; descarga el QR y adjuntalo en el chat.");
    return;
  }

  showToast("danger", "Telefono requerido", "Agrega el celular del cliente para abrir WhatsApp.");
}

async function submitPostSaleQr(event) {
  event.preventDefault();
  if (!canGeneratePostSaleQr()) {
    postSaleQrStatus.textContent = "Tu usuario no tiene permisos para generar QR postventa.";
    showToast("danger", "Permiso requerido", postSaleQrStatus.textContent);
    return;
  }

  const saleAmount = Number(postSaleAmountInput.value || 0);
  if (saleAmount < 0) {
    postSaleQrStatus.textContent = "El valor de venta no puede ser negativo.";
    showToast("danger", "Valor invalido", postSaleQrStatus.textContent);
    postSaleAmountInput.focus();
    return;
  }

  setBusy(true);
  postSaleQrStatus.textContent = "Generando QR postventa...";
  showToast("loading", "Generando QR", "Se consumira 1 credito de trafico si el negocio tiene cartera activa.", 0);
  showScreenFeedback("loading", "Generando QR", "Creando token, venta y beneficio postventa.");

  const productName = postSaleProductInput.value.trim();
  const benefitLabel = postSaleBenefitLabelInput.value.trim();

  try {
    const data = await api("/api/business/qr/post-sale", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        sale_amount: saleAmount,
        currency: "COP",
        customer_name: postSaleCustomerInput.value.trim() || null,
        document_id: postSaleDocumentInput.value.trim() || null,
        customer_phone: postSalePhoneInput.value.trim() || null,
        customer_email: postSaleEmailInput.value.trim() || null,
        product_name: productName || null,
        notes: postSaleNotesInput.value.trim() || null,
        expires_mode: postSaleExpiresModeInput.value,
        benefit: {
          benefit_type: postSaleBenefitTypeInput.value,
          benefit_label: benefitLabel || "Beneficio postventa",
          benefit_value: {
            label: benefitLabel || "Beneficio postventa",
            sale_amount: saleAmount,
            product_name: productName || null,
          },
        },
      }),
    });
    renderGeneratedPostSaleQr(data);
    if (data.credit_account) {
      renderTrafficBalance(data.credit_account);
    }
    resetPostSaleFormAfterSuccess();
    postSaleQrStatus.textContent = "QR postventa generado y credito descontado.";
    showToast("ok", "QR generado", "El QR quedo listo para enviar o validar.");
    await loadTrafficBalance();
  } catch (error) {
    postSaleQrStatus.textContent = error.message;
    showToast("danger", "No se pudo generar", error.message);
  } finally {
    setBusy(false);
    hideScreenFeedback();
  }
}

async function redeemCurrentToken() {
  if (!state.lastToken || !state.lastValidation?.allowed) {
    return;
  }

  redeemButton.disabled = true;
  redeemButton.textContent = "Redimiendo...";
  setBusy(true);
  showToast("loading", "Redimiendo QR", "Registrando uso del beneficio.", 0);
  showScreenFeedback("loading", "Redimiendo", "Bloqueando el QR para evitar doble uso.");
  let redemptionSucceeded = false;
  try {
    const data = await api(`/api/qr/redeem/${encodeURIComponent(state.lastToken)}`, {
      method: "POST",
      headers: authHeaders(),
    });
    state.lastRedemption = data.redemption;
    state.lastValidation = {
      ...state.lastValidation,
      allowed: false,
    };
    setResult("ok", "Redencion completada", data.message, {
      ...state.lastValidation,
      allowed: false,
    });
    redemptionSucceeded = true;
    showToast("ok", "Redencion completada", data.message || "El QR quedo usado correctamente.");
    saleStatus.textContent = "";
    saleAmountInput.value = "";
    paymentMethodInput.value = "";
    productServiceInput.value = "";
    saleNotesInput.value = "";
    hadSaleInput.checked = true;
    syncSaleFields();
    salePanel.classList.remove("hidden");
    salePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    await loadTrafficBalance();
    await loadHistory();
  } catch (error) {
    setResult("danger", "No se pudo redimir", error.message, state.lastValidation);
    showToast("danger", "No se pudo redimir", error.message);
  } finally {
    setBusy(false);
    hideScreenFeedback();
    redeemButton.textContent = "Redimir beneficio";
    if (!redemptionSucceeded) {
      focusResultPanel();
    }
  }
}

async function saveAttributedSale(event) {
  event.preventDefault();
  if (!state.lastRedemption?.id) {
    saleStatus.textContent = "Primero redime un QR.";
    showToast("danger", "Falta redencion", "Primero redime un QR antes de guardar venta.");
    return;
  }

  const hadSale = hadSaleInput.checked;
  const saleAmount = Number(saleAmountInput.value || 0);
  if (hadSale && saleAmount <= 0) {
    saleStatus.textContent = "Ingresa un valor pagado mayor a 0 o desmarca Hubo venta.";
    showToast("danger", "Valor de venta requerido", saleStatus.textContent);
    saleAmountInput.focus();
    return;
  }

  try {
    showToast("loading", "Guardando venta", "Registrando venta atribuida.", 0);
    const data = await api(`/api/redemptions/${state.lastRedemption.id}/attributed-sale`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        had_sale: hadSale,
        sale_amount: hadSale ? saleAmount : 0,
        currency: "COP",
        payment_method: hadSale ? paymentMethodInput.value.trim() || null : null,
        product_or_service: hadSale ? productServiceInput.value.trim() || null : null,
        notes: saleNotesInput.value.trim() || null,
      }),
    });
    saleStatus.textContent = data.sale ? "Venta atribuida guardada." : "Redencion registrada sin venta.";
    showToast("ok", "Venta guardada", saleStatus.textContent);
  } catch (error) {
    saleStatus.textContent = error.message;
    showToast("danger", "No se pudo guardar", error.message);
  }
}

function syncSaleFields() {
  const hadSale = hadSaleInput.checked;
  saleAmountInput.required = hadSale;
  saleAmountInput.disabled = !hadSale;
  paymentMethodInput.disabled = !hadSale;
  productServiceInput.disabled = !hadSale;
  if (!hadSale) {
    saleAmountInput.value = "";
    paymentMethodInput.value = "";
    productServiceInput.value = "";
    saleStatus.textContent = "Se guardara la redencion sin venta atribuida.";
  } else if (saleStatus.textContent === "Se guardara la redencion sin venta atribuida.") {
    saleStatus.textContent = "";
  }
}

async function loadHistory() {
  const businessId = state.session?.user?.business_id;
  if (!businessId || state.session.user.role === "ADMIN") {
    historyList.innerHTML = '<p class="empty-state">Selecciona un negocio desde endpoints administrativos para ver historial especifico.</p>';
    return;
  }

  try {
    const data = await api(`/api/businesses/${businessId}/redemptions`, {
      method: "GET",
      headers: authHeaders(),
    });
    renderHistory(data.redemptions || []);
  } catch (error) {
    historyList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function renderHistory(redemptions) {
  if (!redemptions.length) {
    historyList.innerHTML = '<p class="empty-state">Todavia no hay redenciones registradas.</p>';
    return;
  }

  const today = new Date().toDateString();
  const todaysRedemptions = redemptions.filter((item) => new Date(item.redeemed_at).toDateString() === today);
  const rows = (todaysRedemptions.length ? todaysRedemptions : redemptions.slice(0, 10)).map((item) => `
    <article class="history-entry">
      <strong>${escapeHtml(item.reward_name || "Beneficio")}</strong>
      <span>${escapeHtml(item.player_name || item.player_email || "Jugador sin nombre")}</span>
      <span>${formatDate(item.redeemed_at)} por ${escapeHtml(item.redeemed_by || "usuario")}</span>
    </article>
  `);
  historyList.innerHTML = rows.join("");
}

function canUseBarcodeDetector() {
  return "BarcodeDetector" in window;
}

function canUseJsQr() {
  return typeof window.jsQR === "function";
}

function canUseCameraScanner() {
  return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia) && (canUseBarcodeDetector() || canUseJsQr());
}

function stopScanner() {
  state.scanning = false;
  if (state.scanLoopHandle) {
    cancelAnimationFrame(state.scanLoopHandle);
    state.scanLoopHandle = 0;
  }
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  scannerVideo.srcObject = null;
  state.scannerMode = "none";
  cameraStatus.textContent = "Camara detenida";
  scannerHint.textContent = "Camara detenida. Puedes activarla de nuevo o usar ingreso manual.";
}

async function scanFrame() {
  if (!state.scanning) {
    return;
  }

  try {
    if (scannerVideo.readyState >= 2) {
      let rawValue = "";

      if (state.scannerMode === "barcode-detector" && state.detector) {
        const barcodes = await state.detector.detect(scannerVideo);
        rawValue = barcodes[0]?.rawValue || "";
      } else if (state.scannerMode === "jsqr" && state.scanContext) {
        const width = scannerVideo.videoWidth || 0;
        const height = scannerVideo.videoHeight || 0;
        if (width && height) {
          state.scanCanvas.width = width;
          state.scanCanvas.height = height;
          state.scanContext.drawImage(scannerVideo, 0, 0, width, height);
          const frame = state.scanContext.getImageData(0, 0, width, height);
          const code = window.jsQR(frame.data, width, height, {
            inversionAttempts: "dontInvert",
          });
          rawValue = code?.data || "";
        }
      }

      const now = Date.now();
      if (rawValue && (rawValue !== state.lastScanValue || now - state.lastScanAt > 3000)) {
        state.lastScanValue = rawValue;
        state.lastScanAt = now;
        qrTokenInput.value = rawValue;
        showToast("loading", "QR detectado", "Codigo leido por camara. Validando ahora.", 1800);
        await validateToken(rawValue);
        stopScanner();
      }
    }
  } catch (error) {
    console.warn(error);
  }

  state.scanLoopHandle = requestAnimationFrame(scanFrame);
}

async function startScanner() {
  if (!window.isSecureContext) {
    cameraStatus.textContent = "Origen inseguro";
    scannerHint.textContent = "La cámara solo funciona en HTTPS o localhost. En este celular abre la versión segura o usa el ingreso manual.";
    showToast("danger", "Camara no disponible", "Abre el sitio en HTTPS o localhost, o usa ingreso manual.");
    return;
  }

  if (!canUseCameraScanner()) {
    cameraStatus.textContent = "Sin soporte";
    scannerHint.textContent = "La cámara no está disponible en este navegador. Abre la versión segura o pega el token manualmente.";
    showToast("danger", "Escaneo no soportado", "Este navegador no permite lectura por camara. Usa ingreso manual.");
    return;
  }

  try {
    showToast("loading", "Activando camara", "Solicitando permisos y preparando lectura QR.", 0);
    showScreenFeedback("loading", "Activando camara", "Acepta el permiso de camara si el navegador lo solicita.");
    stopScanner();
    state.scanContext = state.scanCanvas.getContext("2d", { willReadFrequently: true });
    if (canUseBarcodeDetector()) {
      state.detector = new BarcodeDetector({ formats: ["qr_code"] });
      state.scannerMode = "barcode-detector";
    } else {
      state.detector = null;
      state.scannerMode = "jsqr";
    }
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    scannerVideo.srcObject = state.stream;
    await scannerVideo.play();
    state.scanning = true;
    cameraStatus.textContent = state.scannerMode === "jsqr" ? "Escaneando en modo compatible" : "Escaneando";
    scannerHint.textContent = state.scannerMode === "jsqr"
      ? "Usando camara del PC en modo compatible. Acerca el QR y mantenlo quieto."
      : "Apunta la camara al QR.";
    hideScreenFeedback();
    showToast("ok", "Camara activa", "Apunta al QR hasta que el sistema lo detecte.");
    state.scanLoopHandle = requestAnimationFrame(scanFrame);
  } catch (error) {
    cameraStatus.textContent = "Camara bloqueada";
    scannerHint.textContent = "Revisa permisos de camara o usa ingreso manual.";
    hideScreenFeedback();
    showToast("danger", "Camara bloqueada", "Revisa permisos del navegador o usa ingreso manual.");
  }
}

loginForm.addEventListener("submit", login);
postSaleGeneratorForm.addEventListener("submit", submitPostSaleQr);
validatorQrRechargeForm.addEventListener("submit", submitQrRecharge);
postSaleQrResult.addEventListener("click", (event) => {
  const shareButton = event.target.closest("[data-share-generated-qr]");
  if (shareButton) {
    shareGeneratedPostSaleQr();
    return;
  }
  const button = event.target.closest("[data-validate-generated]");
  if (!button) {
    return;
  }
  validateToken(button.dataset.validateGenerated);
});
logoutButton.addEventListener("click", logout);
startScannerButton.addEventListener("click", startScanner);
stopScannerButton.addEventListener("click", stopScanner);
validateManualButton.addEventListener("click", () => validateToken(qrTokenInput.value));
redeemButton.addEventListener("click", redeemCurrentToken);
saleForm.addEventListener("submit", saveAttributedSale);
hadSaleInput.addEventListener("change", syncSaleFields);
refreshHistoryButton.addEventListener("click", loadHistory);
window.addEventListener("beforeunload", stopScanner);

const initialToken = new URLSearchParams(window.location.search).get("token");
renderSession();
if (initialToken) {
  qrTokenInput.value = initialToken;
  if (state.session?.token) {
    validateToken(initialToken);
  }
}

if (!canUseCameraScanner()) {
  cameraStatus.textContent = window.isSecureContext ? "Escaneo no soportado" : "Origen inseguro";
  scannerHint.textContent = window.isSecureContext
    ? "Usa el campo manual en este navegador."
    : "La cámara solo funciona en HTTPS o localhost. Abre la versión segura o usa el campo manual.";
  } else if (!canUseBarcodeDetector() && canUseJsQr()) {
    cameraStatus.textContent = "Modo compatible";
    scannerHint.textContent = "Tu navegador no tiene BarcodeDetector, pero sí puede usar la cámara cuando el sitio se abre en HTTPS o localhost.";
  }

syncSaleFields();
