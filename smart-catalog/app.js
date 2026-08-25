const state = {
  catalog: null,
  products: [],
  categories: [],
  selectedCategory: "all",
  selectedProduct: null,
};

const QORI_PUBLIC_PRIMARY = "#0759d6";
const LEGACY_GREEN_COLORS = new Set(["#0f7354", "#09725f", "#0d6b52", "#118568", "#16a34a", "#22c55e", "#059669", "#047857", "#065f46", "#064e3b", "#14b8a6", "#0f766e"]);

function publicBrandColor(value) {
  const color = String(value || "").trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) return QORI_PUBLIC_PRIMARY;
  return LEGACY_GREEN_COLORS.has(color) ? QORI_PUBLIC_PRIMARY : color;
}

const catalogLogo = document.getElementById("catalogLogo");
const catalogBrand = document.getElementById("catalogBrand");
const catalogTitle = document.getElementById("catalogTitle");
const catalogDescription = document.getElementById("catalogDescription");
const catalogHero = document.getElementById("catalogHero");
const catalogContactButton = document.getElementById("catalogContactButton");
const activationBenefit = document.getElementById("activationBenefit");
const categoryStrip = document.getElementById("categoryStrip");
const featuredSection = document.getElementById("featuredSection");
const featuredGrid = document.getElementById("featuredGrid");
const productGrid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");
const floatingWhatsappButton = document.getElementById("floatingWhatsappButton");
const intentModal = document.getElementById("intentModal");
const intentForm = document.getElementById("intentForm");
const intentCloseButton = document.getElementById("intentCloseButton");
const intentProductSummary = document.getElementById("intentProductSummary");
const intentNameInput = document.getElementById("intentNameInput");
const intentPhoneInput = document.getElementById("intentPhoneInput");
const intentEmailInput = document.getElementById("intentEmailInput");
const intentDocumentTypeInput = document.getElementById("intentDocumentTypeInput");
const intentDocumentInput = document.getElementById("intentDocumentInput");
const intentMessage = document.getElementById("intentMessage");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function catalogSlug() {
  return decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[1] || "");
}

function productSlug() {
  return decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[2] || "");
}

function queryString() {
  return window.location.search || "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "No se pudo cargar el catalogo.");
  }
  return data;
}

function money(value, currency = "COP") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency || "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function productInitials(product) {
  return String(product?.name || "MG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function productCard(product) {
  const tags = Array.isArray(product.tags) ? product.tags.slice(0, 3) : [];
  const promotion = product.active_promotion || null;
  const price = product.price ? `<strong class="product-price">${promotion && product.compare_at_price ? `<s>${escapeHtml(money(product.compare_at_price, product.currency))}</s> ` : ""}${escapeHtml(money(product.price, product.currency))}</strong>` : "";
  return `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}">
      <div class="product-image">
        ${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : `<span>${escapeHtml(productInitials(product))}</span>`}
      </div>
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.short_description || product.description || "Solicita informacion por WhatsApp.")}</p>
      </div>
      ${price}
      ${promotion ? `<span class="product-promotion-badge">${escapeHtml(promotion.label || "Promoción temporal")} · hasta ${escapeHtml(new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(promotion.ends_at)))}</span>` : ""}
      ${tags.length ? `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="product-actions">
        <button class="primary-button" type="button" data-order-product="${escapeHtml(product.id)}">${escapeHtml(product.cta_label || state.catalog?.default_cta_label || "Ordenar por WhatsApp")}</button>
        <button class="info-button" type="button" data-info-product="${escapeHtml(product.id)}">Saber mas</button>
      </div>
    </article>
  `;
}

function filteredProducts() {
  if (state.selectedCategory === "all") return state.products;
  return state.products.filter((product) => product.category === state.selectedCategory);
}

function renderCategories() {
  const categories = ["all", ...state.categories];
  categoryStrip.innerHTML = categories.map((category) => `
    <button class="${category === state.selectedCategory ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
      ${escapeHtml(category === "all" ? "Todo" : category)}
    </button>
  `).join("");
}

function renderProducts() {
  renderCategories();
  const products = filteredProducts();
  productGrid.innerHTML = products.map(productCard).join("");
  emptyState.classList.toggle("hidden", products.length > 0);
  const featured = state.products.filter((product) => product.is_featured).slice(0, 3);
  featuredSection.classList.toggle("hidden", featured.length === 0);
  featuredGrid.innerHTML = featured.map(productCard).join("");
}

function renderCatalog() {
  const catalog = state.catalog;
  document.title = `${catalog.title} | Catalogo Qori`;
  catalogTitle.textContent = catalog.title;
  catalogDescription.textContent = catalog.description || "Ordena o solicita informacion directamente por WhatsApp.";
  catalogBrand.textContent = catalog.brand_name || catalog.business_name || "Qori";
  if (catalog.brand_logo_url) catalogLogo.src = catalog.brand_logo_url;
  document.documentElement.style.setProperty("--green", publicBrandColor(catalog.theme_color));
  if (catalog.cover_image_url) {
    catalogHero.style.backgroundImage = `linear-gradient(90deg, rgba(255,254,250,0.96), rgba(255,254,250,0.72)), url("${catalog.cover_image_url}")`;
    catalogHero.style.backgroundSize = "cover";
    catalogHero.style.backgroundPosition = "center";
  }
  const activationCopy = catalog.metadata?.activation_copy || "";
  activationBenefit.classList.toggle("hidden", !activationCopy);
  if (activationCopy) {
    activationBenefit.innerHTML = `<strong>Beneficio conectado</strong><p>${escapeHtml(activationCopy)}</p>`;
  }
  renderProducts();
}

async function loadCatalog() {
  try {
    const slug = catalogSlug();
    if (!slug) throw new Error("Catalogo no encontrado.");
    const product = productSlug();
    const data = product
      ? await api(`/api/public/catalogs/${encodeURIComponent(slug)}/products/${encodeURIComponent(product)}${queryString()}`)
      : await api(`/api/public/catalogs/${encodeURIComponent(slug)}${queryString()}`);
    state.catalog = data.catalog;
    state.products = data.products || [];
    state.categories = data.categories || [];
    renderCatalog();
    if (data.product) {
      state.selectedProduct = data.product;
      openIntent(data.product);
    }
  } catch (error) {
    catalogTitle.textContent = "Catalogo no disponible";
    catalogDescription.textContent = error.message;
    productGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
  }
}

function openIntent(product = null) {
  state.selectedProduct = product || state.products[0] || null;
  intentProductSummary.textContent = state.selectedProduct
    ? `Prepararemos el mensaje para: ${state.selectedProduct.name}.`
    : "Prepararemos el mensaje para contactar al negocio.";
  intentMessage.textContent = "";
  intentModal.classList.remove("hidden");
  window.setTimeout(() => intentNameInput.focus(), 20);
}

function closeIntent() {
  intentModal.classList.add("hidden");
}

function trackingPayload() {
  const params = new URLSearchParams(window.location.search);
  const data = {};
  ["campaign_id", "activation_id", "qr_code_id", "source", "channel", "partner_id", "branch_id", "partner_name", "referral_source"].forEach((key) => {
    if (params.get(key)) data[key] = params.get(key);
  });
  return data;
}

async function submitIntent(event) {
  event.preventDefault();
  if (!state.catalog) return;
  const product = state.selectedProduct || state.products[0];
  if (!product) {
    intentMessage.textContent = "No hay producto disponible para ordenar.";
    return;
  }
  const payload = {
    customer_name: intentNameInput.value.trim(),
    customer_phone: intentPhoneInput.value.trim(),
    customer_email: intentEmailInput.value.trim() || null,
    customer_document_type: intentDocumentTypeInput.value,
    customer_document: intentDocumentInput.value.trim(),
    ...trackingPayload(),
  };
  try {
    intentMessage.textContent = "Registrando intencion comercial...";
    const result = await api(`/api/public/catalogs/${encodeURIComponent(state.catalog.slug)}/products/${encodeURIComponent(product.id)}/whatsapp-intent`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeIntent();
    window.location.href = result.whatsapp_url;
  } catch (error) {
    intentMessage.textContent = error.message;
  }
}

categoryStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.selectedCategory = button.dataset.category;
  renderProducts();
});

document.addEventListener("click", async (event) => {
  const orderButton = event.target.closest("[data-order-product]");
  if (orderButton) {
    const product = state.products.find((item) => item.id === orderButton.dataset.orderProduct);
    openIntent(product);
    return;
  }
  const infoButton = event.target.closest("[data-info-product]");
  if (infoButton) {
    const product = state.products.find((item) => item.id === infoButton.dataset.infoProduct);
    if (!product || !state.catalog) return;
    await api(`/api/public/catalogs/${encodeURIComponent(state.catalog.slug)}/events`, {
      method: "POST",
      body: JSON.stringify({ event_type: "info_click", product_id: product.id, ...trackingPayload() }),
    }).catch(() => {});
    window.history.replaceState({}, "", `/c/${encodeURIComponent(state.catalog.slug)}/${encodeURIComponent(product.slug)}${window.location.search}`);
    openIntent(product);
  }
});

catalogContactButton.addEventListener("click", () => openIntent(state.products[0] || null));
floatingWhatsappButton.addEventListener("click", () => openIntent(state.products[0] || null));
intentCloseButton.addEventListener("click", closeIntent);
intentModal.addEventListener("click", (event) => {
  if (event.target === intentModal) closeIntent();
});
intentForm.addEventListener("submit", submitIntent);

loadCatalog();
